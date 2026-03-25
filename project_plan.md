# Project Plan

이 문서는 `d:\music` 프로젝트의 큰 그림을 빠르게 파악하기 위한 개요 문서다.
상세 진행 상황은 [suno_progress_notes.md](/d:/music/suno_progress_notes.md), 배포 절차는 [deploy/n100_quickstart.md](/d:/music/deploy/n100_quickstart.md), 자동 가사 실험은 [ai_auto_lyrics_handoff.md](/d:/music/ai_auto_lyrics_handoff.md)를 본다.

## 1. 프로젝트 목적

이 프로젝트는 사용자가 제목, 가사 또는 가사 아이디어, 스타일을 입력하면 AI를 통해 음악을 생성하고,
완성된 결과를 재생하고 다운로드할 수 있게 만드는 웹 서비스다.

현재 서비스 방향은 아래 세 가지 축으로 정리된다.

- 음악 생성
- 크레딧/결제성 정책
- 운영/관리 기능

## 2. 현재 핵심 기능 범위

### 사용자 기능
- Google 로그인 기반 인증
- 음악 생성
- 음악 재생 및 다운로드
- 생성 이력 조회
- 무료 쿠폰 입력을 통한 크레딧 충전

### 관리자 기능
- 사용자 목록 조회
- 사용자 권한 변경
- 사용자별 무료/유료 크레딧 지급
- 무료 쿠폰 발급

### 음악 생성 모드
- `직접 입력`
- `AI가사`
- `AI 자동 생성`

## 3. 시스템 구조

### 메인 앱
- Next.js App Router
- Prisma + PostgreSQL
- 로컬 작업 경로: `d:\music`

### Suno 연동
- 메인 앱은 wrapper를 통해 Suno와 연결
- 운영 wrapper: `suno.songsai.org`
- 테스트 wrapper: `dev-suno.songsai.org`

### 운영 서버
- 메인 앱: Docker Compose
- PostgreSQL: Docker Compose
- 운영 wrapper: 별도 systemd 서비스

## 4. 현재 우선순위

### 1순위
- 음악 생성 안정성
- dev wrapper 자동 가사 흐름 안정화
- 운영 반영 전 테스트 반복 검증

### 2순위
- 관리자 페이지 고도화
- 무료 쿠폰/크레딧 운영 흐름 정리
- 다운로드 제한/보너스 트랙 정책 UX 개선

### 3순위
- 영상 생성
- 이벤트용 숨김 곡 활용 페이지
- 고급 티어 정책

## 5. 문서 읽는 순서

처음 다시 잡을 때는 아래 순서를 권장한다.

1. [DOCS_INDEX.md](/d:/music/DOCS_INDEX.md)
2. [suno_progress_notes.md](/d:/music/suno_progress_notes.md)
3. [ai_auto_lyrics_handoff.md](/d:/music/ai_auto_lyrics_handoff.md)
4. [development_todo.md](/d:/music/development_todo.md)
5. [deploy/n100_quickstart.md](/d:/music/deploy/n100_quickstart.md)
