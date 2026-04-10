# Ecosystem Overview

이 문서는 SONGSAI 관련 3개 저장소를 한 번에 파악하기 위한 중앙 문서다.

## 저장소 구성

### 1. 메인 앱

- 경로: [`D:\music`](D:\music)
- 역할:
  - 사용자 로그인
  - 크레딧
  - 음악 생성
  - 최근 생성 목록
  - 재생 / 다운로드
  - 보너스 트랙
  - 비디오 생성
  - 관리자 기능
  - 입금 요청 생성 / 승인

핵심 문서:

- [`D:\music\README.md`](D:\music\README.md)
- [`D:\music\docs\ARCHITECTURE.md`](D:\music\docs\ARCHITECTURE.md)
- [`D:\music\docs\OPERATIONS.md`](D:\music\docs\OPERATIONS.md)
- [`D:\music\docs\PROJECT_HISTORY.md`](D:\music\docs\PROJECT_HISTORY.md)

핵심 코드:

- [`D:\music\app\api\music\route.ts`](D:\music\app\api\music\route.ts)
- [`D:\music\server\music\provider.ts`](D:\music\server\music\provider.ts)
- [`D:\music\server\music\asset-storage.ts`](D:\music\server\music\asset-storage.ts)
- [`D:\music\app\api\music\[id]\video\route.ts`](D:\music\app\api\music\[id]\video\route.ts)
- [`D:\music\lib\client-video-render.ts`](D:\music\lib\client-video-render.ts)
- [`D:\music\prisma\schema.prisma`](D:\music\prisma\schema.prisma)

## 2. 입금 자동화 보조 서비스

- 경로: [`D:\songsai-bank-bridge`](D:\songsai-bank-bridge)
- 역할:
  - SMS / 알림 webhook 수신
  - 입금 문자 파싱
  - 메인 앱 입금 요청 스냅샷 동기화
  - 자동 매칭 후보 계산
  - 모니터링 대시보드

핵심 문서:

- [`D:\songsai-bank-bridge\README.md`](D:\songsai-bank-bridge\README.md)
- [`D:\songsai-bank-bridge\docs\SMS_WEBHOOK_DESIGN.md`](D:\songsai-bank-bridge\docs\SMS_WEBHOOK_DESIGN.md)
- [`D:\songsai-bank-bridge\docs\DB_SCHEMA_NOTES.md`](D:\songsai-bank-bridge\docs\DB_SCHEMA_NOTES.md)

핵심 코드:

- [`D:\songsai-bank-bridge\app\api\webhooks\sms\route.ts`](D:\songsai-bank-bridge\app\api\webhooks\sms\route.ts)
- [`D:\songsai-bank-bridge\lib\deposit-parser.ts`](D:\songsai-bank-bridge\lib\deposit-parser.ts)
- [`D:\songsai-bank-bridge\lib\matching.ts`](D:\songsai-bank-bridge\lib\matching.ts)
- [`D:\songsai-bank-bridge\app\dashboard\page.tsx`](D:\songsai-bank-bridge\app\dashboard\page.tsx)
- [`D:\songsai-bank-bridge\prisma\schema.prisma`](D:\songsai-bank-bridge\prisma\schema.prisma)

현재 상태:

- 메인 앱의 `DepositRequest` 와 연결되는 자동 매칭 보조 시스템으로 구현돼 있다.
- 최종 승인과 크레딧 지급은 여기서 하지 않고 메인 앱이 담당한다.

## 3. 외부 음악 생성 wrapper

- 경로: [`D:\wrapper\suno-api`](D:\wrapper\suno-api)
- 역할:
  - 외부 음악 생성 서비스 호출
  - 세션 유지
  - 쿠키 / 인증
  - CAPTCHA 대응
  - 상태 polling
  - aligned lyrics 조회

보조 문서:

- [`D:\wrapper\wrapper_project_handoff.md`](D:\wrapper\wrapper_project_handoff.md)
- [`D:\wrapper\suno-api\README.md`](D:\wrapper\suno-api\README.md)

핵심 코드:

- [`D:\wrapper\suno-api\src\lib\SunoApi.ts`](D:\wrapper\suno-api\src\lib\SunoApi.ts)
- [`D:\wrapper\suno-api\src\app\api\custom_generate\route.ts`](D:\wrapper\suno-api\src\app\api\custom_generate\route.ts)
- [`D:\wrapper\suno-api\src\app\api\generate\route.ts`](D:\wrapper\suno-api\src\app\api\generate\route.ts)
- [`D:\wrapper\suno-api\src\app\api\get\route.ts`](D:\wrapper\suno-api\src\app\api\get\route.ts)
- [`D:\wrapper\suno-api\src\app\api\get_aligned_lyrics\route.ts`](D:\wrapper\suno-api\src\app\api\get_aligned_lyrics\route.ts)

현재 상태:

- 단순 API 프록시가 아니라 브라우저 자동화와 CAPTCHA 우회 흐름까지 포함한 가장 민감한 계층이다.
- 운영 안정성 리스크가 가장 크게 몰리는 부분이다.

## 세 저장소의 연결 방식

### 음악 생성 흐름

1. 사용자가 `D:\music` 에서 생성 요청
2. `D:\music` 이 wrapper API 호출
3. `D:\wrapper\suno-api` 가 외부 생성 서비스와 통신
4. 결과를 `D:\music` 이 저장하고 목록/다운로드/비디오에 반영

### 입금 자동화 흐름

1. 사용자가 `D:\music` 에서 입금 요청 생성
2. `D:\songsai-bank-bridge` 가 문자 webhook 수신
3. `D:\songsai-bank-bridge` 가 메인 앱 입금 요청과 자동 매칭 시도
4. 최종 승인과 크레딧 지급은 `D:\music` 관리자에서 처리

## 현재 기준 핵심 판단

1. 제품의 본체는 `D:\music` 이다.
2. 운영 리스크는 `D:\wrapper\suno-api` 에 가장 많이 몰린다.
3. 자동화 운영 보조 축은 `D:\songsai-bank-bridge` 다.
4. 앞으로 새 세션에서 전체 시스템을 빠르게 파악할 때는 이 문서를 중앙 입구로 쓰면 된다.
