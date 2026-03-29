# Session Handoff - 2026-03-30

## 오늘 한 일

- `D:\music` 운영 배포를 여러 차례 진행했다.
- Google OAuth 콜백 디버그 로그를 추가해 운영 로그인 문제를 추적했다.
- `Music.isMr` 컬럼을 추가하는 마이그레이션을 운영 DB에 적용했다.
- 비디오 다운로드를 정적 `/generated-videos/...` 링크가 아니라 API 다운로드 방식으로 바꿨다.
- MR 곡은 `isMr=true` 로 저장하고, 비디오 생성 팝업에서 `가사 표시` 를 비활성화하도록 반영했다.
- 가사 txt 다운로드는 모바일에서 깨지지 않도록 UTF-8 BOM 포함으로 보강했다.

## 운영에서 확인된 결론

### 1. 로그인 문제

- 운영 로그인 문제는 OAuth 설정 자체보다는 DB 컬럼 불일치가 본체였다.
- 디버그 로그 기준으로 OAuth 흐름은 아래 순서로 정상 동작했다.
  - `[auth/google] oauth start`
  - `[auth/google/callback] received`
  - `[auth/google/callback] login success`
- 그 다음 `/api/music` 조회에서 `Music.isMr` 컬럼 없음으로 500이 났다.
- 운영 DB에 마이그레이션 적용 후 이 문제는 해결되었다.

### 2. 비디오 504 문제

- 운영에서는 비디오 렌더링을 HTTP 요청 안에서 끝내려 하면 Cloudflare `504 Gateway Timeout` 이 발생했다.
- 그래서 `/api/music/[id]/video` 는 바로 `202` 로 접수 응답을 하고, 프론트는 polling 하도록 바꿨다.

### 3. 비디오가 계속 PROCESSING 인 문제

- 운영 Network 응답에서 아래 상태를 직접 확인했다.
  - `status: "PROCESSING"`
  - `mp4Url: null`
  - `errorMessage: null`
- 이는 "접수는 되었지만 실제 렌더 작업이 끝나지 않고 있다" 는 뜻이다.
- 현재 구조는 Next 요청 핸들러 안에서 `void processVideoRender(...)` 를 던지는 형태라, 운영에서 안정적인 background worker처럼 동작한다고 보장할 수 없다.
- 따라서 비디오 생성은 앞으로 **DB 큐 + 별도 worker 프로세스** 구조로 바꾸는 것이 맞다.

### 4. html 다운로드 문제

- 완료된 비디오를 받을 때 `.mp4` 대신 `.html` 이 저장되는 문제가 있었다.
- 원인은 정적 `/generated-videos/...` URL을 직접 열면서 HTML 에러 페이지를 받았기 때문이다.
- 해결 방향:
  - `/api/music/[id]/video-file?videoId=...` API로 스트리밍 다운로드
  - 프론트 `비디오 1` 버튼과 자동 다운로드 모두 이 API를 사용

## 코드 기준 현재 상태

### 비디오 생성

- 생성 요청은 비동기 접수형이다.
- 프론트는 `video?videoId=...` 를 polling 한다.
- `PROCESSING -> COMPLETED` 로 바뀌면 자동 다운로드를 시도한다.
- 다만 운영에서는 아직 worker가 없어 일부 작업이 `PROCESSING` 에 머문다.

### 비디오 다운로드

- 새 다운로드 API 추가 완료:
  - `app/api/music/[id]/video-file/route.ts`
- 프론트도 새 API를 사용하도록 변경 완료:
  - `components/video-render-controls.tsx`
  - `components/track-download-menu.tsx`
  - `app/api/music/route.ts`

### 자막 / 제목

- 가사 자막은 aligned lyrics 가 있는 곡만 정확 타이밍으로 생성한다.
- 제목 표시와 가사 표시 옵션은 비디오 생성 UI에서 체크박스로 제어한다.
- MR 곡은 `가사 표시` 를 사용할 수 없다.

## 아직 남은 핵심 문제

### 1. 비디오 worker 부재

- 현재 가장 큰 운영 리스크다.
- 접수형 API까진 되었지만, 장시간 ffmpeg 렌더를 안정적으로 끝내는 별도 실행 주체가 없다.
- 사용자가 늘어나면 지금 구조로는 운영이 어렵다.

### 2. 새 완료 비디오와 버튼 연결

- `비디오 1` 버튼이 예전 완료본을 가리킬 수 있는 문제를 로컬에서 수정했다.
- 이 수정은 아직 운영 반영 확인이 필요하다.

### 3. 자막 없는 곡 처리

- aligned lyrics 가 없는 곡은 현재 정확 타이밍 자막 비디오를 만들 수 없다.
- 이건 정상 동작이지만, 사용자 안내 문구를 더 친절하게 다듬을 여지가 있다.

## 다음 세션에서 바로 할 일

1. 비디오 `PROCESSING` 상태를 실제로 끝내는 **worker 구조 설계 및 구현**
2. worker 없이도 최소한 수동/주기 실행으로 완료시킬 수 있는 임시 실행 경로가 필요한지 검토
3. `비디오 1` 버튼이 항상 방금 완료된 비디오를 가리키는지 운영에서 최종 확인
4. 필요하면 비디오 생성 UX를 `즉시 다운로드` 가 아니라 `생성 요청 후 완료본 다운로드` 중심으로 다시 정리

## 관련 커밋 메모

- `86ea95e` Serve rendered videos via API downloads
- `710c307` Add OAuth debug logging
- `ff79b8d` Persist MR tracks and disable lyric subtitles for them
- `e56c258` Fix video render polling loop

## 한 줄 결론

- 로그인은 해결됐다.
- DB 마이그레이션도 정리됐다.
- 비디오 다운로드 경로 문제도 수정했다.
- 지금 남은 진짜 큰 문제는 **운영용 비디오 worker 부재**다.
