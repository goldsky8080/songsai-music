# Manual CAPTCHA Lock And Result Matching Plan

## 목적

`D:\wrapper` 의 manual CAPTCHA 생성 흐름은 현재 다음 문제가 있다.

- 동시에 두 명 이상이 요청하면 Chromium 창/세션/클릭 대상이 서로 꼬일 수 있다.
- `Create` 클릭 자체는 성공해도, wrapper 가 generate 요청이나 token 을 못 잡으면 우리 서비스 요청과 연결이 끊긴다.
- 수노에는 실제 곡이 생성됐지만, `D:\music` UI 에서는 실패처럼 보일 수 있다.

이 문서는 manual CAPTCHA 흐름을 **단일 작업 락 + 결과 매칭 fallback** 구조로 바꾸기 위한 체크리스트다.

---

## 목표

1. manual CAPTCHA 모드는 한 번에 하나의 요청만 처리한다.
2. 현재 진행 중인 요청을 식별 가능한 작업 객체로 관리한다.
3. `Create` 클릭 후 generate 요청 intercept 실패 시에도, 최근 생성곡을 다시 찾아 현재 요청에 연결한다.
4. 처리 종료 시 락이 반드시 풀리도록 한다.

---

## 현재 문제 요약

### 동시성 문제

- 하나의 Chromium 프로필을 공유한다.
- `xdotool` 클릭은 활성 창 기준이라 두 개 이상의 창이 있으면 오동작할 수 있다.
- 요청별 token / task 추적이 현재는 충분히 분리되어 있지 않다.

### 결과 회수 문제

- manual CAPTCHA 브라우저에서 `Create` 를 눌러도 generate 요청 intercept 가 항상 잡히지 않는다.
- 이 경우 수노 쪽 생성은 성공해도 우리 서비스는 `providerTaskId` 를 얻지 못한다.

---

## 설계 방향

### 1. 전역 manual CAPTCHA 락

manual CAPTCHA 모드 진입 전 다음을 확인한다.

- 현재 수동 CAPTCHA 작업이 이미 진행 중인지
- 진행 중이면 새 요청은 대기시키지 말고 명시적으로 거절할지

권장 동작:

- 이미 진행 중이면 `409` 또는 유사 의미의 에러 반환
- 사용자 메시지:
  - `현재 다른 사용자가 CAPTCHA 수동 생성을 진행 중입니다. 잠시 후 다시 시도해주세요.`

### 2. 작업 객체 도입

manual CAPTCHA 요청마다 작업 객체를 만든다.

권장 필드:

- `requestId`
- `userId`
- `startedAt`
- `expiresAt`
- `title`
- `prompt`
- `tags`
- `status`
- `windowId`
- `matchedClipId`
- `matchedProviderTaskId`
- `error`

권장 상태값:

- `WAITING_CAPTCHA`
- `BROWSER_OPENED`
- `CLICKED_CREATE`
- `MATCHING_RESULT`
- `COMPLETED`
- `FAILED`

### 3. 브라우저는 manual 모드에서 하나만

manual CAPTCHA 중에는 다음을 강하게 유지한다.

- Chromium 창 하나
- 활성 manual 작업 하나
- xdotool 클릭 대상 창 하나

즉 manual CAPTCHA 는 사실상 단일 슬롯이다.

### 4. 결과 회수 fallback

manual 모드의 핵심은 `Create` 클릭 후 결과 회수다.

기존 방식:

- generate 요청 intercept
- token 확보

이 방식이 실패할 수 있으므로 fallback 을 추가한다.

권장 흐름:

1. `Create` 클릭
2. `CLICKED_CREATE` 상태 저장
3. 5~15초 정도 최근 생성 결과 polling
4. 최근 생성곡 중 현재 요청과 가장 유사한 곡 매칭
5. `providerTaskId` / clip id 확보
6. 요청 성공 처리

---

## 최근 생성곡 매칭 기준

우선순위 높은 기준:

1. 제목 일치 또는 매우 높은 유사도
2. 가사 첫 줄 일부 일치
3. 스타일 태그 유사
4. 생성 시간이 현재 요청 시작 시점 이후인지
5. 가장 최근 생성된 항목인지

최초 구현은 너무 복잡하게 가지 말고 아래 정도로 시작한다.

- title exact match 우선
- 없으면 title includes / normalized match
- 없으면 prompt 일부 포함 여부
- 마지막으로 최근 생성 시간 기준

---

## 구현 단계 체크리스트

### A. 상태/락 구조

- [ ] `SunoApi.ts` 또는 wrapper 내부 상태 저장소에 manual CAPTCHA 전역 락 추가
- [ ] 현재 진행 중인 manual 작업 객체 타입 정의
- [ ] 락 획득/해제 유틸 함수 추가
- [ ] timeout/예외 발생 시 락이 반드시 해제되도록 `finally` 정리

### B. 요청 진입 제어

- [ ] manual CAPTCHA 필요 시 락 확인
- [ ] 이미 점유 중이면 명시적 에러 반환
- [ ] 새 작업 시작 시 `requestId` 생성
- [ ] `title/prompt/tags/userId` 스냅샷 저장

### C. 브라우저/클릭

- [ ] 현재 적용된 메인 `Create` 버튼 점수화 선택 유지
- [ ] 선택된 버튼 후보 정보 로그 유지
- [ ] 클릭 후 상태를 `CLICKED_CREATE` 로 전환

### D. 결과 회수 fallback

- [ ] generate intercept 실패 시 recent clips polling 로직 추가
- [ ] polling 제한 시간 설정
- [ ] 최근 생성 결과에서 현재 작업과 가장 유사한 항목 선택
- [ ] 선택된 clip/task 정보를 로그로 남기기
- [ ] 성공 시 wrapper 응답에 해당 결과 연결

### E. 오류 처리

- [ ] 결과 매칭 실패 시 명시적 에러 메시지 반환
- [ ] manual 작업 실패 상태 기록
- [ ] 락 해제

### F. 추후 개선

- [ ] 메모리 기반 락을 Redis/DB 기반 락으로 확장 검토
- [ ] 최근 생성 매칭 정확도 개선
- [ ] 운영에서 manual CAPTCHA 상태를 볼 수 있는 관리자 상태 표시 검토

---

## 구현 우선순위

### 1차

- 메모리 기반 락
- 작업 객체
- 동시 요청 차단

### 2차

- `Create` 클릭 후 recent clips polling
- 최근 생성곡 매칭으로 `providerTaskId` 회수

### 3차

- Redis/DB 기반 락
- 관리자 모니터링
- 더 정교한 유사도 매칭

---

## 권장 응답 정책

### 락 점유 중

- 상태: `409`
- 메시지:
  - `현재 다른 사용자가 CAPTCHA 수동 생성을 진행 중입니다. 잠시 후 다시 시도해주세요.`

### 클릭 후 결과 미회수

- 상태: 실패
- 메시지:
  - `수동 CAPTCHA 제출 후 생성 결과를 확인하지 못했습니다. 방금 수노에서 생성된 곡이 있는지 확인이 필요합니다.`

---

## 메모

- 이 구조의 핵심은 manual CAPTCHA 를 일반 자동 요청이 아니라 **단일 수동 처리 슬롯**으로 보는 것이다.
- 지금 상태에서 가장 먼저 해결해야 하는 건 클릭 방식 자체보다 **결과 회수와 동시성 제어**다.
