# N100 서버 퀵스타트

이 문서는 `music` 프로젝트를 `N100 리눅스 서버`에 배포할 때 바로 따라할 수 있도록 만든 실전 절차이다.

## 1. 현재 권장 구조

- PostgreSQL: Docker Compose 내부 컨테이너
- 메인 앱(Next.js): Docker Compose 내부 컨테이너
- Suno wrapper: 같은 서버의 별도 디렉터리에서 직접 실행
- Nginx: 외부 공개 진입점

현재 기준 포트:

- `3000`: 메인 앱
- `3101`: Suno wrapper
- `5432`: PostgreSQL

## 2. 서버 준비

Ubuntu/Debian 계열 기준:

```bash
sudo apt update
sudo apt install -y git curl nginx
```

Docker 확인:

```bash
docker --version
docker compose version
```

## 3. 메인 앱 배치

```bash
mkdir -p ~/services
cd ~/services
git clone https://github.com/goldsky8080/music.git
cd music
```

## 4. 메인 앱 환경 변수 준비

```bash
cp deploy/.env.n100.example deploy/.env.n100
nano deploy/.env.n100
```

예시:

```env
DATABASE_URL=postgresql://postgres:change-this-password@postgres:5432/music_platform?schema=public
REDIS_URL=redis://127.0.0.1:6379
SUNO_COOKIE=
SUNO_API_BASE_URL=http://host.docker.internal:3101
MUSIC_PROVIDER_MODE=suno
APP_URL=http://211.247.107.135
AUTH_SECRET=music-platform-secret-2026-young-n100
NEXT_TELEMETRY_DISABLED=1
```

## 5. 메인 앱 실행

```bash
cd ~/services/music/deploy
sudo docker compose -f docker-compose.n100.yml up -d --build
```

확인:

```bash
sudo docker compose -f docker-compose.n100.yml ps
curl http://127.0.0.1:3000/api/health
```

## 6. Prisma 마이그레이션

```bash
cd ~/services/music
sudo docker compose -f deploy/docker-compose.n100.yml exec music-app npx prisma migrate deploy
```

## 7. Suno wrapper 설치

```bash
cd ~/services
git clone https://github.com/gcui-art/suno-api.git
cd suno-api
npm install
npx playwright install chromium
```

## 8. Suno wrapper 환경 변수

```bash
cp .env.example .env.local
nano .env.local
```

예시:

```env
SUNO_COOKIE=여기에_실제_SUNO_COOKIE
TWOCAPTCHA_KEY=여기에_2captcha_key
BROWSER=chromium
BROWSER_GHOST_CURSOR=false
BROWSER_LOCALE=en
BROWSER_HEADLESS=true
```

## 9. Suno wrapper 테스트 실행

```bash
cd ~/services/suno-api
PORT=3101 npm run dev
```

별도 SSH 창에서 확인:

```bash
curl http://127.0.0.1:3101/api/get_limit
```

정상이라면 JSON 응답이 내려온다.

## 10. 메인 앱과 wrapper 연결

메인 앱은 Docker 컨테이너 안에서 동작하고, wrapper는 호스트에서 직접 실행한다.
그래서 컨테이너 안에서는 `127.0.0.1` 대신 `host.docker.internal` 로 호스트를 바라봐야 한다.

`.env.n100`:

```env
SUNO_API_BASE_URL=http://host.docker.internal:3101
```

`docker-compose.n100.yml` 의 `music-app` 서비스에는 아래 설정이 필요하다.

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

설정 변경 후 재시작:

```bash
cd ~/services/music/deploy
sudo docker compose -f docker-compose.n100.yml down
sudo docker compose -f docker-compose.n100.yml up -d --build
```

연결 확인:

```bash
curl http://127.0.0.1:3000/api/provider
```

정상 예시:

```json
{"mode":"suno","ok":true,"configured":true}
```

## 11. SSH 터널로 브라우저 테스트

로컬 Windows PowerShell:

```powershell
ssh -L 3000:127.0.0.1:3000 -p 2233 young@211.247.107.135
```

이 창을 유지한 상태에서 로컬 브라우저에서:

```txt
http://127.0.0.1:3000
```

## 12. Nginx 리버스 프록시

예시 파일:

- [nginx.music-platform.conf.example](/d:/music/deploy/nginx.music-platform.conf.example)
- [nginx.suno-wrapper.conf.example](/d:/music/deploy/nginx.suno-wrapper.conf.example)

적용 예시:

```bash
sudo cp ~/services/music/deploy/nginx.music-platform.conf.example /etc/nginx/sites-available/music-platform
sudo cp ~/services/music/deploy/nginx.suno-wrapper.conf.example /etc/nginx/sites-available/suno-wrapper
sudo ln -s /etc/nginx/sites-available/music-platform /etc/nginx/sites-enabled/music-platform
sudo ln -s /etc/nginx/sites-available/suno-wrapper /etc/nginx/sites-enabled/suno-wrapper
sudo nginx -t
sudo systemctl reload nginx
```

