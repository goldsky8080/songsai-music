# Agent Start Here

이 문서는 새 세션의 에이전트가 가장 먼저 읽는 작업 시작 문서다.
앞으로 문서를 업데이트할 때, 사람이 보기 좋은 문서와 별개로 이 문서는 "빠르게 이어받기" 목적에 맞춘다.

## 먼저 읽을 순서

1. [`D:\music\docs\WORK_LOG.md`](D:\music\docs\WORK_LOG.md)
2. [`D:\music\docs\ECOSYSTEM_OVERVIEW.md`](D:\music\docs\ECOSYSTEM_OVERVIEW.md)
3. [`D:\music\docs\ARCHITECTURE.md`](D:\music\docs\ARCHITECTURE.md)
4. [`D:\music\docs\OPERATIONS.md`](D:\music\docs\OPERATIONS.md)
5. 필요하면 [`D:\music\docs\PROJECT_HISTORY.md`](D:\music\docs\PROJECT_HISTORY.md)

## 현재 시스템 요약

- `D:\music`: 메인 서비스
- `D:\songsai-bank-bridge`: 입금 자동화 보조 서비스
- `D:\wrapper\suno-api`: 외부 음악 생성 wrapper

## 현재 가장 중요한 사실

### 메인 앱

- Next.js 15 + React 19 + Prisma 기반
- 음악 생성, 크레딧, 입금 요청, 비디오 생성, 관리자 기능이 이미 들어가 있다
- 음악 결과물은 `MusicAsset` 으로 저장해 재사용하는 방향으로 정리돼 있다

### bank-bridge

- SMS webhook 수신, 파싱, 자동 매칭 후보 계산, 대시보드까지 구현돼 있다
- 최종 승인과 크레딧 지급은 메인 앱 담당이다

### wrapper

- 세션 / 쿠키 / CAPTCHA / 브라우저 자동화가 포함된 가장 민감한 계층이다
- 외부 생성이 흔들리면 메인 앱도 같이 영향을 받는다

## 세션 시작 체크리스트

새 세션에서 작업 전에 아래를 확인한다.

1. [`D:\music\docs\WORK_LOG.md`](D:\music\docs\WORK_LOG.md) 의 가장 최근 날짜 섹션
2. `git status` 로 현재 작업 트리 상태
3. 작업이 `music`, `songsai-bank-bridge`, `wrapper` 중 어디에 걸치는지
4. 문서보다 코드가 최신일 수 있으므로 핵심 파일 직접 확인

## 작업 후 업데이트 규칙

작업이 끝나면 아래를 반영한다.

1. 사용자가 마지막에 "오늘 한 거 요약해서 넣어줘"처럼 요청한 경우에만 `WORK_LOG.md` 갱신
2. 구조가 바뀌면 `ARCHITECTURE.md` 또는 `ECOSYSTEM_OVERVIEW.md` 갱신
3. 운영 관련 변경이면 `OPERATIONS.md` 갱신
4. 큰 방향 전환이면 `PROJECT_HISTORY.md` 에 압축 반영

중요:

- 기본값은 "`WORK_LOG.md` 자동 업데이트 안 함" 이다.
- 사용자가 마지막에 요약 반영을 요청할 때만 기록한다.
- 중간 대화나 개별 작업이 끝날 때마다 자동 누적하지 않는다.
- 새 세션에서도 이 규칙을 그대로 따른다.

## `WORK_LOG.md` 에 적을 형식

아래 형식을 유지한다.

### YYYY-MM-DD

- 오늘 한 일
- 현재 확인된 상태
- 남은 문제
- 다음에 바로 할 일
- 관련 핵심 파일

짧은 작업만 했더라도 최소 아래 3개는 적는다.

- 오늘 한 일
- 현재 확인된 상태
- 다음에 바로 할 일

## 현재 문서 운영 원칙

- 입구 문서는 적게 유지한다
- 과거 세션 handoff 문서는 새로 많이 만들지 않는다
- 이력은 `PROJECT_HISTORY.md` 로 압축한다
- 계속 이어지는 실무 메모는 `WORK_LOG.md` 에 누적한다
