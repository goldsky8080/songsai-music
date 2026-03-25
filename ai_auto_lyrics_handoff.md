# AI Auto Lyrics Handoff

이 문서는 `d:\music` 메인 프로젝트와 별도 wrapper 프로젝트를 오가며 진행한 `AI 자동 생성` 복구 작업의 현재 상태를 다음 세션에서 바로 이어받을 수 있도록 정리한 인수인계 문서다.

## 1. 현재 결론

- 로컬 메인 앱의 auto 요청은 direct 외부 호출이 아니라 SONGS API wrapper `/api/custom_generate` 로 통일했다.
- 테스트 wrapper `dev-suno.songsai.org` 에서 자동 가사 생성 성공 사례를 확인했다.
- 운영 wrapper `suno.songsai.org` 와 운영 메인 앱에는 아직 실험성 auto 패치를 전부 반영하지 않았다.

즉, 운영 영향 없이 테스트 환경에서 auto 흐름 검증까지 끝난 상태다.

## 2. 전체 구조

### 메인 프로젝트
- 경로: `d:\music`
- 로컬 개발 URL: `http://localhost:3000`
- 운영 URL: `https://songsai.org`

### 운영 wrapper
- 공개 주소: `https://suno.songsai.org`
- 서버 포트: `3101`
- 역할: 실제 운영 생성 요청 처리

### 테스트 wrapper
- 공개 주소: `https://dev-suno.songsai.org`
- 서버 포트: `3201`
- 역할: auto 관련 패치 검증 전용

## 3. 메인 프로젝트에서 반영한 핵심 방향

- `MUSIC_PROVIDER_MODE=songs`
- `SONGS_API_BASE_URL=...`
- auto/manual 모두 wrapper `/api/custom_generate` 호출
- auto payload 에 `gpt_description_prompt`, `mv`, `metadata` 포함

핵심 방향:

```ts
const endpoint = `${env.SONGS_API_BASE_URL}/api/custom_generate`;
```

## 4. wrapper 쪽 핵심 포인트

주요 수정 파일은 아래 두 개였다.

- `src/app/api/custom_generate/route.ts`
- `src/lib/SunoApi.ts`

핵심 목적:
- `gpt_description_prompt` 기반 자동 가사 생성 payload 처리
- CAPTCHA/쿠키/세션 문제 완화
- 테스트 wrapper 에서만 먼저 검증

## 5. 테스트 중 만난 실제 문제

- direct 호출 시 `Unauthorized`
- HTTPS 라우팅 문제로 메인 앱 404 HTML 반환
- Playwright 쿠키 주입 실패
- CAPTCHA 이후 버튼/입력창/프롬프트 대기 timeout
- 같은 계정의 수동 브라우저 사용 여부에 따른 세션 상태 영향

## 6. 현재 판단

- 구조적으로 auto-lyrics 가 불가능한 것은 아님
- 다만 wrapper 는 외부 세션/CAPTCHA 상태의 영향을 크게 받음
- 운영 반영 전 반복 검증이 필요함

## 7. 다음 순서

1. `D:\wrapper\suno-api` 수정본 정리
2. `dev-suno` 반복 테스트
3. 운영 반영 여부 판단
4. 운영 wrapper 반영 시 최소 패치부터 적용