권장 공개 구조:

- `songsai.org` -> 메인 앱(`127.0.0.1:3000`)
- `suno.songsai.org` -> Suno wrapper(`127.0.0.1:3101`)

이렇게 해두면 운영 앱은 내부 주소 `http://host.docker.internal:3101` 을 계속 사용하고,
로컬 개발 앱은 외부 HTTPS 주소 `https://suno.songsai.org` 를 사용해서 같은 소스를 그대로 테스트할 수 있다.

## 13. 서버 운영 중 자주 쓰는 명령

메인 앱/DB 상태 확인:

```bash
cd ~/services/music/deploy
sudo docker compose -f docker-compose.n100.yml ps
```

메인 앱/DB 재시작:

```bash
cd ~/services/music/deploy
sudo docker compose -f docker-compose.n100.yml down
sudo docker compose -f docker-compose.n100.yml up -d --build
```

메인 앱 로그 보기:

```bash
cd ~/services/music/deploy
sudo docker compose -f docker-compose.n100.yml logs -f music-app
```

DB 로그 보기:

```bash
cd ~/services/music/deploy
sudo docker compose -f docker-compose.n100.yml logs -f postgres
```

Prisma 마이그레이션 다시 적용:

```bash
cd ~/services/music
sudo docker compose -f deploy/docker-compose.n100.yml exec music-app npx prisma migrate deploy
```

wrapper 개발 실행:

```bash
cd ~/services/suno-api
PORT=3101 npm run dev
```

wrapper 운영 실행:

```bash
cd ~/services/suno-api
npm run build
PORT=3101 npm run start
```

wrapper 응답 확인:

```bash
curl http://127.0.0.1:3101/api/get_limit
```

메인 앱에서 wrapper 연결 확인:

```bash
curl http://127.0.0.1:3000/api/provider
```

## 14. systemd 운영 예시

메인 앱 Docker Compose 스택:

- [systemd.music-app-docker.example.service](/d:/music/deploy/systemd.music-app-docker.example.service)

Suno wrapper:

- [systemd.suno-wrapper.example.service](/d:/music/deploy/systemd.suno-wrapper.example.service)

적용 예시:

```bash
sudo cp ~/services/music/deploy/systemd.music-app-docker.example.service /etc/systemd/system/music-app-docker.service
sudo cp ~/services/music/deploy/systemd.suno-wrapper.example.service /etc/systemd/system/suno-wrapper.service
sudo systemctl daemon-reload
sudo systemctl enable music-app-docker
sudo systemctl enable suno-wrapper
sudo systemctl start music-app-docker
sudo systemctl start suno-wrapper
```

## 15. 중요 포인트

- 메인 앱은 컨테이너 안에서 돌기 때문에 wrapper 주소를 `127.0.0.1` 로 쓰면 안 된다.
- 메인 앱에서 wrapper를 볼 때는 `http://host.docker.internal:3101` 을 사용한다.
- PostgreSQL 비밀번호는 `docker-compose.n100.yml` 과 `.env.n100` 의 `DATABASE_URL` 이 반드시 맞아야 한다.
- wrapper를 `npm run dev` 로 띄운 터미널을 닫으면 실제 음악 생성이 바로 실패할 수 있다.
- 운영 안정성을 원하면 wrapper는 `npm run build && npm run start` 후 systemd 로 등록하는 것이 좋다.
- 외부 공개는 `3000`, `3101`, `5432` 를 직접 열기보다 `80`, `443` 만 Nginx 로 여는 것이 안전하다.
- 로컬 개발 앱이 실제 운영 wrapper 를 쓰려면 `suno.songsai.org` 같은 별도 공개 주소가 필요하다.

## 16. 사용자가 늘었을 때 확장 순서

### 1단계

- N100 한 대에 `DB + 앱 + wrapper + Nginx`

### 2단계

- wrapper를 별도 서버 또는 별도 컨테이너 스택으로 분리

### 3단계

- PostgreSQL을 별도 서버 또는 관리형 DB로 분리

### 4단계

- 영상 렌더링 워커, Redis 큐, 모니터링을 추가

## 17. 오늘 기준 완료 상태

- 메인 앱 Docker 배포 성공
- PostgreSQL 연결 성공
- Prisma 마이그레이션 성공
- Suno wrapper 3101 포트 응답 성공
- 메인 앱과 wrapper 연결 성공
- `songsai.org` 메인 앱 공개 성공
- `suno.songsai.org` 같은 wrapper 공개 구조를 추가하면 로컬 개발에서도 같은 소스로 실제 생성 테스트 가능
