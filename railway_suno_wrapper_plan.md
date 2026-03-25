# Railway SONGS Wrapper Plan

이 문서는 예전에 `gcui-art/suno-api` 기반 wrapper를 Railway에 올리는 방향을 검토할 때 만든 참고 메모다.

## 현재 상태

이 문서는 **보류 중인 참고 문서**다.

지금 프로젝트의 주 경로는 Railway가 아니라 아래 구조다.

- N100 서버 운영 wrapper
- N100 서버 테스트 wrapper

## 왜 보류 중인가

- 운영과 테스트가 모두 현재 N100 서버 기준으로 이미 굴러가고 있다
- Playwright와 Chromium 흐름은 Railway보다도 세션과 CAPTCHA 변화의 영향을 많이 받는다
- 지금 시점에서는 이전보다 wrapper 안정화가 더 우선이다

## 다시 볼 상황

아래 상황에서만 다시 검토한다.

- N100 서버 운영이 부담스러워질 때
- wrapper를 완전히 별도 인프라로 분리하고 싶을 때
- 서버 자원이나 운영 비용 문제로 이전이 필요할 때

그 전까지는 참고용 문서로 둔다.
