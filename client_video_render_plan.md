# Client Video Render Plan

## 목적

현재 `D:\music` 의 서버 비디오 렌더는 운영 환경에서 다음 문제가 있었다.

- 렌더 시간이 길다
- HTTP 요청 안에서 끝내면 504 위험이 있다
- 비동기 접수만 하고 worker 가 없으면 `PROCESSING` 에 오래 머문다
- `n100` 서버 한 대에 웹앱 + wrapper + 비디오 렌더를 같이 얹는 구조는 장기적으로 불안하다

그래서 비디오 생성만큼은 **클라이언트 브라우저에서 직접 렌더**하는 방향을 검토하고, 현재 1차 프로토타입까지 구현했다.

## 기본 방향

### 유지하는 것

- 음악 생성
- 로그인
- 크레딧
- 음악 듣기/다운로드
- `MusicAsset` 기반 자산 저장
- wrapper/provider 연동 구조

### 바꾸는 것

- **비디오 생성만** 브라우저 렌더로 실험

즉 서비스 전체를 갈아엎는 게 아니라,
가장 무거운 ffmpeg 렌더만 클라이언트로 넘기는 전략이다.

## 현재 프로토타입 구조

### 서버 역할

서버는 비디오를 직접 만들지 않고 재료만 공급한다.

- mp3
- cover image
- aligned lyrics lines
- title text

관련 API:

- [client-video-assets](D:/music/app/api/music/[id]/client-video-assets/route.ts)
- [download route](D:/music/app/api/music/[id]/download/route.ts)
- [asset route](D:/music/app/api/music/[id]/asset/route.ts)

### 브라우저 역할

브라우저는 다음을 직접 수행한다.

1. mp3 받기
2. 배경 이미지 받기
3. 제목/가사 타이밍 받기
4. Canvas 에 프레임 그리기
5. `canvas.captureStream()` + `MediaRecorder` 로 무음 영상 만들기
6. `ffmpeg.wasm` 으로 `video.webm + audio.mp3` 를 합쳐 최종 mp4 만들기
7. 사용자에게 바로 다운로드

핵심 구현 파일:

- [client-video-render.ts](D:/music/lib/client-video-render.ts)
- [video-render-controls.tsx](D:/music/components/video-render-controls.tsx)

## 텍스트 렌더 방식

### 이전 시도

- `.ass`
- `subtitles=subtitles.ass`
- 브라우저 ffmpeg.wasm 에서 자막 필터 사용

문제:

- 가사/제목 데이터는 있었지만 실제 영상에 안 보이는 문제가 반복되었다
- 브라우저 ffmpeg 의 자막 필터가 기대대로 동작하지 않는 것으로 판단했다

### 현재 방식

- Canvas 위에 제목/가사를 직접 그림
- ffmpeg 는 마지막 mux 용도로만 사용

이 방식이 더 단순하고, 브라우저 환경에서 결과를 직접 통제하기 쉽다.

## 현재 렌더 설정

현 시점 기본값:

- 해상도: `540x960`
- FPS: `8`
- 배경: 고정
- 가사: 2줄씩 렌더
- 오디오 병합: 우선 `-c:a copy`, 실패 시 `aac` fallback

이 설정의 목적:

- 모바일에서도 테스트 가능한 수준으로 최대한 가볍게 시작
- 품질보다 “동작 가능성 + 속도” 먼저 검증

## 멀티스레드 전략

### 넣은 것

- [next.config.ts](D:/music/next.config.ts)
  - `COOP`
  - `COEP`
- `client-video-render.ts`
  - `@ffmpeg/core-mt` 우선 로드
  - 실패 시 단일 스레드 core fallback

### 의미

가능하면 멀티스레드로 더 빠르게 돌리고,
브라우저가 조건을 만족하지 못하면 그대로 단일 스레드로라도 계속 동작하게 하는 전략이다.

## 왜 이 방향이 유효한가

### 장점

- 서버 CPU 부담 감소
- 비디오 때문에 웹서버가 막히는 문제 감소
- worker/queue 를 당장 도입하지 않아도 됨
- 서비스의 다른 축은 그대로 유지 가능

### 단점

- 사용자 기기 성능에 의존
- 모바일 브라우저 호환성 확인 필요
- 발열/배터리/메모리 이슈 가능
- 결과물이 기기마다 체감 속도 차이 날 수 있음

## 현재까지 확인된 사실

1. 자산 데이터는 실제로 내려오고 있다
   - `lineCount`
   - `titleText`
   - cover image
   - audio
2. 브라우저에서 ffmpeg progress 로그도 들어오고 있다
3. 서버 로그는 정상이며, 렌더 병목은 현재 브라우저 쪽이다
4. 오디오/이미지/가사 자산 저장은 이미 서버에서 안정적으로 동작한다

## 아직 남은 검증 포인트

1. `core-mt` 가 실제로 브라우저에서 안정적으로 로드되는지
2. 3~5분짜리 곡에서 실제 체감 생성 시간이 어느 정도인지
3. 모바일에서 발열/메모리 문제가 없는지
4. 가사 타이밍이 충분히 자연스러운지
5. 제목/가사 시각 품질이 서비스용으로 납득 가능한지

## 추천 다음 단계

### 1단계

- 현재 프로토타입으로
  - PC
  - 모바일
  에서 실제 렌더 시간 측정

### 2단계

- 가사 타이밍 / 폰트 / safe area 미세조정

### 3단계

- 브라우저 렌더가 충분히 안정적이면
  - 서버 비디오 생성은 축소
  - 브라우저 렌더를 주 경로로 검토

### 4단계

- 브라우저 렌더가 기대 이하이면
  - 서버 worker + queue 구조로 회귀 또는 병행

## 결론

현재 가장 현실적인 판단은:

**오디오/자산 준비는 서버에서 안정화하고, 비디오 생성만 브라우저 Canvas + ffmpeg.wasm 으로 분리하는 실험을 이어가는 것**이다.

이 방향은 `n100` 서버 병목을 줄이면서도 기존 서비스 구조를 크게 흔들지 않는다는 점에서 충분히 시도할 가치가 있다.
