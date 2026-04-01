# Session Handoff - 2026-03-30

## 오늘 정리된 큰 흐름

- `D:\music` 기준으로 비디오 생성 방향을 **서버 렌더 중심**에서 **클라이언트 브라우저 렌더 실험** 쪽으로 크게 전환했다.
- 음악 생성은 다시 **기존처럼 가벼운 비동기 방식**으로 유지하고, 생성 직후에 무거운 자산 저장을 하지 않도록 되돌렸다.
- 대신 사용자가 실제로 `다운로드 n` 팝업을 열거나 오디오 다운로드/듣기를 할 때, 필요한 자산을 서버에 준비하고 `MusicAsset` 으로 기록하는 구조로 정리했다.
- 현재는 **오디오(mp3) 자산 저장/재생/다운로드는 잘 동작**하는 상태를 확인했다.
- 비디오는 브라우저에서 만들도록 1차 프로토타입을 붙였고, **텍스트 렌더는 ffmpeg subtitles 필터가 아니라 Canvas 직접 그리기 방식**으로 바꿨다.

## 현재 프로젝트 상태

### 1. 음악 생성 / 듣기 / 다운로드

- 음악 생성은 다시 최소 정보만 저장하는 비동기 흐름이다.
- `syncMusicStatuses()` 는 최소 상태 동기화만 담당한다.
- `MusicAsset` 기반 자산 준비는 **사용자 액션 시점**에 일어난다.
  - `다운로드 n` 팝업 열기
  - 오디오 다운로드
  - 오디오 듣기(스트리밍)
- 이 시점에 필요한 경우 provider/wrapper 를 다시 조회하고 아래 자산을 저장한다.
  - mp3
  - large image
  - aligned lyrics raw
  - aligned lyrics lines
  - title text

### 2. MusicAsset 관련

- `MusicAsset` 테이블과 관련 enum/migration 은 이미 들어가 있다.
- 현재 로컬에서 확인된 상태:
  - 자산 저장 동작함
  - 듣기 동작함
  - 다운로드 동작함
- 즉, **오디오/재료 확보 기반은 현재 정상 동작**으로 봐도 된다.

### 3. 비디오 생성 방향

#### 이전

- 서버에서 ffmpeg 렌더
- 운영에서 504 / PROCESSING 정체 / worker 부재 문제가 반복

#### 현재

- 브라우저에서 직접 비디오 생성 실험 중
- 흐름:
  1. `/api/music/[id]/client-video-assets` 로 재료 메타데이터 받기
  2. `/api/music/[id]/download?inline=1` 로 mp3 받기
  3. `/api/music/[id]/asset?type=COVER_IMAGE` 로 배경 이미지 받기
  4. Canvas 에 배경, 제목, 가사를 직접 그림
  5. `canvas.captureStream()` + `MediaRecorder` 로 무음 `webm` 생성
  6. `ffmpeg.wasm` 으로 `video.webm + audio.mp3` 를 합쳐 최종 `mp4` 생성
  7. 브라우저에서 즉시 다운로드

## 오늘 비디오 관련으로 실제 바뀐 점

### 1. 브라우저 렌더 구조

- `D:\music\lib\client-video-render.ts`
  - Canvas 기반으로 제목/가사를 직접 그림
  - 고정 배경 이미지 사용
  - 마지막에만 ffmpeg.wasm 으로 mux

### 2. 경량화

- 현재 렌더 기본값:
  - `540x960`
  - `8fps`
  - `MediaRecorder videoBitsPerSecond = 1_000_000`
- 목표는 모바일에서도 테스트 가능한 경량 프로필

### 3. 오디오 병합

- ffmpeg mux 단계에서 먼저
  - `-c:a copy`
  로 시도
- 실패할 때만 fallback 으로
  - `aac`
  재인코딩

### 4. 멀티스레드 시도

