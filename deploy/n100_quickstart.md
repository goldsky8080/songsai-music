# N100 서버 퀵스타트

이 문서는 `music` 프로젝트를 `N100 리눅스 서버`에 배포할 때 바로 따라할 수 있도록 만든 실전 절차다.

## 1. 현재 권장 구조

- PostgreSQL: Docker Compose 내부 컨테이너
- 메인 앱(Next.js): Docker Compose 내부 컨테이너
- SONGS API wrapper: 같은 서버의 별도 디렉터리에서 직접 실행
- Nginx: 외부 공개 진입점

현재 기준 포트:

- `3000`: 메인 앱
- `3101`: 운영 wrapper
- `3201`: 테스트 wrapper
- `5432`: PostgreSQL

## 2. 메인 앱 환경 변수 예시

```env
DATABASE_URL=postgresql://postgres:change-this-password@postgres:5432/music_platform?schema=public
REDIS_URL=redis://127.0.0.1:6379
SONGS_COOKIE=
SONGS_API_BASE_URL=http://host.docker.internal:3101
MUSIC_PROVIDER_MODE=songs
APP_URL=https://songsai.org
AUTH_SECRET=replace-with-a-long-random-secret
NEXT_TELEMETRY_DISABLED=1
```

## 3. 운영 wrapper 설치 예시

```bash
cd ~/services
git clone https://github.com/gcui-art/suno-api.git
cd suno-api
npm install
npx playwright install chromium
```

## 4. 운영 wrapper 환경 변수 예시

```env
SONGS_COOKIE=실제_세션_쿠키
TWOCAPTCHA_KEY=실제_2captcha_key
BROWSER=chromium
BROWSER_GHOST_CURSOR=false
BROWSER_LOCALE=en
BROWSER_HEADLESS=true
```

## 5. 운영 공개 구조

- `songsai.org` -> 메인 앱(`127.0.0.1:3000`)
- `suno.songsai.org` -> 운영 SONGS API wrapper(`127.0.0.1:3101`)
- `dev-suno.songsai.org` -> 테스트 wrapper(`127.0.0.1:3201`)

## 6. 테스트 wrapper 운용 원칙

- 운영 wrapper 는 안정성 우선
- 실험성 패치는 `~/services/suno-api-dev` 같은 테스트 디렉터리에서 먼저 검증
- 로컬 개발 앱은 필요할 때 `SONGS_API_BASE_URL=http://dev-suno.songsai.org` 로 바꿔서 테스트

## 7. 자주 쓰는 확인 명령

### 메인 앱 상태
```bash
cd ~/services/music/deploy
sudo docker compose -f docker-compose.n100.yml ps
```

### 운영 wrapper 상태
```bash
sudo systemctl status suno-wrapper
```

### 운영 wrapper 로그
```bash
sudo journalctl -u suno-wrapper -f
```

### 테스트 wrapper 실행
```bash
cd ~/services/suno-api-dev
PORT=3201 npm run dev
```
