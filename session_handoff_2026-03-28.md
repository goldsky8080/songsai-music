# Session Handoff - 2026-03-28

이 문서는 2026-03-28 작업 내용을 빠르게 이어받기 위한 세션 정리 문서다.
다음에 다시 시작할 때는 이 문서부터 보고 필요한 파일로 내려가면 된다.

## 오늘 한 일

### 1. Tasker + bank-bridge 실제 연동 확인
- 안드로이드 `Tasker + AutoNotification` 에서 `songsai-bank-bridge` webhook 로 실제 알림을 보내는 흐름을 확인했다.
- webhook secret 문제(`401`)는 해결했고, 현재 로컬 secret 은 `songsai-bridge-local-secret` 이다.
- Tasker 본문에 줄바꿈이 들어오면서 JSON 이 깨지는 문제를 막기 위해 webhook 수신부를 더 유연하게 보강했다.
- `receivedAt` 값도 ISO 문자열뿐 아니라 epoch milliseconds/seconds 형태를 처리하도록 normalizer 를 보강했다.
- 실제 로그에서 `POST /api/webhooks/sms 200` 까지 확인했다.

### 2. 입금 문자 파서 보강
- `D:\songsai-bank-bridge\lib\deposit-parser.ts`
- 농협 알림처럼
  - `농협 입금5,000원 03/28 01:03 302-****-0071-01 김철권`
  - `농협 입금5,000원`
    `03/28 00:50 302-****-0071-01 박지영`
  같은 형식에서 마지막 한글 이름을 입금자명으로 읽도록 보강했다.
- 금액(`300원`)이 입금자명으로 오인식되던 문제도 수정했다.

### 3. 자동 매칭 동작 특성 확인
- 자동 매칭은 기본적으로 `문자 수신 시점` 에 실행된다.
- 따라서
  - `입금 요청 -> 문자 수신` 은 잘 맞지만
  - `문자 수신 -> 입금 요청` 순서면 자동 매칭이 놓칠 수 있다.
- 이 때문에 크레딧 충전 화면은 `입금 요청 먼저 등록 -> 계좌 안내 -> 입금` 흐름이 맞다는 점을 확인했다.

### 4. 입금 요청/계좌 안내 UX 개선
- `D:\music\app\credits\page.tsx`
- 입금 요청 성공 시 팝업으로 계좌 정보를 보여주도록 변경했다.
- 팝업 내용:
  - `NH 농협 : 352-0718-7956-63`
  - `예금주 : 박O영`
  - `30분 안으로 입금`
  - `입금 후 10분 안에 크레딧 충전`
- 계좌번호 복사 버튼 추가:
  - 화면 표시: `352-0718-7956-63`
  - 복사 값: `3520718795663`
- 요청 시간 기준 30분 카운트다운 추가
- `메인으로 돌아가기` 버튼을 상단으로 이동
- `내 입금 요청` 은 최근 3건만 표시하고, `모두보기` 별도 페이지로 분리
- 별도 페이지:
  - `D:\music\app\credits\requests\page.tsx`
  - 10건씩 페이지네이션
- 입금 요청 카드에는
  - 입금자명 강조
  - 계좌번호 표시
  - 몇 시까지 입금해야 하는지
  - 남은 시간
  을 보이도록 정리했다.

### 5. bank-bridge 대시보드 상태 동기화 보강
- 오른쪽 관리자에서 입금 요청을 승인해도, 왼쪽 `bank-bridge` 대시보드에서는 `진행중` 에 남는 문제가 있었다.
- 원인은 `DepositRequestSnapshot.requestStatus` 가 문자 수신 시점에만 갱신되어 stale 상태로 남는 점이었다.
- `songsai-music` 에 연결된 요청들의 최신 상태를 가져오는 내부 API 를 추가했다.
  - `D:\music\app\api\internal\deposits\requests\route.ts`
- `D:\songsai-bank-bridge\app\dashboard\page.tsx` 와 `D:\songsai-bank-bridge\lib\songsai-client.ts` 에서 화면 렌더 전에 최신 상태를 다시 동기화하도록 보강했다.

### 6. 다운로드 안정화
- `D:\music\app\api\music\[id]\download\route.ts`
- 다운로드 에러/0바이트 파일 문제를 줄이기 위해 다음을 추가했다.
  - upstream 응답이 실제 오디오인지 검사
  - `content-length: 0` 이면 실패 처리
  - 기존 `mp3Url` 이 실패하면 `providerTaskId` 로 최신 상태를 다시 조회
  - 최신 `mp3Url` 이 있으면 DB 를 갱신하고 재시도

### 7. 듣기 UX와 다운로드 대기시간 변경
- `D:\music\components\auth-panel.tsx`
- `D:\music\app\music-history\page.tsx`
- 새 탭 오디오 플레이어 대신 같은 화면 안에서 인라인 `<audio>` 로 재생되게 변경했다.
- 다운로드 가능 대기시간은 기존 1분 30초 수준에서 `5분` 으로 올렸다.
  - `D:\music\server\music\constants.ts`

### 8. Suno `video_url` 저장선 연결
- wrapper 쪽은 이미 `video_url` 을 받고 있었고, 메인 DB 에는 `Video` 모델이 존재했다.
- 메인 앱에서 이 값을 실제 저장하도록 연결했다.
- 수정 파일:
  - `D:\music\server\music\types.ts`
  - `D:\music\server\music\provider.ts`
  - `D:\music\app\api\music\route.ts`
  - `D:\music\server\music\service.ts`
