# Suno Progress Notes

## 목적
- 지금까지 진행한 Suno 연동 작업을 한눈에 복기하기 위한 메모
- 내일 다시 작업할 때 현재 상태, 막힌 이유, 다음 순서를 빠르게 확인하기 위한 문서

## 현재까지 완료된 것
- 로그인/회원가입, 세션, 크레딧 구조 구현
- 무료/유료 크레딧 분리
- 회원가입 시 무료 크레딧 1000 지급
- 음악 생성 폼 구현
- Suno wrapper(`gcui-art/suno-api`) 연동
- 음악 생성 실패 시 크레딧 환불
- Suno가 2개 클립을 반환할 때 목록에 각각 반영되도록 처리
- 같은 생성 요청 결과를 한 카드로 묶어서 보여주는 구조 추가
- `1곡 / 2곡` 선택 추가
- 비용 정책 변경
  - 1곡: 500 크레딧
  - 2곡: 700 크레딧
- 보컬 선택 UI 추가
  - 자동 / 여성 / 남성
- 모델 선택 UI 추가
  - `v4.5+`
  - `v5`
- 다운로드 API 추가
  - `/api/music/[id]/download`

## 확인한 모델 내부명
- `v4.5+` -> `chirp-bluejay`
- `v5` -> `chirp-crow`

이 값은 Suno 웹에서 직접 생성한 뒤 DevTools `Payload` / `Preview`를 보고 확인했다.

## 현재 메인 프로젝트 provider 동작
- 모델 선택값을 받아 내부 Suno 모델명으로 매핑
- 스타일 문구에 따라 보컬 힌트 강화
  - 여성: `female vocal, female singer`
  - 남성: `male vocal, male singer`
- `vocalGender`를 직접 선택하면 자동 추정보다 우선
- 현재 AI 자동 가사 생성은 임시 비활성화 상태

## AI 자동 가사 생성 상태
- UI 구조와 API 필드는 만들어둠
- 하지만 현재는 막아둔 상태

### 왜 막아두었는가
- 직접 가사 입력은 wrapper `/api/custom_generate` 경로를 타기 때문에 정상 동작
- AI 자동 가사는 `gpt_description_prompt`를 보내기 위해 Suno 본체 API를 직접 호출하는 실험을 했음
- 그 결과 `Unauthorized`가 발생

### 원인
- wrapper는 내부적으로 세션 유지, CAPTCHA 토큰, session_id 갱신 등을 처리함
- direct call은 그 과정을 타지 못함
- 따라서 wrapper 패치 없이 AI 자동 가사를 여는 건 위험하다고 판단

## wrapper(`gcui-art/suno-api`)에서 확인한 점
- `DEFAULT_MODEL = 'chirp-v3-5'`
- `custom_generate` route는 `model` 값을 받아 내부 `generateSongs()`에 전달
- `generateSongs()`는 최종적으로 Suno `api/generate/v2/` 호출
- 현재 내부 구조상
  - custom 모드: `prompt`, `tags`, `title`
  - non-custom 모드: `gpt_description_prompt`
- 즉 `gpt_description_prompt + title + tags` 조합을 자연스럽게 처리하기 어려움

## AI 자동 가사 다시 열 때 wrapper 패치 방향
대상:
- `gcui-art/suno-api`

수정 위치 후보:
- `src/app/api/custom_generate/route.ts`
- `src/lib/SunoApi.ts`

목표:
- custom generate에서도 `gpt_description_prompt`를 함께 받을 수 있게 수정
- 즉 아래 조합이 가능해야 함
  - `title`
  - `tags`
  - `gpt_description_prompt`
  - `mv`
  - `vocal_gender`

원하는 payload 예시:
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

패치 아이디어:
1. `/api/custom_generate` body에서 `gpt_description_prompt` 수신
2. `generateSongs()`에서 custom 모드여도 `gpt_description_prompt`를 payload에 실을 수 있게 분기 추가
3. `title`, `tags`, `negative_tags`, `mv`, `vocal_gender` 유지

## 현재 가장 큰 문제
Vercel에 배포한 `suno-api` wrapper에서 Playwright 브라우저 실행파일이 없어 생성 시 실패함

대표 에러:
```txt
Executable doesn't exist at /var/task/.local-browsers/.../headless_shell
Looks like Playwright was just installed or updated.
Please run: npx playwright install
```

## 왜 Vercel이 문제라고 판단했는가
- `get_limit`는 정상 동작
- 생성 요청에서만 Playwright 경로로 들어가며 실패
- 경로는 바뀌었지만 실행 파일 없음
- 즉 wrapper 코드보다 배포 런타임 문제가 핵심

## 현재 판단
- 메인 앱은 Vercel 유지 가능
- Suno wrapper는 Vercel보다 Railway/Render 같은 일반 런타임이 더 적합
- 다음 단계는 wrapper를 Railway로 옮기는 것이 가장 현실적

## 메인 프로젝트 현재 TODO
1. Suno wrapper를 Railway로 이동
2. Railway 배포 URL을 메인 프로젝트 `SUNO_API_BASE_URL`에 연결
3. AI 자동 가사는 wrapper 패치 후 재개

## 참고
- 제목은 DB 저장 없이 API 요청용으로만 사용 중
- 보컬 선택도 DB 저장 없이 API 요청용으로만 사용 중
- 1곡 선택 시 앱에서 첫 번째 트랙만 저장/표시
- 2곡 선택 시 한 카드 안에 두 트랙 버튼으로 표시
