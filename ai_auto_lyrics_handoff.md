# AI Auto Lyrics Handoff

## 1. 이 문서의 목적

이 문서는 현재 `d:\music` 메인 프로젝트와 별도로 열게 될 `wrapper` 프로젝트 세션이,
지금까지의 맥락을 잃지 않고 바로 이어서 작업할 수 있도록 만든 인수인계 문서다.

핵심 목표는 `AI 자동 생성` 기능을 다시 살리는 것이다.

현재 메인 앱의 수동 가사 생성은 정상 동작하지만, 자동 가사 생성은 아직 wrapper 패치가 필요하다.

## 2. 전체 구조 요약

### 메인 앱
- 로컬 개발 경로: `d:\music`
- 서비스 도메인: `https://songsai.org`
- 로컬 개발 URL: `http://localhost:3000`
- 운영 메인 앱은 Docker Compose 기반으로 N100 서버에서 실행 중

### 운영 wrapper
- 공개 주소: `https://suno.songsai.org`
- 서버 내부 포트: `3101`
- 역할: 실제 운영에서 사용하는 Suno wrapper
- 상태: 정상 운영 중, 건드리면 운영 서비스에 영향 갈 수 있음

### 테스트 wrapper
- 공개 주소: `https://dev-suno.songsai.org`
- 서버 내부 포트: `3201`
- 역할: AI 자동 가사 같은 위험한 기능을 운영 영향 없이 먼저 검증하는 테스트용 wrapper
- 상태: 이미 N100 서버에 분리 배치 완료, `get_limit` 응답 정상

## 3. 왜 지금 wrapper 프로젝트를 따로 열어야 하는가

현재 `d:\music` 는 메인 앱 프로젝트다.

문제의 핵심은 메인 앱 UI나 API route가 아니라, `gcui-art/suno-api` wrapper 가
`gpt_description_prompt` 를 우리가 원하는 방식으로 받지 못하는 데 있다.

즉 지금 수정이 필요한 곳은:
- 메인 앱 프로젝트가 아니라
- `suno-api-dev` 기준의 wrapper 프로젝트

따라서 새 프로젝트를 열어 wrapper 자체를 수정하는 것이 맞다.

## 4. 현재 메인 프로젝트에서 이미 해둔 것

### 4-1. 로컬 `.env` 전환
현재 로컬 `d:\music\.env` 는 아래처럼 테스트 wrapper 를 보도록 바뀌어 있다.

```env
SUNO_API_BASE_URL="https://dev-suno.songsai.org"
MUSIC_PROVIDER_MODE="suno"
APP_URL="http://localhost:3000"
```

즉 지금 로컬에서 `npm run dev` 를 띄우면:
- 브라우저는 `http://localhost:3000`
- 메인 앱 서버 코드는 `https://dev-suno.songsai.org` 를 호출

### 4-2. UI 차단 해제
메인 앱에서 `AI 자동 생성` 버튼은 다시 활성화했다.

수정 파일:
- `d:\music\components\auth-panel.tsx`

현재 상태:
- `AI 자동 생성` 버튼 활성화
- `준비중` 문구 제거
- 눌렀을 때 차단 메시지 제거

### 4-3. API 차단 해제
메인 앱 API route 에 있던 auto 모드 차단 로직을 제거했다.

수정 파일:
- `d:\music\app\api\music\route.ts`

현재 상태:
- `lyricMode === "auto"` 라고 해서 400을 반환하지 않음
- 실제 provider 까지 요청이 내려감

## 5. 현재 실패하는 진짜 이유

로컬에서 `AI 자동 생성` 을 실행하면 아래 에러가 난다.

```txt
Suno music creation request failed. {"detail": "Unauthorized"}
POST /api/music 502
```

이 에러의 직접 원인은 메인 앱 provider 의 auto 경로가 아직도 wrapper 를 우회하기 때문이다.

즉 현재 `d:\music\server\music\provider.ts` 는:

- `manual` 일 때:
  - `https://dev-suno.songsai.org/api/custom_generate`
  - 즉 wrapper 사용

- `auto` 일 때:
  - `https://studio-api.prod.suno.com/api/generate/v2/`
  - 즉 Suno 본체 API direct call

그래서 auto 는 wrapper 인증 흐름을 못 타고 바로 `Unauthorized` 가 난다.

## 6. 왜 direct call 이 안 되는가

Suno 자동 가사 생성은 payload 만 맞춘다고 끝나는 게 아니다.

wrapper 가 내부적으로 처리해주던 것들이 필요하다.

예:
- 세션 유지
- keepAlive
- session id
- captcha token
- 쿠키 기반 인증 흐름

이 흐름 없이 `studio-api.prod.suno.com/api/generate/v2/` 를 직접 치면 `Unauthorized` 가 나기 쉽다.

즉 해결 방향은:
- 메인 앱의 auto 요청도 결국 wrapper 를 타도록 만들기

## 7. wrapper 에서 필요한 목표 동작

우리가 원하는 것은 `custom_generate` 계열 경로에서도 아래 payload 조합을 자연스럽게 처리하는 것이다.