- 단, 실제 UI 에서 `비디오 다운로드` 버튼은 `mp4Url` 이 있는 경우에만 보인다.
- 확인 결과 현재 보이던 곡들에는 실질적으로 `video_url` 이 내려오지 않아 버튼이 안 보이는 상태였다.

### 9. 방향 전환: Suno 비디오가 아니라 우리가 직접 비디오 생성
- 사용자 의도는 `Suno video_url 저장` 보다
  - `이미지 + mp3` 로 우리가 직접 mp4 를 만드는 쪽이었다.
- 그래서 비디오 생성 방향을 다음으로 정리했다:
  - 사용자가 배경 이미지를 업로드
  - 트랙별로 `비디오+100` 버튼 클릭
  - 서버가 `ffmpeg` 로 mp4 생성
  - 다운로드 제공
  - 실패 시 100크레딧 환불

### 10. 비디오 생성 1차 구현
- 비디오 생성 비용 추가:
  - `D:\music\server\music\constants.ts`
  - `VIDEO_RENDER_COST = 100`
- 크레딧 차감/환불 추가:
  - `D:\music\server\credits\service.ts`
  - `consumeVideoRenderCredits`
  - `refundVideoRenderCredits`
- 서버 렌더 유틸 추가:
  - `D:\music\server\video\render.ts`
  - `ffmpeg` 를 사용해 `이미지 + mp3 -> mp4`
- 생성 API 추가:
  - `D:\music\app\api\music\[id]\video\route.ts`
  - `multipart/form-data` 로 이미지 파일을 받아 비디오 생성
- UI 버튼 추가:
  - `D:\music\components\video-render-controls.tsx`
  - `D:\music\components\auth-panel.tsx`
  - `D:\music\app\music-history\page.tsx`
- 현재 UX:
  - `이미지선택`
  - `비디오+100`
  - 생성 후 `비디오 1`, `비디오 2`

## 빌드 / 검증 상태

### `D:\music`
- `npm run build` 통과
- 새로 추가된 `/api/music/[id]/video` 라우트도 빌드에 정상 포함됨
- 남아 있는 것은 기존 경고 1건:
  - `D:\music\app\admin\AdminPageClient.tsx`
  - `useEffect` dependency warning

### `D:\songsai-bank-bridge`
- webhook 실제 수신 `200` 확인
- 파서 보강 후 한국 은행 문자 형식 처리 개선됨

## 중요한 현재 상태

### 비디오 생성 기능
- 코드/화면/API 까지는 붙어 있음
- 하지만 현재 로컬에는 `ffmpeg` 가 설치되어 있지 않다
- 따라서 실제 비디오 생성 버튼을 누르면 `ffmpeg가 설치되어 있지 않습니다.` 에러가 날 수 있다

### 자동 매칭
- `입금 요청 먼저 -> 문자 수신` 순서가 가장 잘 맞는다
- `문자 수신 먼저 -> 입금 요청 나중` 은 자동 매칭이 놓칠 수 있다

## 다음 우선순위 추천

### 1순위
- `ffmpeg` 설치
- 로컬에서 `비디오+100` 실제 1회 테스트

### 2순위
- 비디오 생성 파일 보관 정책 구현
  - 임시 저장
  - 24시간 후 자동 삭제
  - DB 에 `expiresAt` / `deletedAt` 메타만 남길지 결정

### 3순위
- 비디오 생성 UX 다듬기
  - 생성 중 상태 표시
  - 실패 문구 정리
  - 같은 트랙에 이미 생성된 비디오가 있으면 재생성 정책 정하기

### 4순위
- 자동 매칭 재시도 로직
  - `입금 요청 생성 시` 최근 미매칭 문자와 다시 비교할지 검토

## 다음에 같이 보면 좋은 파일

### 비디오 생성 관련
- [constants.ts](/d:/music/server/music/constants.ts)
- [service.ts](/d:/music/server/credits/service.ts)
- [render.ts](/d:/music/server/video/render.ts)
- [route.ts](/d:/music/app/api/music/[id]/video/route.ts)
- [video-render-controls.tsx](/d:/music/components/video-render-controls.tsx)
- [auth-panel.tsx](/d:/music/components/auth-panel.tsx)
- [page.tsx](/d:/music/app/music-history/page.tsx)

### 입금 자동화 관련
- [route.ts](/d:/songsai-bank-bridge/app/api/webhooks/sms/route.ts)
- [deposit-parser.ts](/d:/songsai-bank-bridge/lib/deposit-parser.ts)
- [sms-normalizer.ts](/d:/songsai-bank-bridge/lib/sms-normalizer.ts)
- [page.tsx](/d:/songsai-bank-bridge/app/dashboard/page.tsx)

## 한 줄 요약

오늘은 `Tasker 실제 webhook 연동`, `입금 파서 보강`, `크레딧 충전 UX 정리`, `다운로드/듣기 안정화`, 그리고 `이미지+음악 기반 mp4 비디오 생성 1차 구현` 까지 진행했다.
다음에는 `ffmpeg 설치 후 비디오 실제 생성 검증` 이 가장 먼저다.
