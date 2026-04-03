# Product And Backlog

이 문서는 현재 서비스 기능과 남아 있는 작업을 한 곳에서 보기 위한 기준 문서다.

## 1. 현재 제공 기능

### 인증

- Google 로그인
- 관리자 권한 분기

### 크레딧

- 무료 / 유료 크레딧 분리
- 생성 비용 차감
- 무료 쿠폰
- 무통장 입금 요청 기반 충전 흐름

### 음악 생성

- 직접 입력
- AI 가사
- AI 자동 생성
- 모델 선택
- 보컬 선택
- MR 생성 모드

### 생성 결과

- 최근 생성 목록
- 듣기
- 다운로드
- 가사 txt 다운로드
- 숨은 추가곡 / 보너스곡 정책

### 비디오

- 커버 이미지 기반 비디오 생성 실험
- 브라우저 렌더 프로토타입 진행 중

### 관리자

- 사용자 조회
- 권한 변경
- 크레딧 지급
- 무료 쿠폰 발급

## 2. 현재 핵심 판단

### wrapper 안정화가 가장 중요

메인 앱만 고쳐서는 해결되지 않는 문제들이 있다.
특히 아래는 wrapper 의존이 크다.

- CAPTCHA
- AI 자동 생성
- 세션 유지
- 결과 회수

### `MusicAsset` 기반 정리는 맞는 방향

현재는 mp3 / 이미지 / 가사 타이밍을 자산으로 저장하고 재사용하는 기반이 들어갔다.
이 방향은 유지하는 것이 맞다.

### 비디오는 아직 실험 단계

브라우저 렌더가 들어갔지만,
진행률 / 자막 / 속도 / 품질 쪽은 더 검증이 필요하다.

## 3. 지금 우선순위 backlog

### P1. wrapper / 생성 안정화

- manual CAPTCHA 락 구조 실제 검증
- recent result matching 검증
- AI 가사 / AI 자동 생성 모드 입력 규칙 확인
- 운영 / 개발 wrapper 차이 정리

### P1. 음악 재생 / 다운로드 안정화

- 생성 직후 듣기 스트리밍 안정성 점검
- 불안정한 초반 mp3 URL 처리 정책 정리
- `MusicAsset` 우선 사용 흐름 유지

### P1. 비디오 생성 정리

- 브라우저 렌더 성능 확인
- 자막 타이밍 / 줄바꿈 / 스타일 튜닝
- 완료물 품질과 처리 시간 비교
- 서버 렌더와 브라우저 렌더의 최종 방향 결정

### P2. 관리자 / 운영 UX

- 관리자 페이지 검색 UX 개선
- 입금 요청 승인/반려 흐름 정리
- 크레딧 내역 정리

### P2. bank-bridge

- 실제 SMS 포워딩 앱과 연결 테스트
- 운영 공개 범위 결정
- 내부 API 인증 구조 정리

### P3. UI / 브랜딩

- 홈 히어로 2차 리디자인
- 최근 생성 음악 카드 리디자인
- 생성 폼 시각 언어 정리

## 4. 바로 다음 작업 후보

현재 상태에서 바로 이어가기 좋은 작업은 아래다.

1. wrapper manual CAPTCHA 실제 동작 검증
2. 생성 직후 듣기 스트리밍 안정화 정책 확정
3. 브라우저 비디오 렌더 속도/자막 검증
4. 문서 통합 계속 진행

## 5. 보류 중인 주제

- railway wrapper 재도입 여부
- worker/queue 기반 서버 비디오 렌더 재검토
- 완전한 자체 mp3 보관 정책
- MR 처리 비용/시간 정책

## 6. 참고 문서

- 시스템 전체: [SYSTEM_OVERVIEW.md](D:/music/docs/SYSTEM_OVERVIEW.md)
- wrapper 상세: [SUNO_WRAPPER_INTEGRATION.md](D:/music/docs/SUNO_WRAPPER_INTEGRATION.md)
- 비디오 상세: [VIDEO_RENDER_PLAN.md](D:/music/docs/VIDEO_RENDER_PLAN.md)
- 운영 상세: [DEPLOYMENT_AND_OPERATIONS.md](D:/music/docs/DEPLOYMENT_AND_OPERATIONS.md)

