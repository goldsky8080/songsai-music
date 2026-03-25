# Deployment Plan

이 문서는 운영 배포 구조를 개념적으로 정리한 문서다.
실제 실행 절차는 [n100_quickstart.md](/d:/music/deploy/n100_quickstart.md)를 기준으로 본다.

## 1. 현재 권장 구조

- 메인 앱: Docker Compose
- PostgreSQL: Docker Compose
- 운영 SONGS API wrapper: 별도 디렉터리 + systemd
- Nginx: 외부 리버스 프록시

## 2. 현재 포트 기준

- 메인 앱: `3000`
- 운영 wrapper: `3101`
- 테스트 wrapper: `3201`
- PostgreSQL: `5432`

## 3. 현재 운영 도메인

- 메인 앱: `https://songsai.org`
- 운영 wrapper: `https://suno.songsai.org`
- 테스트 wrapper: `https://dev-suno.songsai.org`

## 4. 운영 반영 원칙

- 메인 앱 배포와 wrapper 배포는 분리한다
- auto-lyrics 같은 실험성 변경은 먼저 `dev-suno` 에서 검증한다
- 운영 반영 전에는 반복 테스트와 로그 확인을 먼저 한다

## 5. 함께 볼 문서

- 실제 서버 절차: [n100_quickstart.md](/d:/music/deploy/n100_quickstart.md)
- 개발과 운영 분리 원칙: [dev_server_cleanup_plan.md](/d:/music/dev_server_cleanup_plan.md)
- 자동 가사 검증 기록: [ai_auto_lyrics_handoff.md](/d:/music/ai_auto_lyrics_handoff.md)
