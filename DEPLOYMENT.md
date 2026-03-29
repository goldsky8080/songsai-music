# DEPLOYMENT

## 현재 권장 구조

- 메인 앱: Docker Compose
- PostgreSQL: Docker Compose
- 운영 wrapper: 별도 디렉터리 + 직접 실행 / systemd
- Nginx: 외부 리버스 프록시

## 포트 기준

- 메인 앱: `3000`
- 운영 wrapper: `3101`
- 테스트 wrapper: `3201`
- PostgreSQL: `5432`

## 운영 도메인

- 메인 앱: `https://songsai.org`
- 운영 wrapper: `https://suno.songsai.org`
- 테스트 wrapper: `https://dev-suno.songsai.org`

## 운영 반영 원칙

- 메인 앱 배포와 wrapper 배포는 분리
- 실험성 변경은 먼저 `dev-suno` 에서 검증
- 운영 반영 전 반복 테스트와 로그 확인 우선

## 자주 쓰는 서버 절차

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
