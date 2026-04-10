# Project History

이 문서는 삭제된 handoff / 계획 / 진행 메모를 git 기록에서 다시 읽어 재구성한 이력 문서다.
즉, 현재 남아 있지 않은 예전 `.md` 파일들의 핵심 내용을 한 군데에 다시 정리한 것이다.

## 한눈에 보는 흐름

- 2026-03-24: 메인 앱 초기 구현
- 2026-03-24 ~ 2026-03-25: 배포 구조와 wrapper 운용 메모 정리
- 2026-03-26: 관리자, 쿠폰, Google 로그인, 보너스곡, SONGS 리브랜딩, bank-bridge 설계/초기 연동
- 2026-03-28 ~ 2026-03-29: 입금 요청/자동 매칭 UX, 다운로드 안정화, 서버 비디오 생성 도입
- 2026-03-29 ~ 2026-03-30: aligned lyrics, MR 모드, 비디오 비동기화, OAuth 안정화
- 2026-04-01: `MusicAsset` 기반 자산 저장과 브라우저 비디오 렌더 실험 도입
- 2026-04-03: 문서 통합, 홈/다운로드 흐름 정리

## 1. 시작 단계

### 2026-03-24 `Initial music platform implementation`

초기 커밋 [`96065e8`](96065e8) 에서 메인 서비스의 뼈대가 들어왔다.

주요 내용:

- 인증 API
- 사용자/크레딧/음악 관련 Prisma 스키마
- 음악 생성 API
- 최근 생성 목록 UI
- 다운로드 API
- provider 연동 구조

이 시점의 프로젝트 성격은 "기본적인 음악 생성 SaaS 프로토타입"에 가까웠다.

### 같은 날의 배포/문서 정리

이후 연속 커밋에서 아래가 빠르게 붙었다.

- 배포 문서
- N100 서버 배포 자산
- Dockerfile 보정
- HTTP 환경 쿠키 수정
- wrapper 환경 설정 메모
- auto lyrics / Suno 관련 진행 메모

즉 초기 구현 직후부터 기능 개발과 운영 정리가 동시에 진행됐다.

## 2. 제품 기능 확장 구간

### 2026-03-26 `Add admin, coupons, and docs cleanup`

커밋 [`4e717cf`](4e717cf) 에서 서비스가 "단순 생성기"에서 "운영 가능한 제품" 쪽으로 한 단계 확장됐다.

추가된 축:

- 관리자 페이지
- 사용자 관리 API
- Google OAuth 경로
- 쿠폰 발급/사용
- 보너스 트랙 언락
- 음악/크레딧 UI 확장

이 무렵의 handoff 에 따르면, 관리자 화면은 검색 기반으로 재구성됐고 입금 요청 페이지도 분리되는 방향이 잡혔다.

### 2026-03-26 `Rebrand provider to SONGS API`

커밋 [`1feaf2a`](1feaf2a) 에서 용어와 설정이 Suno 중심에서 SONGS API 중심으로 재정리됐다.

핵심 변화:

- `.env` 와 배포 예시 파일 이름 정리
- 코드 내부 provider 표현 정리
- 예전 Suno 네이밍을 SONGS 네이밍으로 전환

다만 실제 운영 메모를 보면, 외부 생성 안정성 리스크 자체는 계속 wrapper/세션/CAPTCHA 쪽에 남아 있었다.

## 3. 운영 자동화와 결제 흐름 확장

### 2026-03-26 handoff 기준

삭제된 `session_handoff_2026-03-26.md` 를 보면 이 날은 기능보다 운영 체계가 크게 넓어진 날이었다.

핵심 내용:

- 운영 DB 초기화와 Prisma 마이그레이션
- Google 로그인 운영 반영
- 관리자 계정 정리
- `D:\songsai-bank-bridge` 별도 프로젝트 시작
- SMS webhook 수신, 문자 파싱, 자동 매칭, 관리자 승인 흐름 검증
- 관리자/입금 관리 UI 개편

