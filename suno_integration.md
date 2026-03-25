# Suno Integration Guide

이 문서는 메인 앱이 Suno wrapper와 어떻게 연결되는지 정리한 참조 문서다.

## 1. 기본 원칙

- 메인 앱은 Suno 본체를 직접 때리지 않는다
- wrapper를 통해 생성 요청과 상태 조회를 처리한다
- 운영과 개발은 같은 코드라도 환경 변수로 연결 대상을 분리한다

## 2. 주요 환경 변수

```env
MUSIC_PROVIDER_MODE=suno
SUNO_API_BASE_URL=https://suno.songsai.org
```

개발 테스트 시에는 아래처럼 테스트 wrapper를 볼 수 있다.

```env
SUNO_API_BASE_URL=http://dev-suno.songsai.org
```

## 3. 메인 앱에서 쓰는 주요 wrapper API

- `POST /api/custom_generate`
- `GET /api/get?ids=...`
- `GET /api/get_limit`

## 4. 현재 메인 앱 기준 방향

- 수동/자동 모두 wrapper를 통해 처리
- 자동 가사 생성은 `gpt_description_prompt` 기반 payload 사용
- 세부 실험 이력은 [ai_auto_lyrics_handoff.md](/d:/music/ai_auto_lyrics_handoff.md)에 기록

## 5. 주의점

- Suno는 공식 안정 API가 아니므로 세션/CAPTCHA 상태에 따라 흔들릴 수 있다
- wrapper 이슈는 코드 문제와 외부 상태 문제를 같이 봐야 한다