```json
{
  "title": "곡 제목",
  "prompt": "",
  "gpt_description_prompt": "고향을 그리워하는 느낌의 가사를 만들어줘",
  "tags": "한국 트로트, 여성보컬",
  "negative_tags": "",
  "generation_type": "TEXT",
  "mv": "chirp-crow",
  "make_instrumental": false,
  "metadata": {
    "create_mode": "custom",
    "mv": "chirp-crow",
    "vocal_gender": "f"
  }
}
```

핵심은 아래 조합을 같이 보낼 수 있어야 한다는 점이다.

- `title`
- `gpt_description_prompt`
- `tags`
- `mv`
- `vocal_gender`

## 8. wrapper 프로젝트에서 봐야 할 파일

새로 열 프로젝트에서 우선 확인할 파일:

- `src/app/api/custom_generate/route.ts`
- `src/lib/SunoApi.ts`

특히 봐야 할 함수:
- `custom_generate`
- `generateSongs`

## 9. 현재 wrapper 쪽 문제로 추정되는 지점

기존 구조는 대략 아래처럼 나뉘어 있다.

- custom 모드:
  - `prompt`, `tags`, `title`
- non-custom 또는 별도 경로:
  - `gpt_description_prompt`

즉 현재 구조는
`gpt_description_prompt + title + tags + model + vocal_gender`
를 한 번에 자연스럽게 받는 데 적합하지 않을 가능성이 높다.

## 10. wrapper 패치 목표

### 목표 1
`custom_generate` route 가 `gpt_description_prompt` 를 body 에서 받을 수 있게 한다.

### 목표 2
`generateSongs()` 내부에서 custom 경로라도 `gpt_description_prompt` 가 있으면
그 값을 payload 에 포함해 Suno 생성 API 로 넘길 수 있게 한다.

### 목표 3
아래 값들이 같이 유지되게 한다.
- `title`
- `tags`
- `negative_tags`
- `mv`
- `vocal_gender`
- 기존 인증 흐름

## 11. 메인 프로젝트에서 나중에 다시 맞출 부분

wrapper 패치가 끝나면 메인 앱 `provider.ts` 도 정리해야 한다.

현재는:
- auto => direct Suno call

바꿔야 하는 방향:
- auto => `dev-suno.songsai.org` wrapper 의 endpoint 호출

즉 최종적으로는 auto/manual 둘 다 wrapper 를 타게 만드는 것이 목표다.

## 12. 테스트 순서 권장안

### 1단계. wrapper 단독 패치
- wrapper 프로젝트 로컬에서 코드 수정
- `custom_generate` 로 `gpt_description_prompt` 전달 실험

### 2단계. N100 테스트 wrapper 반영
- `~/services/suno-api-dev` 에만 반영
- 운영 wrapper `~/services/suno-api` 는 건드리지 않음

### 3단계. 메인 앱 로컬 테스트
- `d:\music\.env` 는 이미 `https://dev-suno.songsai.org`
- 로컬 `npm run dev`
- `AI 자동 생성` 으로 요청

### 4단계. 성공 시 운영 반영 검토
- 충분히 검증된 뒤에만 운영 wrapper 반영 여부 판단

## 13. 운영 안전 원칙

반드시 지켜야 할 원칙:

- 운영 wrapper `suno.songsai.org` 는 직접 수정하지 않는다
- 테스트 wrapper `dev-suno.songsai.org` 에서만 먼저 검증한다
- 운영 메인 앱에는 즉시 반영하지 않는다
- 패치 성공 후에도 운영 반영은 별도 단계로 분리한다

## 14. 현재 메인 프로젝트 관련 참고 문서

이 문서와 함께 보면 좋은 파일:

- `d:\music\suno_progress_notes.md`
- `d:\music\dev_server_cleanup_plan.md`
- `d:\music\deploy\n100_quickstart.md`
- `d:\music\ai_auto_lyrics_handoff.md`

## 15. 다음 세션에 바로 전달하면 좋은 문장

새 wrapper 프로젝트 세션에서 아래처럼 말하면 맥락을 빠르게 이어갈 수 있다.

```txt
이 wrapper 프로젝트는 d:\music 메인 앱의 AI 자동 가사 생성 복구를 위한 작업이다.
운영 wrapper는 suno.songsai.org(3101), 테스트 wrapper는 dev-suno.songsai.org(3201) 이다.
메인 앱은 이미 auto 차단을 풀었지만 provider의 auto 경로가 아직 direct Suno call이라 Unauthorized가 난다.
목표는 custom_generate / SunoApi.ts 를 패치해서 gpt_description_prompt + title + tags + mv + vocal_gender 를 wrapper 인증 흐름 안에서 처리하는 것이다.
```

## 16. 현재 결론

지금 메인 앱은 테스트 준비가 끝난 상태다.

막힌 것은 오직 wrapper 패치다.

즉 다음 작업의 본질은:
- 메인 앱 수정이 아니라
- wrapper 에서 `gpt_description_prompt` 를 제대로 처리하도록 만드는 것이다.
