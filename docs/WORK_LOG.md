# Work Log

이 문서는 앞으로 계속 누적하는 실무 작업 로그다.
과거 handoff 문서를 많이 만들기보다, 이 파일에 날짜별로 계속 이어 적는 것을 기본 원칙으로 한다.

## 운영 규칙

- 이 문서는 자동으로 매 대화마다 업데이트하지 않는다.
- 사용자가 마지막에 오늘 작업 요약 반영을 요청했을 때만 업데이트한다.
- 조사/구현/리뷰/문서정리/배포확인 등 실제 작업이 있었으면, 요청 시점에 그날 작업을 한 번에 요약해 적는다.
- 같은 날짜에 작업이 여러 번 있으면 해당 날짜 섹션에 계속 누적한다.
- 새 날짜가 되면 맨 위에 새 날짜 섹션을 추가한다.
- 너무 장황하게 쓰지 말고, 다음 세션이 바로 이어받을 수 있게 핵심만 적는다.

## 2026-04-10

### 오늘 한 일

- `D:\music` 문서를 현재 코드 기준 최소 세트로 재정리
- 삭제된 handoff / 계획 / 진행 문서를 git 기준으로 다시 읽고 [`PROJECT_HISTORY.md`](D:\music\docs\PROJECT_HISTORY.md) 재작성
- `D:\songsai-bank-bridge`, `D:\wrapper\suno-api` 핵심 파일을 읽고 현재 상태 재파악
- 세 저장소를 함께 보는 중앙 문서 [`ECOSYSTEM_OVERVIEW.md`](D:\music\docs\ECOSYSTEM_OVERVIEW.md) 작성
- 새 세션에서 바로 이어가기 위한 [`AGENT_START_HERE.md`](D:\music\docs\AGENT_START_HERE.md) 작성

### 현재 확인된 상태

#### `D:\music`

- 메인 기능은 로그인, 크레딧, 음악 생성, 다운로드, 보너스 트랙, 비디오, 관리자, 입금 요청까지 포함
- `MusicAsset` 기반 자산 저장 구조가 이미 들어가 있음
- 비디오는 서버 렌더와 브라우저 렌더가 함께 존재하지만 브라우저 렌더 비중이 커짐

#### `D:\songsai-bank-bridge`

- SMS webhook 수신 가능
- 문자 파싱 가능
- 메인 앱 입금 요청 자동 매칭 후보 계산 가능
- 모니터링 대시보드 있음

#### `D:\wrapper\suno-api`

- 커스텀 생성, 일반 생성, 상태 조회, aligned lyrics, quota 조회 API 존재
- 세션 유지, CAPTCHA 대응, 브라우저 자동화 로직 포함
- 가장 운영 리스크가 큰 계층

### 남아 있는 문제

- wrapper 안정성은 여전히 별도 검증이 필요
- bank-bridge 와 메인 앱의 실제 운영 연결 상태는 작업마다 다시 확인 필요
- 비디오 생성의 최종 운영 정책은 더 정리될 여지가 있음

### 다음에 바로 할 일

- 이 문서에 사용자가 오늘 작업할 내용을 계속 추가
- 새 기능 작업 전에는 이 파일의 최신 섹션부터 확인
- 큰 구조 변화가 생기면 관련 요약 문서도 함께 업데이트

### 관련 핵심 파일

- [`D:\music\README.md`](D:\music\README.md)
- [`D:\music\docs\ECOSYSTEM_OVERVIEW.md`](D:\music\docs\ECOSYSTEM_OVERVIEW.md)
- [`D:\music\docs\ARCHITECTURE.md`](D:\music\docs\ARCHITECTURE.md)
- [`D:\music\docs\OPERATIONS.md`](D:\music\docs\OPERATIONS.md)
- [`D:\music\docs\PROJECT_HISTORY.md`](D:\music\docs\PROJECT_HISTORY.md)
- [`D:\songsai-bank-bridge\app\api\webhooks\sms\route.ts`](D:\songsai-bank-bridge\app\api\webhooks\sms\route.ts)
- [`D:\songsai-bank-bridge\lib\matching.ts`](D:\songsai-bank-bridge\lib\matching.ts)
- [`D:\wrapper\suno-api\src\lib\SunoApi.ts`](D:\wrapper\suno-api\src\lib\SunoApi.ts)
