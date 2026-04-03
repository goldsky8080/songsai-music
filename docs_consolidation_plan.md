# Docs Consolidation Plan

이 문서는 `D:\music`, `D:\songsai-bank-bridge`, `D:\wrapper` 에 흩어진 문서를
실사용 문서와 보관 문서로 다시 정리하기 위한 통합 기준안이다.

목표는 아래 3가지다.

1. 지금 실제로 읽는 문서 수를 줄인다.
2. 같은 역할의 문서가 여러 개 겹치는 상태를 정리한다.
3. 날짜별 handoff 와 디버그 메모는 archive 로 내린다.

## 1. 최종 권장 구조

권장 최종 구조는 `실사용 8개 + archive` 다.

### 실사용 핵심 문서

1. `MASTER_INDEX.md`
2. `SYSTEM_OVERVIEW.md`
3. `PRODUCT_AND_BACKLOG.md`
4. `SUNO_WRAPPER_INTEGRATION.md`
5. `VIDEO_RENDER_PLAN.md`
6. `DEPLOYMENT_AND_OPERATIONS.md`
7. `BANK_BRIDGE_DESIGN.md`
8. `UI_AND_BRANDING_PLAN.md`

### 보관 문서

- `archive/session_handoffs/...`
- `archive/deploy_debug/...`
- `archive/legacy_plans/...`

## 2. 새 문서별 역할

### MASTER_INDEX.md

역할:
- 전체 문서 시작점
- 읽는 순서
- 프로젝트별 문서 링크

포함할 내용:
- 처음 읽을 순서
- 각 문서의 목적 한 줄 설명
- archive 문서 보는 기준

### SYSTEM_OVERVIEW.md

역할:
- 3개 프로젝트 전체 구조
- 책임 분리
- 도메인/포트/연동 방향
- 현재 시스템의 큰 흐름

포함할 내용:
- `music / wrapper / bank-bridge` 역할
- 생성, 재생, 다운로드, 크레딧, 입금 흐름
- 운영/개발 wrapper 위치

### PRODUCT_AND_BACKLOG.md

역할:
- 현재 제공 기능
- 남은 작업 backlog
- 우선순위

포함할 내용:
- 인증/크레딧/음악 생성/보너스곡/관리자 기능 요약
- 지금 해야 할 일
- 보류 항목

### SUNO_WRAPPER_INTEGRATION.md

역할:
- Suno wrapper 연동 구조
- CAPTCHA/세션/manual 흐름
- manual CAPTCHA 락
- recent result matching
- AI 가사/자동 생성 입력 규칙

포함할 내용:
- provider/wrapper 관계
- manual CAPTCHA 모드 설계
- wrapper 리스크와 fallback

### VIDEO_RENDER_PLAN.md

역할:
- 비디오 생성 구조
- 서버 렌더 한계
- 브라우저 렌더 방향
- MusicAsset 연계

포함할 내용:
- 기존 서버 렌더
- 브라우저 canvas + ffmpeg.wasm 방향
- 현재 제약과 다음 단계

### DEPLOYMENT_AND_OPERATIONS.md

역할:
- 운영 배포 구조
- 포트/도메인
- 실제 서버 절차
- dev/prod 분리 원칙

포함할 내용:
- n100 배포 절차
- wrapper dev/prod 운영 방식
- cleanup/로그 확인 포인트

### BANK_BRIDGE_DESIGN.md

역할:
- bank-bridge 전체 설계
- webhook payload
- schema
- 메인 앱과의 계약

포함할 내용:
- webhook 목적
- DB 설계
- 입금 매칭 흐름

### UI_AND_BRANDING_PLAN.md

역할:
- 메인 서비스 홈/생성 UI 리디자인 방향
- 브랜딩/모션/레이아웃 계획

포함할 내용:
- 홈 리디자인 방향
- 참고 사이트 해석
- 단계별 UI 개선 범위

## 3. 기존 문서 -> 새 문서 매핑

### D:\music 문서

#### MASTER_INDEX.md 로 통합

- `D:\music\DOCS_INDEX.md`
- `D:\music\README_MASTER.md`

#### SYSTEM_OVERVIEW.md 로 통합

- `D:\music\project_plan.md`
- `D:\music\CURRENT_STATUS.md`
- `D:\music\BANK_BRIDGE.md`
- `D:\music\WRAPPER_NOTES.md`
- `D:\music\suno_integration.md`

#### PRODUCT_AND_BACKLOG.md 로 통합

- `D:\music\development_todo.md`
- `D:\music\NEXT_ACTIONS.md`
- `D:\music\suno_progress_notes.md`

주의:
- `suno_progress_notes.md` 전체를 그대로 옮기지 말고
  기능 현황 / 현재 판단 / 남은 작업만 추려서 넣는다.

#### SUNO_WRAPPER_INTEGRATION.md 로 통합

- `D:\music\ai_auto_lyrics_handoff.md`
- `D:\music\manual_captcha_lock_plan.md`
- `D:\music\suno_integration.md`
- `D:\music\WRAPPER_NOTES.md`

