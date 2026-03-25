# Project Plan

이 문서는 `D:\music` 프로젝트의 큰 방향과 현재 범위를 빠르게 파악하기 위한 개요 문서다.
상세 진행 상태는 [suno_progress_notes.md](/d:/music/suno_progress_notes.md), 배포 절차는 [n100_quickstart.md](/d:/music/deploy/n100_quickstart.md), 자동 가사 관련 메모는 [ai_auto_lyrics_handoff.md](/d:/music/ai_auto_lyrics_handoff.md)를 본다.

## 1. 프로젝트 목적

이 프로젝트는 사용자가 제목, 가사 또는 가사 아이디어, 스타일을 입력하면 AI를 통해 음악을 생성하고,
완성된 결과를 재생하고 내려받을 수 있게 만드는 서비스다.

현재 서비스 방향은 아래 세 축으로 정리한다.

- 음악 생성
- 크레딧 결제와 충전
- 운영과 관리자 기능

## 2. 현재 범위

### 사용자 기능
- Google 로그인 기반 인증
- 음악 생성
- 음악 재생과 다운로드
- 생성 이력 조회
- 무료 쿠폰 입력을 통한 크레딧 충전

### 관리자 기능
- 사용자 목록 조회
- 사용자 권한 변경
- 무료 및 유료 크레딧 지급
- 무료 쿠폰 발급

### 음악 생성 모드
- `직접 입력`
- `AI가사`
- `AI 자동 생성`

## 3. 시스템 구조

### 메인 앱
- Next.js App Router
- Prisma + PostgreSQL
- 로컬 작업 경로: `D:\music`

### SONGS API 연동
- 메인 앱은 wrapper를 통해 외부 음악 생성 엔진과 연결한다
- 운영 wrapper 주소: `https://suno.songsai.org`
- 테스트 wrapper 주소: `https://dev-suno.songsai.org`

### 운영 서버
- 메인 앱: Docker Compose
- PostgreSQL: Docker Compose
- 운영 wrapper: 별도 systemd 서비스

## 4. 현재 우선순위

### 1순위
- 음악 생성 안정화
- dev wrapper 자동 가사 흐름 안정화
- 운영 반영 전 반복 검증

### 2순위
- 관리자 페이지 고도화
- 무료 쿠폰과 크레딧 운영 흐름 정리
- 다운로드 제한과 보너스곡 정책 UX 개선

### 3순위
- 이벤트용 숨김곡 활용 페이지
- 추가 생성 정책 고도화
- 더 세분화된 티어 정책

## 5. 문서 읽는 순서

처음 다시 시작할 때는 아래 순서를 권장한다.

1. [DOCS_INDEX.md](/d:/music/DOCS_INDEX.md)
2. [suno_progress_notes.md](/d:/music/suno_progress_notes.md)
3. [ai_auto_lyrics_handoff.md](/d:/music/ai_auto_lyrics_handoff.md)
4. [development_todo.md](/d:/music/development_todo.md)
5. [n100_quickstart.md](/d:/music/deploy/n100_quickstart.md)