이 시점부터 프로젝트는 단순 음악 생성 앱이 아니라,
"크레딧 충전 운영을 포함한 서비스" 구조로 커졌다.

### 입금 자동화 설계 문서의 핵심

삭제된 `deposit_integration_design.md` 내용과 현재 코드가 잘 맞는다.

그때 정리된 방향:

- 메인 앱은 `DepositRequest` 를 가진다
- bank-bridge 는 SMS/알림을 받아 자동 매칭 후보를 만든다
- 최종 승인과 크레딧 지급은 메인 앱 관리자에서 처리한다
- 내부 API 로 `pending`, `mark-auto-matched`, 상태 동기화를 지원한다

이 설계는 현재 [`D:\music\app\api\deposits\route.ts`](D:\music\app\api\deposits\route.ts), [`D:\music\app\api\internal\deposits\requests\route.ts`](D:\music\app\api\internal\deposits\requests\route.ts), [`D:\music\prisma\schema.prisma`](D:\music\prisma\schema.prisma) 에 실제로 반영되어 있다.

## 4. 다운로드와 비디오 기능이 커진 구간

### 2026-03-28 ~ 2026-03-29 `Add deposits flow and improve music download/video UX`

커밋 [`efb0463`](efb0463) 은 프로젝트 확장 폭이 가장 큰 커밋 중 하나다.

추가/변경된 흐름:

- 입금 요청 API와 관리자 승인/반려 API
- 내부 입금 자동화 API
- 크레딧 충전 화면 개선
- 요청 목록 화면 추가
- 다운로드 안정화
- 가사 txt API 추가
- 비디오 생성 API와 UI 추가
- 관리자 입금 관리 UI 고도화

삭제된 `session_handoff_2026-03-28.md` 기준으로 당시 실제 작업 흐름은 아래와 같았다.

- Tasker + AutoNotification 과 bank-bridge webhook 실제 연동
- 한국 은행 입금 문자 파서 보강
- 계좌 안내 팝업, 복사 버튼, 30분 카운트다운 등 충전 UX 개선
- `다운로드` 0바이트/실패 대응 강화
- 같은 화면 안 `<audio>` 재생 도입
- 다운로드 가능 대기시간을 5분으로 상향
- "이미지 + mp3 -> mp4" 서버 렌더 비디오 생성 1차 구현

이 시기의 핵심 판단은 분명했다.

- 입금은 "요청 먼저, 입금 나중" 흐름이 맞다
- 비디오는 일단 서버 렌더로 붙이되, 운영 부담은 앞으로 더 검토해야 한다

## 5. 품질 보강과 실험이 많아진 구간

### 2026-03-29 handoff 기준

삭제된 `session_handoff_2026-03-29.md` 에서 보이는 변화:

- stale cookie 영향 완화
- 듣기와 다운로드 경로 보강
- 실제 가사 기반 txt 다운로드 보강
- auto 곡 제목 표시 개선
- Suno 커버 이미지 기반 비디오 생성 고도화
- 세로형 `9:16`, Ken Burns 스타일 실험
- 자막 비디오를 시도했다가 품질 문제로 원복

또한 wrapper 쪽에서는 GUI 세션이 필수이고, headed Chromium 자동화가 운영상 까다롭다는 점이 다시 확인됐다.

### 2026-03-29 `Add aligned lyric videos and MR generation mode`

커밋 [`c405e3c`](c405e3c) 에서 다음이 더 명확해졌다.

- aligned lyrics API
- MR 생성 모드
- 비디오 생성 흐름 확장
- 새 문서 체계 초안

이 시점부터 프로젝트는 "단순 오디오 생성"보다 "음악 자산을 더 많이 활용하는 후처리 서비스" 쪽으로 이동하기 시작했다.

### 2026-03-30 연속 커밋

이 날 여러 커밋이 몰려 있다.

