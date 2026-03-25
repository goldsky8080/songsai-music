# Railway Suno Wrapper Plan

이 문서는 예전에 `gcui-art/suno-api` wrapper를 Railway에 올리는 방향을 검토할 때 만든 참고 메모다.

## 현재 상태

이 문서는 **보류된 대안 문서**다.

지금 프로젝트 기준 주 경로는 Railway가 아니라:
- N100 서버 운영 wrapper
- N100 서버 테스트 wrapper

구조로 보는 것이 맞다.

## 왜 보류됐나

- 운영/테스트 모두 현재는 N100 서버 기준으로 이미 굴러가고 있음
- Playwright/Chromium 이슈는 Railway보다도 세션/CAPTCHA 변수 영향이 더 큼
- 지금 시점엔 새 호스팅 이전보다 wrapper 안정화가 더 우선

## 지금 이 문서를 보는 경우

아래 상황에서만 다시 검토한다.

- N100 서버 운영이 부담스러워질 때
- wrapper를 완전히 별도 호스팅으로 분리하고 싶을 때
- 서버 자원/관리 비용 때문에 이전이 필요할 때

그 전까지는 참고용 보관 문서로 둔다.