- `next.config.ts` 에 아래 헤더를 추가했다.
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Embedder-Policy: require-corp`
- `client-video-render.ts` 에서 `@ffmpeg/core-mt` 를 우선 로드 시도하고,
  실패하면 단일 스레드 core 로 fallback 하도록 바꿨다.
- 아직 실제 브라우저에서 **항상 멀티스레드로 올라가는지 최종 검증은 필요**하다.
  - 콘솔에서 `[client-video] ffmpeg core-mt loaded` 확인 필요

### 5. 자막 규칙

- 최종 요청 기준으로 현재는 **처음 4줄 묶기 제거**
- **항상 2줄씩 타임라인에 맞게** 그리도록 변경했다.

### 6. 자막 크기

- 모바일 세로 경량 해상도에서 너무 크게 잘리던 문제 때문에 가사 폰트를 여러 번 줄였다.
- 현재는 이전보다 훨씬 작은 크기이며, 여전히 약간의 추가 조정 가능성은 남아 있다.

## 확인된 사실

### 브라우저 콘솔에서 확인한 것

- `[client-video] assets` 로그에서:
  - `lineCount` 존재
  - `titleText` 존재
- 즉 데이터가 없는 문제는 아니었다.
- 과거 `subtitles.ass` 방식에서 제목/가사가 안 보인 것은
  **브라우저 ffmpeg 자막 필터 문제**로 판단했고,
  그래서 Canvas 직접 렌더 방식으로 전환했다.

### 서버 로그에서 확인한 것

- 브라우저 렌더 시 서버 로그는 정상이다.
  - mp3 fetch 200
  - cover image fetch 200
  - client-video-assets 200
- 즉 비디오 생성 중 “멈춘 것처럼” 보일 때도, 서버가 죽은 게 아니라
  **브라우저 안에서 렌더가 진행 중인 상황**이었다.

## 아직 남아 있는 문제

### 1. 브라우저 렌더 속도

- 진행률 UI는 많이 개선됐지만, 여전히 체감 속도는 더 볼 필요가 있다.
- 특히 mux 단계와 전체 생성 시간을 더 확인해야 한다.

### 2. 가사 타이밍 품질

- 2줄 렌더 방식으로 갔지만, 특정 곡에서 타이밍 체감이 여전히 어색할 수 있다.
- 이건 다음 테스트에서 다시 봐야 한다.

### 3. 제목/가사 최종 시각 품질

- 현재는 “보이게 만드는 것” 중심으로 먼저 맞춘 상태다.
- 폰트 크기, 위치, 줄간격, safe area 는 다음에 추가 미세조정 가능하다.

### 4. 멀티스레드 실효성 검증

- 헤더와 로딩 코드는 넣었지만,
  실제 브라우저가 `core-mt` 를 안정적으로 쓰는지 최종 확인은 필요하다.

## 내일 바로 할 일

1. 브라우저 콘솔에서 `core-mt` 로드 여부 확인
2. 현재 브라우저 렌더 속도 다시 측정
3. 결과 mp4 에서
   - 제목 표시 품질
   - 가사 타이밍
   - 가사 잘림 여부
   확인
4. 필요하면 다음 순서로 추가 경량화 검토
   - 해상도 더 낮추기
   - fps 더 낮추기
   - Canvas draw 횟수/스타일 단순화
5. 브라우저 렌더가 충분히 쓸 만하면
   - 서버 비디오 생성 흐름을 보조/백업으로 내리고
   - 클라이언트 렌더를 주 경로로 가져갈지 판단

## 관련 핵심 파일

- [client-video-render.ts](D:/music/lib/client-video-render.ts)
- [video-render-controls.tsx](D:/music/components/video-render-controls.tsx)
- [client-video-assets route](D:/music/app/api/music/[id]/client-video-assets/route.ts)
- [asset route](D:/music/app/api/music/[id]/asset/route.ts)
- [download route](D:/music/app/api/music/[id]/download/route.ts)
- [prepare-assets route](D:/music/app/api/music/[id]/prepare-assets/route.ts)
- [next.config.ts](D:/music/next.config.ts)

## 한 줄 결론

오늘 기준 가장 중요한 변화는:

**오디오/재료 준비는 서버에서 안정화했고, 비디오 생성은 브라우저 Canvas + ffmpeg.wasm 기반으로 옮기는 프로토타입까지 들어간 상태**다.