- [`24e29f5`](24e29f5): 비디오 렌더 비동기화, 가사 txt 인코딩 수정
- [`e56c258`](e56c258): 비디오 렌더 polling loop 수정
- [`ff79b8d`](ff79b8d): MR 트랙 저장, MR 자막 비활성화
- [`9f49fee`](9f49fee), [`710c307`](710c307): Google OAuth state/로그 강화
- [`86ea95e`](86ea95e), [`cd6bacf`](cd6bacf): 렌더된 비디오 다운로드 서빙 정리

즉, 비디오 기능이 "붙었다" 수준을 넘어 실제 운영 가능한 흐름으로 다듬어지기 시작한 날이다.

## 6. `MusicAsset` 중심 구조로 전환

### 2026-04-01 `Add music asset caching and browser video rendering`

커밋 [`bd44848`](bd44848) 이 현재 구조를 이해하는 데 가장 중요하다.

핵심 전환:

- `MusicAsset` 스키마와 저장 로직 도입
- 자산 준비 API 추가
- asset 조회 API 추가
- client video assets API 추가
- 브라우저 렌더 구현 추가
- `ffmpeg.wasm` 기반 브라우저 비디오 생성 실험 시작

삭제된 `session_handoff_2026-03-30.md` 내용과 합치면, 이때 방향이 꽤 크게 바뀌었다.

이전:

- 생성 직후 서버가 많은 일을 처리
- 서버 ffmpeg 렌더가 무겁고 불안정

이후:

- 오디오/이미지/가사 타이밍을 `MusicAsset` 으로 저장
- 사용자가 실제로 듣기/다운로드/비디오를 할 때 재료를 준비
- 비디오는 브라우저 Canvas + `MediaRecorder` + `ffmpeg.wasm` 흐름으로 이동

이 전환은 지금도 프로젝트의 가장 중요한 구조적 특징이다.

## 7. 최근 정리 단계

### 2026-04-03 `Consolidate docs and polish home and download flow`

커밋 [`e3f6ed9`](e3f6ed9) 에서 문서 정리와 홈/다운로드 UX 보강이 있었다.

이 커밋과 현재 문서 정리까지 포함하면, 지금 프로젝트는 다음 상태로 보는 것이 맞다.

- 메인 기능은 모두 `D:\music` 안에 있다
- 외부 생성 리스크는 여전히 wrapper/provider 쪽이 크다
- 결제 운영은 `DepositRequest` 와 bank-bridge 연동을 전제로 한다
- 비디오 생성은 자산화와 브라우저 렌더 쪽으로 진화했다
- 문서는 현재 상태 중심으로 최소 세트만 남기고, 과거 기록은 이 문서로 흡수했다

## 현재까지의 큰 의사결정 요약

1. 인증은 Google 로그인 중심으로 정리한다.
2. 크레딧은 무료/유료 원장 기반으로 관리한다.
3. 외부 생성 provider 네이밍은 SONGS 기준으로 맞춘다.
4. 입금 자동화는 메인 앱과 bank-bridge 의 역할을 분리한다.
5. 보너스 트랙과 비디오 같은 후처리 기능은 별도 비용 정책으로 간다.
6. 음악 결과물은 `MusicAsset` 으로 자산화해 재사용한다.
7. 비디오는 서버 렌더만 고집하지 않고 브라우저 렌더도 적극 실험한다.

## 삭제된 문서들이 다루고 있던 주제

이번에 삭제된 문서들은 아래 주제를 반복해서 다루고 있었다.

- handoff / 세션 기록
- 배포 절차와 서버 메모
- wrapper 안정화와 CAPTCHA
- auto lyrics 실험
- 관리자/입금 자동화 설계
- 비디오 생성 실험
- 홈/브랜딩 리디자인 구상

즉 "주제는 많았지만 서로 겹치는 기록"이 많았고,
현재는 이 문서가 그 이력의 압축본 역할을 한다.

## 같이 볼 문서

- 현재 상태 요약: [`D:\music\README.md`](D:\music\README.md)
- 구조 설명: [`D:\music\docs\ARCHITECTURE.md`](D:\music\docs\ARCHITECTURE.md)
- 운영 메모: [`D:\music\docs\OPERATIONS.md`](D:\music\docs\OPERATIONS.md)
