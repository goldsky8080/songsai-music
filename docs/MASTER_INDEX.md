# Master Index

이 문서는 `D:\music`, `D:\songsai-bank-bridge`, `D:\wrapper` 를 함께 보는 기준 입구 문서다.

지금 문서는 많지만, 실제로 자주 읽는 핵심 문서는 아래 3개부터 보면 된다.

1. [SYSTEM_OVERVIEW.md](D:/music/docs/SYSTEM_OVERVIEW.md)
2. [PRODUCT_AND_BACKLOG.md](D:/music/docs/PRODUCT_AND_BACKLOG.md)
3. [DEPLOYMENT_AND_OPERATIONS.md](D:/music/docs/DEPLOYMENT_AND_OPERATIONS.md)

wrapper 쪽 작업을 볼 때는:
- [SUNO_WRAPPER_INTEGRATION.md](D:/music/docs/SUNO_WRAPPER_INTEGRATION.md)

비디오 생성 구조를 볼 때는:
- [VIDEO_RENDER_PLAN.md](D:/music/docs/VIDEO_RENDER_PLAN.md)

bank-bridge 를 볼 때는:
- [BANK_BRIDGE_DESIGN.md](D:/music/docs/BANK_BRIDGE_DESIGN.md)

UI/브랜딩을 볼 때는:
- [UI_AND_BRANDING_PLAN.md](D:/music/docs/UI_AND_BRANDING_PLAN.md)

## 읽는 순서

### 처음 전체를 다시 파악할 때

1. [SYSTEM_OVERVIEW.md](D:/music/docs/SYSTEM_OVERVIEW.md)
2. [PRODUCT_AND_BACKLOG.md](D:/music/docs/PRODUCT_AND_BACKLOG.md)
3. [DEPLOYMENT_AND_OPERATIONS.md](D:/music/docs/DEPLOYMENT_AND_OPERATIONS.md)

### wrapper / CAPTCHA / Suno 연동 이슈를 볼 때

1. [SYSTEM_OVERVIEW.md](D:/music/docs/SYSTEM_OVERVIEW.md)
2. [SUNO_WRAPPER_INTEGRATION.md](D:/music/docs/SUNO_WRAPPER_INTEGRATION.md)
3. [PRODUCT_AND_BACKLOG.md](D:/music/docs/PRODUCT_AND_BACKLOG.md)

### 비디오 생성 구조를 볼 때

1. [SYSTEM_OVERVIEW.md](D:/music/docs/SYSTEM_OVERVIEW.md)
2. [VIDEO_RENDER_PLAN.md](D:/music/docs/VIDEO_RENDER_PLAN.md)
3. [PRODUCT_AND_BACKLOG.md](D:/music/docs/PRODUCT_AND_BACKLOG.md)

### 입금 자동화 / bank-bridge 를 볼 때

1. [SYSTEM_OVERVIEW.md](D:/music/docs/SYSTEM_OVERVIEW.md)
2. [BANK_BRIDGE_DESIGN.md](D:/music/docs/BANK_BRIDGE_DESIGN.md)
3. [DEPLOYMENT_AND_OPERATIONS.md](D:/music/docs/DEPLOYMENT_AND_OPERATIONS.md)

## 문서 역할

### 핵심 문서

- [SYSTEM_OVERVIEW.md](D:/music/docs/SYSTEM_OVERVIEW.md)
  - 3개 프로젝트 구조, 책임 분리, 현재 큰 흐름
- [PRODUCT_AND_BACKLOG.md](D:/music/docs/PRODUCT_AND_BACKLOG.md)
  - 현재 기능, 남은 작업, 우선순위
- [DEPLOYMENT_AND_OPERATIONS.md](D:/music/docs/DEPLOYMENT_AND_OPERATIONS.md)
  - 배포 구조, 서버 절차, 운영 주의사항

### 주제별 설계 문서

- [SUNO_WRAPPER_INTEGRATION.md](D:/music/docs/SUNO_WRAPPER_INTEGRATION.md)
  - Suno wrapper, CAPTCHA, manual flow, recent result matching
- [VIDEO_RENDER_PLAN.md](D:/music/docs/VIDEO_RENDER_PLAN.md)
  - 비디오 생성 구조, 브라우저 렌더 방향
- [BANK_BRIDGE_DESIGN.md](D:/music/docs/BANK_BRIDGE_DESIGN.md)
  - 입금 webhook, 파싱, 자동 매칭 설계
- [UI_AND_BRANDING_PLAN.md](D:/music/docs/UI_AND_BRANDING_PLAN.md)
  - 홈/생성 UI 리디자인 방향

## 기존 문서와의 관계

기존 루트 문서들은 당분간 참고용으로 남겨둔다.
다만 앞으로 새 세션에서 다시 파악할 때는, 우선 이 `docs` 폴더 기준으로 보는 것을 원칙으로 한다.

대표 참고 문서:
- [D:\music\project_plan.md](D:/music/project_plan.md)
- [D:\music\development_todo.md](D:/music/development_todo.md)
- [D:\music\deployment_plan.md](D:/music/deployment_plan.md)
- [D:\music\suno_progress_notes.md](D:/music/suno_progress_notes.md)
- [D:\music\client_video_render_plan.md](D:/music/client_video_render_plan.md)
- [D:\music\manual_captcha_lock_plan.md](D:/music/manual_captcha_lock_plan.md)

## archive 기준

날짜별 handoff 와 특정 시점 debug 메모는 현재 상태를 설명하는 기준 문서가 아니라 기록 문서다.
즉 필요할 때 참고하되, 시작 문서로 보지는 않는다.

대표 archive 대상:
- [D:\music\session_handoff_2026-03-26.md](D:/music/session_handoff_2026-03-26.md)
- [D:\music\session_handoff_2026-03-28.md](D:/music/session_handoff_2026-03-28.md)
- [D:\music\session_handoff_2026-03-29.md](D:/music/session_handoff_2026-03-29.md)
- [D:\music\session_handoff_2026-03-30.md](D:/music/session_handoff_2026-03-30.md)

