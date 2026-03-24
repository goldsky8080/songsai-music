# Railway Suno Wrapper Plan

## 목적
- Vercel에서 Playwright 실행파일 문제로 막히는 `gcui-art/suno-api` wrapper를 Railway로 옮기기 위한 실전 메모
- 내일 바로 따라할 수 있게 최소 순서로 정리

## 왜 Railway로 옮기려는가
- 현재 Vercel에서는 생성 시 Playwright Chromium 실행파일이 없어서 실패
- `get_limit`는 되지만 생성은 Playwright 경로에서 죽음
- 이런 패턴은 serverless + Playwright 조합에서 자주 발생
- Railway는 일반 Node 서비스 런타임이라 Playwright/Chromium 쪽이 더 자연스럽다

## 목표 구조
- 메인 앱: Vercel 유지
- Suno wrapper: Railway 배포
- 메인 앱 `.env`
  - `SUNO_API_BASE_URL=https://railway에서받은-wrapper-주소`

## Railway 최소 순서

### 1. Railway에 새 프로젝트 생성
- Railway 로그인
- `New Project`
- `Deploy from GitHub repo`
- `gcui-art/suno-api` 또는 포크한 저장소 선택

### 2. 환경변수 넣기
기존 Vercel에 넣었던 값들과 거의 동일

필수 후보:
```env
SUNO_COOKIE=...
TWOCAPTCHA_KEY=...
BROWSER=chromium
BROWSER_GHOST_CURSOR=false
BROWSER_LOCALE=en
BROWSER_HEADLESS=true
PLAYWRIGHT_BROWSERS_PATH=0
PLAYWRIGHT_SKIP_BROWSER_GC=1
```

## 3. 빌드/실행 확인
Railway는 보통 `package.json` 기준으로 빌드/시작을 잡아줌

필요 시 확인할 것:
- Build Command
- Start Command
- Playwright/Chromium 설치 로그

## 4. 배포 후 확인
먼저 wrapper 단독 점검

확인 주소:
```txt
https://<railway-wrapper-url>/api/get_limit
```

정상이라면 JSON 응답이 나와야 함

그 다음 실제 생성 테스트
- 메인 앱에서 새 음악 생성 요청
- 또는 wrapper 쪽 생성 엔드포인트 직접 테스트

## 5. 메인 프로젝트 연결
메인 프로젝트 `.env` 수정

```env
SUNO_API_BASE_URL="https://<railway-wrapper-url>"
MUSIC_PROVIDER_MODE="suno"
```

서버 재시작 후 테스트

## 체크포인트
- `get_limit` 정상
- 실제 음악 생성 정상
- Playwright `Executable doesn't exist` 에러 사라짐

## 주의할 점
- Railway로 옮겨도 쿠키 만료, CAPTCHA, Suno 정책 변경 같은 운영 이슈는 남아있을 수 있음
- 하지만 현재 Vercel에서 나는 `Chromium 실행파일 없음` 문제는 크게 줄어들 가능성이 높음

## 내일 바로 할 일
1. Railway에 wrapper 배포
2. env 입력
3. wrapper URL 확보
4. 메인 프로젝트 `.env` 연결
5. 실제 생성 재테스트
