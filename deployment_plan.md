# 배포 계획서

## 1. 문서 목적
- 현재 `music` 프로젝트를 어떤 방식으로 배포할지 정리한다.
- 지금 당장 가장 현실적인 배포 방식과 이유를 설명한다.
- 이후 사용자가 늘어났을 때 어떤 순서로 구조를 확장할지 단계별로 정리한다.

## 2. 현재 상황 요약

### 현재 프로젝트 구성
- 메인 서비스: `Next.js + Prisma + PostgreSQL`
- 인증: 이메일/비밀번호 + 세션 쿠키
- 크레딧 구조:
  - 무료 크레딧
  - 유료 크레딧
- 음악 생성:
  - Suno 비공식 wrapper 연동
  - `1곡 / 2곡` 선택 가능
  - `v4.5+ / v5` 선택 가능
  - 보컬 선택 가능
  - 다운로드 API 구현됨

### 지금 막힌 핵심 문제
- `gcui-art/suno-api` wrapper는 `Playwright/Chromium` 실행 환경이 필요하다.
- Vercel에서는 생성 요청 시 `Executable doesn't exist` 에러가 발생했다.
- Railway trial에서는 이미지 크기 제한(`4GB`)에 걸렸다.
- 즉, 현재 wrapper는 `serverless` 환경보다 `항상 켜져 있는 리눅스 서버`에 더 잘 맞는다.

## 3. 현재 가장 추천하는 배포 방식

### 추천 구조
- `N100 리눅스 서버` 1대에 아래를 함께 배포
  - PostgreSQL
  - 메인 Next.js 앱
  - Suno wrapper (`gcui-art/suno-api`)
  - Nginx 리버스 프록시

### 이 구조를 추천하는 이유
- 비용이 적게 든다.
- 현재 프로젝트 규모에서는 충분히 운영 가능하다.
- Playwright/Chromium 실행 환경을 직접 통제할 수 있다.
- Vercel/Railway 제약을 피할 수 있다.
- SSH로 직접 관리할 수 있어서 디버깅이 쉽다.

## 4. 권장 서버 구성

### 프로세스 구성
- PostgreSQL
- 메인 앱: `Next.js`
- Suno wrapper: `gcui-art/suno-api`
- Nginx
- 프로세스 매니저: `pm2` 또는 `systemd`

### 권장 포트 예시
- Next.js 앱: `3000`
- Suno wrapper: `3001`
- PostgreSQL: `5432`  
  주의: 외부 공개하지 말고 내부에서만 사용 권장

### 도메인 구성 예시
- `app.example.com` -> Next.js 앱
- `suno.example.com` -> Suno wrapper

## 5. 현재 단계 배포 전략

### 5-1. 1차 목표
- 메인 프로젝트 정상 서비스
- Suno wrapper 정상 생성
- PostgreSQL 영구 저장
- HTTPS 연결

### 5-2. 현재 단계에서의 현실적인 운영 방식
- 단일 서버 운영
- 장애 시 수동 대응
- 로그 확인 중심 운영
- 사용자 수가 많지 않은 전제

## 6. 단일 서버 배포 구조 상세

### 구조 개요
```txt
사용자 브라우저
  -> Nginx (80/443)
    -> Next.js app (3000)
    -> Suno wrapper (3001)

Next.js app
  -> PostgreSQL (5432)
  -> Suno wrapper (3001)
```

### 장점
- 단순함
- 배포/운영/백업 경로가 명확함
- 디버깅이 쉬움
- 초기 검증 단계에 적합함

### 단점
- 한 서버 장애 시 전체 서비스 영향
- CPU/메모리 자원 경쟁 가능
- Suno wrapper가 Playwright를 사용할 때 순간 부하가 커질 수 있음

## 7. 실제 권장 배포 순서

### 1단계. N100 서버 기본 세팅
- Ubuntu 또는 Debian 계열 권장
- SSH 접속 확인
- 방화벽 설정
- 도메인/포트포워딩 준비

### 2단계. 공통 런타임 설치
- Node.js LTS
- npm
- git
- nginx
- PostgreSQL
- Chromium/Playwright 실행에 필요한 리눅스 패키지

### 3단계. PostgreSQL 세팅
- 데이터베이스 생성
- 사용자 계정 생성
- 메인 프로젝트용 `DATABASE_URL` 발급
- 외부 포트 공개는 최소화

### 4단계. Suno wrapper 배포
- `gcui-art/suno-api` 클론
- `.env` 구성
- `npm install`
- `npx playwright install chromium`
- 서비스 실행

### 5단계. 메인 프로젝트 배포
- 현재 `music` 프로젝트 클론
- `.env` 구성
- `npm install`
- `npx prisma migrate deploy`
- `npm run build`
- `npm run start`

### 6단계. Nginx 연결
- `app.example.com` -> `localhost:3000`
- `suno.example.com` -> `localhost:3001`
- HTTPS 설정 (`Let's Encrypt`)

### 7단계. 테스트
- 로그인
- 회원가입
- 음악 생성
- Suno wrapper 연결
- 다운로드 동작
- 크레딧 차감/환불 확인

