# Suno Integration Guide

이 프로젝트는 기본값으로 `mock` provider 모드를 사용한다. 실제 Suno 연동으로 전환하려면 `gcui-art/suno-api` 계열 wrapper를 먼저 준비한 뒤 `.env`를 수정하면 된다.

## 1. 추천 방향
- 메인 연동: `gcui-art/suno-api`
- 이유:
  - Next.js 프로젝트와 붙이기 쉬움
  - wrapper API가 비교적 단순함
  - `custom_generate`, `get`, `get_limit` 흐름이 명확함

## 2. 준비물
- Suno 계정의 `Cookie`
- 배포된 `gcui-art/suno-api` 주소

## 3. Cookie 가져오기
1. Suno 서비스에 로그인한다.
2. 브라우저 개발자 도구를 연다.
3. `Network` 탭에서 페이지를 새로고침한다.
4. `client?_clerk_js_version` 또는 유사한 인증 관련 요청을 찾는다.
5. `Headers` 섹션의 `Cookie` 값을 전체 복사한다.

## 4. Wrapper 준비
`gcui-art/suno-api`를 Vercel 또는 별도 서버에 배포한다.

참고:
- GitHub: `https://github.com/gcui-art/suno-api`
- Docs: `https://suno.gcui.ai/`

## 5. .env 설정
아래 값을 실제 환경에 맞게 수정한다.

```env
SUNO_COOKIE="여기에_복사한_cookie"
SUNO_API_BASE_URL="https://your-suno-wrapper.example.com"
MUSIC_PROVIDER_MODE="suno"
```

개발 중 mock으로 되돌리려면:

```env
MUSIC_PROVIDER_MODE="mock"
```

## 6. 현재 프로젝트에서 사용하는 wrapper API
- 생성 요청: `POST /api/custom_generate`
- 상태 조회: `GET /api/get?ids=...`
- 연결 확인: `GET /api/get_limit`

## 7. 점검 방법
### 프로젝트 내부 점검
- `GET /api/provider`

응답 예시:
- `mode`
- `ok`
- `configured`
- `quota`

### 브라우저 점검 순서
1. 개발 서버 실행
2. `http://localhost:3000` 접속
3. 로그인
4. 음악 생성 요청
5. 목록 자동 새로고침으로 상태 변경 확인

## 8. 주의사항
- 비공식 API라서 응답 필드나 상태 문자열이 바뀔 수 있다.
- wrapper가 다르면 `provider.ts`의 필드 매핑을 다시 맞춰야 한다.
- Cookie가 만료되면 생성이 실패할 수 있으므로 주기적으로 점검해야 한다.
