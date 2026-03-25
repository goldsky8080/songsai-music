# Dev Server Cleanup Plan

이 문서는 운영 서버 1차 배포와 AI 자동 가사 테스트까지 끝난 시점에서, 개발 서버를 어떤 기준으로 정리하고 다음 작업을 어디서부터 다시 시작하면 좋은지 빠르게 판단하기 위한 기준 문서다.

## 1. 현재 상태 요약

### 운영에서 검증된 것
- 메인 앱 Docker 배포 성공
- PostgreSQL 연결 성공
- Prisma 마이그레이션 성공
- SONGS API wrapper 연결 성공
- 운영 포트 `3101` 검증 완료
- 메인 앱에서 wrapper를 `http://host.docker.internal:3101` 로 바라보는 방식 검증 완료
- `https://songsai.org` 외부 접속 성공
- `https://suno.songsai.org` 공개 성공

### 개발에서 최근 확인한 것
- `dev-suno.songsai.org` 테스트 wrapper 분리 성공
- 메인 프로젝트의 auto 요청을 wrapper `/api/custom_generate` 로 보내도록 정리
- 테스트 wrapper 기준 자동 가사 생성 성공 사례 확인
- 운영 wrapper와 운영 메인 앱에는 auto 관련 패치를 아직 전부 반영하지 않음

## 2. 운영 기준 핵심 값

- 메인 앱 포트: `3000`
- 운영 wrapper 포트: `3101`
- 테스트 wrapper 포트: `3201`
- PostgreSQL 포트: `5432`
- 메인 앱 내부에서 wrapper 접근 주소: `http://host.docker.internal:3101`
- 운영 도메인: `https://songsai.org`
- 운영 wrapper 공개 주소: `https://suno.songsai.org`
- 테스트 wrapper 공개 주소: `https://dev-suno.songsai.org`

## 3. 환경 분리 원칙

### 운영 환경
- `APP_URL=https://songsai.org`
- `SONGS_API_BASE_URL=http://host.docker.internal:3101`
- `MUSIC_PROVIDER_MODE=songs`

### 로컬 개발 환경 예시

1. 로컬 wrapper 사용
- `SONGS_API_BASE_URL=http://localhost:3101`
- `MUSIC_PROVIDER_MODE=songs`

2. 운영 wrapper 공개 주소 사용
- `SONGS_API_BASE_URL=https://suno.songsai.org`
- `MUSIC_PROVIDER_MODE=songs`

3. 자동 가사 테스트 wrapper 사용
- `SONGS_API_BASE_URL=http://dev-suno.songsai.org`
- `MUSIC_PROVIDER_MODE=songs`

## 4. 추천 공개 구조

- `songsai.org` -> 메인 앱
- `suno.songsai.org` -> 운영 SONGS API wrapper
- `dev-suno.songsai.org` -> 테스트 wrapper

## 5. 지금 시점의 추천 다음 작업

1. wrapper 수정본 재현 가능한 형태로 정리
2. 테스트 wrapper 와 운영 wrapper 차이점 문서화
3. 운영 반영 전 안정성 기준 정리
4. 메인 앱과 wrapper 브랜딩을 `SONGS` 기준으로 점진 정리