## 8. 환경변수 정리

### 8-1. 메인 프로젝트
```env
DATABASE_URL=postgresql://...
AUTH_SECRET=...
MUSIC_PROVIDER_MODE=suno
SUNO_API_BASE_URL=https://suno.example.com
```

### 8-2. Suno wrapper
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

## 9. 운영 시 꼭 필요한 보조 설정

### 로그
- 앱 로그 저장
- wrapper 로그 저장
- nginx access/error 로그 저장

### 자동 재시작
- `pm2` 또는 `systemd`로 앱과 wrapper 자동 재시작

### 백업
- PostgreSQL 정기 백업
- `.env` 별도 안전 보관
- 업로드 파일/산출물 경로 백업 검토

### 보안
- `.env`는 절대 git 커밋 금지
- PostgreSQL 외부 공개 최소화
- SSH 비밀번호보다 키 인증 권장
- 관리자 계정 분리 권장

## 10. 추후 사용자가 늘어났을 때 확장 계획

현재는 단일 서버 구조가 맞지만, 사용자가 늘면 순서대로 분리하는 것이 좋다.

## 11. 확장 1단계: 서버 유지 + 운영 안정화

### 기준
- 내부 테스트를 넘어 실제 사용자 유입 시작
- 생성 요청이 꾸준히 발생

### 해야 할 일
- `pm2` 또는 `systemd` 확실히 적용
- Nginx 리버스 프록시 정식 운영
- SSL 적용
- 장애 대응 로그 정리
- PostgreSQL 자동 백업

### 이 단계 목표
- 현재 구조를 유지하면서 운영 품질을 높이는 것

## 12. 확장 2단계: DB 분리

### 기준
- 앱과 DB가 같은 서버에서 자원 경쟁 시작
- 백업과 복구 중요도 상승

### 해야 할 일
- PostgreSQL을 별도 서버 또는 관리형 DB로 분리
- 메인 앱/Wrapper는 기존 서버 유지 가능

### 이유
- DB는 데이터 안정성이 가장 중요하다.
- 가장 먼저 분리할 가치가 큰 컴포넌트가 DB다.

## 13. 확장 3단계: Suno wrapper 분리

### 기준
- 음악 생성 요청이 많아짐
- Playwright 프로세스가 CPU/메모리를 많이 사용함
- 메인 앱 응답이 느려지기 시작함

### 해야 할 일
- Suno wrapper를 별도 서버로 이동
- 메인 앱 서버와 분리
- wrapper 전용 도메인 유지

### 이유
- wrapper는 가장 불안정하고 리소스 사용량도 튈 가능성이 크다.
- 앱과 분리하면 메인 서비스 안정성이 크게 올라간다.

## 14. 확장 4단계: 메인 앱과 워커 분리

### 기준
- 생성 작업, 상태 갱신, 후처리 작업이 많아짐
- 영상 렌더링 기능까지 붙기 시작함

### 해야 할 일
- 메인 웹 서버
- 백그라운드 워커
- 큐(redis/bullmq)
로 분리

### 구조 예시
```txt
Web App Server
Worker Server
PostgreSQL
Redis
Suno Wrapper Server
```

## 15. 확장 5단계: CDN / 스토리지 분리

### 기준
- MP3/MP4 다운로드 트래픽 증가
- 서버 디스크 사용량 증가

### 해야 할 일
- S3 호환 스토리지 또는 오브젝트 스토리지 사용
- 다운로드 파일은 스토리지에서 직접 제공
- 앱 서버는 메타데이터만 관리

## 16. 장기적으로 추천하는 최종 구조

### 추천 구조
- Web App Server
- Worker Server
- PostgreSQL (관리형 또는 별도 서버)
- Redis
- Suno Wrapper Server
- Object Storage
- Nginx / Load Balancer

### 이유
- 역할이 분리되어 장애 영향이 줄어듦
- 확장이 쉬움
- 운영 안정성이 높아짐

## 17. 지금 당장 결론

### 지금 가장 적합한 방식
- `N100 리눅스 서버 1대`에
  - PostgreSQL
  - 메인 앱
  - Suno wrapper
  - Nginx
를 함께 올리는 구조로 시작

### 왜 지금은 이게 맞는가
- 초기 서비스 검증 단계
- 비용 절감
- Playwright 환경 통제 가능
- Vercel/Railway 제약 회피 가능

## 18. 다음 작업 추천 순서

1. N100 서버에 기본 런타임 설치
2. PostgreSQL 구축
3. Suno wrapper 먼저 올리기
4. wrapper 단독 테스트
5. 메인 프로젝트 배포
6. `.env`에서 `SUNO_API_BASE_URL` 연결
7. Nginx + 도메인 + HTTPS 연결
8. 실제 생성/다운로드 테스트

## 19. 마지막 메모
- 현재 이 프로젝트는 기능적으로는 꽤 많이 진행됨
- 지금 가장 큰 병목은 코드보다 `배포 환경`이다
- 따라서 다음 단계에서는 새 기능 추가보다 `N100 서버 기준 실제 운영 환경 구성`을 먼저 끝내는 것이 가장 중요하다
