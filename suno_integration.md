# SONGS API Integration Guide

이 문서는 메인 앱이 SONGS API wrapper와 어떻게 연결되는지 정리한 참조 문서다.

## 1. 기본 원칙

- 메인 앱은 외부 음악 엔진 본체를 직접 호출하지 않는다.
- 모든 생성/상태 조회는 SONGS API wrapper를 통해 처리한다.
- 운영과 개발은 같은 코드라도 환경 변수로 연결 대상을 분리한다.

## 2. 주요 환경 변수

```env
MUSIC_PROVIDER_MODE=songs
SONGS_API_BASE_URL=https://suno.songsai.org
```

개발 테스트 시에는 아래처럼 테스트 wrapper를 볼 수 있다.

```env
SONGS_API_BASE_URL=http://dev-suno.songsai.org
```

## 3. 메인 앱에서 사용하는 주요 wrapper API

- `POST /api/custom_generate`
- `GET /api/get?ids=...`
- `GET /api/get_limit`

## 4. 현재 메인 앱 기준 방향

- 수동/자동 모두 wrapper를 통해 처리
- 자동 가사 생성은 `gpt_description_prompt` 기반 payload 사용
- 세부 실험 이력은 `ai_auto_lyrics_handoff.md` 에 정리

## 5. 주의점

- SONGS API wrapper는 실제로 외부 세션/CAPTCHA 상태의 영향을 받을 수 있다.
- wrapper 이슈는 코드 문제와 외부 상태 문제를 같이 봐야 한다.
- 운영 반영 전에는 `dev-suno.songsai.org` 에서 먼저 검증한다.
