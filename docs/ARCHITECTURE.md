# Architecture

## 한 줄 요약

이 프로젝트는 "크레딧을 사용해 음악을 생성하고, 결과물을 자산화해서 재생·다운로드·비디오 생성까지 이어주는" 메인 서비스다.

## 기술 스택

- Next.js 15
- React 19
- Prisma
- PostgreSQL
- Zod
- ffmpeg / ffmpeg.wasm

## 앱 구조

### 1. 메인 앱 `D:\music`

사용자가 직접 접속하는 서비스다.

- 홈/생성 UI: [`D:\music\app\page.tsx`](D:\music\app\page.tsx)
- 생성 폼과 최근 음악 UI: [`D:\music\components\auth-panel.tsx`](D:\music\components\auth-panel.tsx)
- 음악 API: [`D:\music\app\api\music\route.ts`](D:\music\app\api\music\route.ts)
- 비디오 API: [`D:\music\app\api\music\[id]\video\route.ts`](D:\music\app\api\music\[id]\video\route.ts)

### 2. 외부 음악 생성 계층

메인 앱은 provider 인터페이스를 통해 외부 생성기를 호출한다.

- provider 인터페이스와 SONGS 구현: [`D:\music\server\music\provider.ts`](D:\music\server\music\provider.ts)
- 현재 환경 변수 이름은 `SONGS_*` 를 기준으로 읽고, 예전 `SUNO_*` 이름도 일부 호환한다: [`D:\music\lib\env.ts`](D:\music\lib\env.ts)

실제 운영상 불안정성은 이 구간에 가장 많이 몰린다.

- 세션 유지
- CAPTCHA
- 결과 회수
- aligned lyrics 회수

### 3. 입금 자동화 보조 계층

이 저장소 안에는 입금 요청 생성과 내부 API가 있고, 실제 SMS 수집/자동 매칭 시스템은 별도 저장소에서 담당한다.

- 사용자 입금 요청: [`D:\music\app\api\deposits\route.ts`](D:\music\app\api\deposits\route.ts)
- 내부 조회 API: [`D:\music\app\api\internal\deposits\requests\route.ts`](D:\music\app\api\internal\deposits\requests\route.ts)

## 핵심 도메인 모델

스키마 기준 중심 엔티티는 아래다: [`D:\music\prisma\schema.prisma`](D:\music\prisma\schema.prisma)

- `User`: 인증, 권한, 크레딧 캐시
- `CreditGrant`: 실제 사용 가능한 크레딧 원장
- `Transaction`: 입금/사용/환불/조정 로그
- `Music`: 생성된 곡
- `MusicAsset`: mp3, 커버 이미지, 가사 정렬 데이터, 제목 텍스트
- `Video`: 비디오 생성 결과
- `GenerationJob`: 음악/비디오 비동기 작업 기록
- `DepositRequest`: 무통장 입금 요청
- `Coupon`, `CouponRedemption`: 무료 쿠폰

## 실제 흐름

### 음악 생성

1. 사용자가 생성 폼에서 제목, 가사 모드, 스타일, 보컬, 모델 버전을 입력한다.
2. `POST /api/music` 가 `Music` 과 `GenerationJob` 을 만들고 크레딧을 차감한다.
3. provider 가 외부 생성 API를 호출한다.
4. 결과 상태는 목록 조회 시 `syncMusicStatuses()` 로 보정된다.
5. 생성 결과는 최근 음악 목록에 그룹 단위로 표시된다.

### 재생 / 다운로드

1. 완료된 트랙은 mp3 URL 또는 저장 자산을 기준으로 재생/다운로드한다.
2. 초기 다운로드 지연 정책이 있다.
3. 보너스 트랙은 숨김 상태로 생성될 수 있고, 추가 크레딧으로 열 수 있다.

### 자산화

자산 저장 로직은 [`D:\music\server\music\asset-storage.ts`](D:\music\server\music\asset-storage.ts) 에 있다.

저장 대상:

- MP3
- COVER_IMAGE
- ALIGNED_LYRICS_RAW_JSON
- ALIGNED_LYRICS_LINES_JSON
- TITLE_TEXT

이 자산화 계층이 재생, 다운로드, 비디오 생성의 공통 기반이다.

### 비디오 생성

비디오 생성은 두 축이 있다.

- 서버 렌더 API 흐름: [`D:\music\app\api\music\[id]\video\route.ts`](D:\music\app\api\music\[id]\video\route.ts)
- 브라우저 렌더 구현: [`D:\music\lib\client-video-render.ts`](D:\music\lib\client-video-render.ts)

현재 구조상 커버 이미지, 오디오, 정렬된 가사 라인이 준비되어야 자막 비디오 품질이 올라간다.

## 현재 기준 기능 요약

- Google 로그인
- 관리자 권한
- 무료/유료 크레딧
- 쿠폰
- 입금 요청 생성
- 수동 가사 / AI 가사 / 자동 생성 모드
- 모델 버전 선택
- MR 모드
- 최근 음악 목록
- 트랙 재생/다운로드
- 보너스 트랙 열기
- 비디오 생성

## 현재 리스크

- 외부 wrapper 또는 SONGS API 변경에 취약하다.
- 비디오 생성은 아직 운영 정책과 품질 기준이 완전히 굳지 않았다.
- 문서보다 코드가 더 최신인 구간이 있었기 때문에, 이후 문서는 이 파일 기준으로 유지하는 것이 좋다.