#### VIDEO_RENDER_PLAN.md 로 통합

- `D:\music\client_video_render_plan.md`
- `D:\music\suno_progress_notes.md` 의 비디오 관련 부분

#### DEPLOYMENT_AND_OPERATIONS.md 로 통합

- `D:\music\deployment_plan.md`
- `D:\music\DEPLOYMENT.md`
- `D:\music\deploy\n100_quickstart.md`
- `D:\music\dev_server_cleanup_plan.md`
- `D:\music\wrapper_dev_deploy_2026-03-28.md`
- `D:\music\wrapper_feed_debug_deploy_2026-03-28.md`
- `D:\music\railway_suno_wrapper_plan.md`

주의:
- `railway_suno_wrapper_plan.md` 는 본문이 아니라
  "보류/참고" 섹션으로 넣는 게 좋다.

#### BANK_BRIDGE_DESIGN.md 로 통합

- `D:\music\deposit_integration_design.md`
- `D:\music\bank_bridge_stack_decision.md`
- `D:\music\BANK_BRIDGE.md`

#### UI_AND_BRANDING_PLAN.md 로 통합

- `D:\music\music_home_redesign_plan.md`

#### archive 로 이동

- `D:\music\session_handoff_2026-03-26.md`
- `D:\music\session_handoff_2026-03-28.md`
- `D:\music\session_handoff_2026-03-29.md`
- `D:\music\session_handoff_2026-03-30.md`

### D:\songsai-bank-bridge 문서

#### SYSTEM_OVERVIEW.md 에 일부 요약 반영

- `D:\songsai-bank-bridge\README.md`

#### BANK_BRIDGE_DESIGN.md 로 통합

- `D:\songsai-bank-bridge\docs\PROJECT_PLAN.md`
- `D:\songsai-bank-bridge\docs\SMS_WEBHOOK_DESIGN.md`
- `D:\songsai-bank-bridge\docs\DB_SCHEMA_NOTES.md`

### D:\wrapper 문서

#### SYSTEM_OVERVIEW.md 에 일부 요약 반영

- `D:\wrapper\wrapper_project_handoff.md` 의 프로젝트 관계/배포 정보 일부

#### SUNO_WRAPPER_INTEGRATION.md 로 통합

- `D:\wrapper\wrapper_project_handoff.md`
- `D:\wrapper\suno-api\README.md` 에서 우리 프로젝트에 필요한 사용/운영 부분만 요약

주의:
- `README_CN.md`, `README_RU.md` 는 통합 대상 아님
- 원본 외부 프로젝트 문서로 두고 링크만 남긴다.

## 4. 실제 정리 순서

권장 순서는 아래와 같다.

1. `MASTER_INDEX.md` 초안 작성
2. `SYSTEM_OVERVIEW.md` 작성
3. `PRODUCT_AND_BACKLOG.md` 작성
4. `SUNO_WRAPPER_INTEGRATION.md` 작성
5. `VIDEO_RENDER_PLAN.md` 작성
6. `DEPLOYMENT_AND_OPERATIONS.md` 작성
7. `BANK_BRIDGE_DESIGN.md` 작성
8. `UI_AND_BRANDING_PLAN.md` 작성
9. 날짜별 handoff 문서를 `archive` 분류
10. 기존 문서 상단에 `이 문서는 archive/reference` 표기 후 점진 정리

## 5. 문서 수를 이렇게 잡는 이유

### 너무 적게 합치면 생기는 문제

- 하나의 문서가 너무 길어짐
- wrapper, bank-bridge, deploy 가 한 문서에서 섞임
- 다시 찾기 어려워짐

### 너무 많이 남기면 생기는 문제

- 지금처럼 어디를 먼저 읽어야 하는지 모름
- 같은 내용이 여러 파일에 중복됨
- handoff 와 실제 운영 문서가 섞임

그래서 현재 기준 가장 적절한 균형은
`핵심 8개 + archive` 다.

## 6. 내가 추천하는 실제 폴더 구조

```txt
D:\music\docs\
  MASTER_INDEX.md
  SYSTEM_OVERVIEW.md
  PRODUCT_AND_BACKLOG.md
  SUNO_WRAPPER_INTEGRATION.md
  VIDEO_RENDER_PLAN.md
  DEPLOYMENT_AND_OPERATIONS.md
  BANK_BRIDGE_DESIGN.md
  UI_AND_BRANDING_PLAN.md
  archive\
    session_handoffs\
    deploy_debug\
    legacy_plans\
```

## 7. 다음 바로 할 일

실제 통합 작업은 아래 순서로 시작하는 게 좋다.

1. `MASTER_INDEX.md` 새 버전 작성
2. `SYSTEM_OVERVIEW.md` 새 버전 작성
3. `PRODUCT_AND_BACKLOG.md` 새 버전 작성

이 3개만 먼저 만들어도
문서 체계가 거의 잡힌다.

