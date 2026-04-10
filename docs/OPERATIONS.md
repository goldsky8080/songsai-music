# Operations

## 실행과 배포

현재 메인 앱은 Docker Compose 기반 배포를 전제로 하고 있다.

- 메인 앱 포트: `3000`
- 운영 wrapper 포트: `3101`
- 개발 wrapper 포트: `3201`
- PostgreSQL 포트: `5432`

도메인 메모:

- 메인 앱: `https://songsai.org`
- 운영 wrapper: `https://suno.songsai.org`
- 개발 wrapper: `https://dev-suno.songsai.org`

## 환경 변수 핵심

정의 위치: [`D:\music\lib\env.ts`](D:\music\lib\env.ts)

필수 또는 핵심 값:

- `DATABASE_URL`
- `AUTH_SECRET`
- `MUSIC_PROVIDER_MODE`
- `SONGS_API_BASE_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `BANK_TRANSFER_BANK_NAME`
- `BANK_TRANSFER_ACCOUNT_NUMBER`
- `SONGSAI_INTERNAL_SECRET`

호환 메모:

- 예전 `SUNO_COOKIE`, `SUNO_API_BASE_URL` 이름도 일부 호환한다.
- 현재 코드 기준 공식 이름은 `SONGS_*` 쪽이다.

## 운영에서 자주 보는 포인트

### 음악 생성

- 외부 provider 연결이 끊기면 생성이 막힌다.
- 목록 조회 시 상태 동기화가 일어나므로, 실제 장애는 API 응답과 DB 둘 다 확인해야 한다.

### 크레딧

- 크레딧은 `User` 캐시 필드와 `CreditGrant` 원장으로 같이 관리된다.
- 실패 시 환불 로직이 들어가 있으므로, `Transaction` 과 `CreditGrant` 를 함께 봐야 한다.

### 입금 요청

- 사용자는 앱에서 입금 요청만 생성한다.
- 자동 매칭과 SMS 수집은 별도 서비스가 담당한다.
- 내부 연동 보안은 `SONGSAI_INTERNAL_SECRET` 기준이다.

### 비디오

- 서버 렌더는 무겁다.
- 브라우저 렌더는 사용자 환경 영향을 받는다.
- 둘 다 이미지, 오디오, 가사 타이밍 준비 상태에 크게 의존한다.

## 운영 원칙

1. 메인 앱과 wrapper 배포는 분리한다.
2. wrapper 변경은 운영보다 개발 wrapper에서 먼저 검증한다.
3. 문서보다 실제 코드를 우선 기준으로 본다.
4. 장애 확인 시 `Music`, `GenerationJob`, `Video`, `Transaction`, `DepositRequest` 를 함께 본다.

## 지금 남아 있는 운영성 과제

- wrapper 안정성 점검
- aligned lyrics 회수 안정성 점검
- 비디오 생성 정책 고정
- 입금 자동화 실제 연결 점검
