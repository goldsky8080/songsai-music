## songs-api dev 운영 반영 메모

### FTP로 올릴 파일
- `D:\wrapper\suno-api\src\lib\SunoApi.ts`
- `D:\wrapper\suno-api\.env.example`

### 운영 서버 반영 위치
- `~/services/suno-api-dev/src/lib/SunoApi.ts`
- `~/services/suno-api-dev/.env.local`

### 서버 `.env.local` 에 추가할 값
```env
BROWSER=chromium
BROWSER_HEADLESS=false
BROWSER_MANUAL_CAPTCHA=true
BROWSER_MANUAL_CAPTCHA_TIMEOUT_MS=300000
BROWSER_PROFILE_DIR=/home/young/.config/google-chrome
```

### 운영 서버 접속
```bash
ssh -p 2233 young@211.247.107.135
```

### dev 프로젝트 이동
```bash
cd ~/services/suno-api-dev
```

### 기존 dev 프로세스 종료
```bash
pkill -f "next dev"
```

### dev 재실행
```bash
cd ~/services/suno-api-dev
nohup env PORT=3201 npm run dev > dev.log 2>&1 &
```

### 로그 확인
```bash
tail -f dev.log
```

### 기대 로그
- `CAPTCHA required. Launching browser...`
- `Launching persistent browser context`
- `Manual CAPTCHA mode enabled. Solve the challenge in the opened browser window.`

### 기대 동작
1. 생성 요청이 들어오면 서버 데스크탑에 브라우저 창이 뜬다.
2. 같은 프로필로 Suno 로그인 상태가 유지된다.
3. CAPTCHA가 뜨면 직접 해결한다.
4. wrapper가 토큰을 잡고 생성을 이어간다.

### 주의
- 서버 데스크탑에서 기존 Chrome이 같은 프로필을 이미 사용 중이면 충돌할 수 있다.
- 충돌 시 기존 Chrome을 닫고 테스트하거나, 전용 복사 프로필을 따로 만들어 사용한다.

### 전용 프로필 복사 예시
```bash
cp -r /home/young/.config/google-chrome /home/young/.config/google-chrome-songsai
```

전용 프로필 사용 시 `.env.local`:
```env
BROWSER_PROFILE_DIR=/home/young/.config/google-chrome-songsai
```
