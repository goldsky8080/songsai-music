# Session Handoff - 2026-03-29

## 오늘 최종 상태

- 작업 프로젝트
  - `D:\music`
  - `D:\wrapper\suno-api`
- 오늘은 크게 두 축으로 진행했다.
  - `music` 쪽 듣기 / 다운로드 / 가사 txt / 비디오 생성 UX 보강
  - `wrapper` 쪽 Suno CAPTCHA / Chromium 세션 조사

## Suno 원본 응답 확인 결론

- Suno `feed/v2` 원본 응답 기준
  - `model_name: "chirp-fenix"`
  - `major_model_version: "v5.5"`
- 실제 완성 가사는 별도 `lyrics` 필드가 아니라 `metadata.prompt` 에 들어온다.
- `metadata.gpt_description_prompt` 는 설명용 템플릿이다.
- 생성 직후 `submitted` / 초기 `queued` 에서는 `metadata.prompt` 가 비어 있을 수 있다.
- 이후 `queued` 후반 / `streaming` 부터 실제 가사가 `metadata.prompt` 에 채워진다.

## music 프로젝트 반영 사항

### 1. stale cookie 영향 완화

- `D:\music` 이 wrapper 호출 시 정적 `SONGS_COOKIE` 를 강제로 보내지 않도록 수정했다.
- 목적:
  - 수노 웹에서 수동 생성 후 세션이 바뀌어도 `music` 이 오래된 쿠키를 wrapper에 억지로 넘기지 않게 하기

### 2. 다운로드 / 듣기 경로 보강

- 다운로드 API는 0KB 파일을 정상 mp3로 오판하지 않도록 보강했다.
- 다운로드는 여전히 엄격 검증을 유지한다.
- 듣기(`inline=1`)는 프록시 스트리밍 대신 최종 mp3 URL 로 307 리다이렉트하게 변경했다.
- 현재 체감상:
  - 다운로드는 비교적 안정
  - 듣기는 곡에 따라 편차가 남아 있어 추가 확인 필요

### 3. 가사 txt 다운로드 보강

- 실제 가사는 `generationJob.result.generatedLyrics` / `providerPrompt` 기준으로 사용하도록 1차 정리했다.
- `가사 txt 다운로드` 는
  - 저장된 실제 가사를 우선 사용
  - 없으면 `providerTaskId` 로 provider 상태를 다시 조회해서 `prompt` 계열 실제 가사를 가져오도록 보강했다

### 4. 제목 표시 보강

- auto 곡에서 `"자동"` 대신 보조 옵션 1~2개를 조합한 제목을 생성하도록 변경했다.
- 목록에서는 가능한 한 제목을 우선 보여주도록 보강했다.
- 다만 일부 카드에서 `실제 가사를 준비 중입니다.` 같은 fallback 문구가 아직 보여서 추가 정리가 남아 있다.

### 5. 비디오 생성 고도화

- 비디오는 이제 Suno `image_large_url` / `image_url` 를 기본 커버 이미지로 사용할 수 있다.
- 이미지 업로드가 없어도 `커버로 비디오+100` 으로 생성 가능하다.
- 업로드 이미지가 있으면 그것을 우선 사용한다.
- 비디오 형식:
  - 모바일 특화 세로형 `9:16`
  - `1080x1920`
- 렌더 효과:
  - 정적인 이미지 대신 천천히 확대 / 이동하는 Ken Burns 스타일 적용
- 생성 UI:
  - 진행률 표시
  - 단계형 상태 문구
  - 완료 후 자동 다운로드

### 6. 비디오 자막 시도 후 원복

- 가사를 몇 줄씩 묶어 하단 자막처럼 넣는 버전을 시도했다.
- 하지만 실제 결과는
  - 글자가 너무 큼
  - 마지막 가사만 오래 고정됨
  - 화면을 많이 가림
  문제가 있었다.
- 사용자 요청에 따라 **자막 기능은 오늘 기준으로 전부 원복**했다.
- 현재 비디오는 **자막 없는 버전**이 최종 상태다.

## wrapper / Chromium 조사 결과

### 1. GUI 세션이 필수

- SSH 세션에서 `headless=false` 브라우저를 띄우면 무조건 실패
- 핵심 에러:
  - `Missing X server or $DISPLAY`
- RustDesk 로 접속한 Ubuntu 데스크탑 세션에서
  - `echo $DISPLAY`
  - 결과가 `:0`
  인 터미널에서만 headed Chromium 실행 가능

### 2. CAPTCHA fallback 상태

- persistent Chromium profile 기반으로 브라우저 실행까지는 가능
- 쿠키 배너 / 입력 / `Lyrics Mode` / `Create` 클릭 로직을 여러 번 조정했음
- 하지만 전체 플로우는 아직 완전히 안정화되었다고 보기 어렵다
- 오늘 기준 결론:
  - wrapper 브라우저 자동화는 “가능성 확인” 단계
  - 내일은 Chromium 초기화 후 단순 시나리오부터 다시 검증하는 편이 좋음

## 오늘 남은 미해결 포인트

### 1. 듣기 편차

- 다운로드는 되는데 듣기는 일부 곡에서 여전히 잘 안 되는 경우가 있다.
- 현재 가장 유력한 방향:
  - 곡별 최종 mp3 URL 응답 차이
  - 또는 브라우저가 리다이렉트된 최종 Suno mp3 응답을 해석하는 차이

### 2. 목록 fallback 문구

- `실제 가사를 준비 중입니다.` 는 제목이 아니라 가사 요약 자리 fallback 이다.
- 리스트에서는 이 문구를 숨기거나, 제목 위주로 더 깔끔하게 정리할 필요가 있다.

### 3. MR 다운로드

- 다음으로 검토할 기능 후보
  - `순수 MR` 우선
  - 필요하면 이후 `노래방 MR`
- 구현 방식은 보컬 분리 모델(Demucs 계열 등) 기반으로 보는 게 가장 현실적
- 3분 곡 기준 CPU 환경에선 수 분 단위 처리 시간 예상

## 내일 다시 시작할 때 추천 순서

1. `D:\music` 현재 상태 먼저 확인
   - 듣기
   - 다운로드
   - 가사 txt
   - 커버 비디오 생성
2. 리스트 fallback 문구 정리
3. 듣기 실패 곡 1~2개만 따로 추적
   - 최종 mp3 URL / 응답 상태 확인
4. MR 다운로드 기능 검토 시작
5. wrapper 쪽은 Chromium 초기화 후 단순 테스트부터 재시작

## Chromium 초기화 명령 메모

삭제 없이 초기화만 할 때:

```bash
pkill -f chromium
rm -rf ~/.config/chromium
rm -rf ~/snap/chromium/common/chromium
rm -rf ~/.cache/chromium
```

그 다음 실행:

```bash
chromium
```

## 짧은 결론

- `music` 쪽은 오늘 꽤 많이 정리됨
  - 다운로드 / 가사 txt / 커버 비디오 생성은 전보다 훨씬 나아짐
- 비디오 자막은 오늘 시도했다가 원복한 상태
- wrapper / Chromium 쪽은 아직 “확실히 해결” 단계는 아님
- 내일은
  - `music` 남은 UX 정리
  - MR 다운로드 검토
  - wrapper 브라우저 흐름 단순 재검증
  순서가 가장 좋다
