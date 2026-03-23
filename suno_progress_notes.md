# Suno Integration Progress Notes

## 목적
- 현재 프로젝트에서 Suno 연동 작업이 어디까지 왔는지 기록한다.
- 나중에 다시 이어서 작업할 때, 모델명/보컬 처리/자동 가사 이슈를 빠르게 복기할 수 있게 한다.

## 현재 완료된 것
- 로그인/회원가입, 세션, 크레딧 구조 구현 완료
- 음악 생성 폼 구현 완료
- Suno wrapper(`gcui-art/suno-api`) 연동 완료
- 생성 비용 차감 및 실패 시 환불 로직 구현 완료
- Suno가 2개 클립을 반환할 때 목록에 2개가 각각 보이도록 수정 완료
- 보컬 선택 UI(`자동 / 여성 / 남성`) 추가 완료

## 현재 모델 매핑 메모
- `v4.5+` -> `chirp-bluejay`
- `v5` -> `chirp-crow`

이 값은 Suno 웹에서 직접 생성한 뒤 DevTools Preview/Payload에서 확인했다.

## 현재 provider 동작
- 기본 모델은 현재 `v5` 테스트 기준으로 `chirp-crow` 사용
- 스타일 문자열에 따라 보컬 힌트를 보강한다
  - 여성: `female vocal, female singer`
  - 남성: `male vocal, male singer`
- `vocalGender` 선택값이 있으면 자동 추정보다 우선한다

## 보컬 성별 관련 메모
- Suno 웹 payload에서 `vocal_gender: "f"` 값이 보였다
- 따라서 여성 보컬 제어는 단순 `tags`만이 아니라 `vocal_gender`도 영향을 주는 것으로 보인다
- 현재 프로젝트에서는 `metadata.vocal_gender`를 함께 보내도록 시도했다
- 다만 wrapper가 이 값을 실제로 Suno까지 완전하게 전달하는지는 추가 확인이 필요하다

## 자동 가사(AI Lyrics) 관련 상태
- UI와 API 구조는 만들어 둠
- 하지만 현재는 **임시 비활성화** 상태

### 왜 막았는가
- 직접 가사 입력은 wrapper `/api/custom_generate` 경로를 타기 때문에 정상 동작
- AI 자동 가사는 `gpt_description_prompt`를 보내기 위해 Suno 본체 API를 직접 호출하는 실험을 했음
- 이 경우 `{"detail":"Unauthorized"}` 에러가 발생함

### Unauthorized 원인
- wrapper는 내부적으로 세션 유지, CAPTCHA 토큰, 세션 ID 갱신 등을 수행함
- direct call은 그 과정을 타지 못함
- 따라서 `AI 자동 가사`는 wrapper 패치 없이 바로 열기 어렵다고 판단함

## gcui-art/suno-api에서 확인한 점
- `DEFAULT_MODEL = 'chirp-v3-5'`
- `custom_generate` route는 `model`을 받아 내부 `generateSongs()`로 전달
- `generateSongs()`는 최종적으로 Suno `api/generate/v2/`를 호출
- 내부 로직상
  - custom 모드: `prompt`, `tags`, `title`
  - non-custom 모드: `gpt_description_prompt`
  로 갈라져 있음

즉 현재 wrapper 구조는 `gpt_description_prompt + title + tags` 조합을 자연스럽게 처리하기 어렵다.

## 나중에 해야 할 wrapper 패치 방향
대상 레포:
- `gcui-art/suno-api`

주요 수정 위치 후보:
- `src/app/api/custom_generate/route.ts`
- `src/lib/SunoApi.ts`

### 목표
- custom generate에서도 `gpt_description_prompt`를 받을 수 있게 하기
- 즉 아래 조합이 가능하게 만들기
  - `title`
  - `tags`
  - `gpt_description_prompt`
  - `mv`
  - `vocal_gender`

### 원하는 payload 형태
```json
{
  "title": "먼저처럼",
  "prompt": "",
  "gpt_description_prompt": "고향을 그리워하는 느낌의 가사를 만들어줘",
  "tags": "한국 트로트",
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

### wrapper 패치 아이디어
1. `/api/custom_generate` body에서 `gpt_description_prompt`를 받도록 수정
2. `generateSongs()`에서 custom 모드일 때도 `gpt_description_prompt`를 payload에 실을 수 있게 분기 추가
3. `title`, `tags`, `negative_tags`, `mv`, `vocal_gender`를 유지한 채 Suno `generate/v2/`로 보내도록 변경

## 현재 프로젝트에서 막아둔 상태
- UI: `AI 자동 생성` 버튼 비활성화
- API: `lyricMode === "auto"` 이면 400과 안내 메시지 반환

## 다시 열 때 순서 추천
1. wrapper 레포 패치
2. patched wrapper를 Vercel 재배포
3. 로컬 프로젝트에서 `AI 자동 생성` 차단 해제
4. Suno Preview에서
   - `gpt_description_prompt`
   - `major_model_version`
   - `model_name`
   - `vocal_gender`
   를 다시 확인

## 참고 메모
- 2개 생성되는 곡은 현재 목록에 각각 별도 항목으로 보이도록 수정됨
- 제목은 DB 저장 없이 API 요청용으로만 사용 중
- 보컬 선택도 DB 저장 없이 API 요청용으로만 사용 중
