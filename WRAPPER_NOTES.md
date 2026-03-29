# WRAPPER NOTES

## 확인된 사실

- Suno 실제 완성 가사는 `metadata.prompt`
- `metadata.gpt_description_prompt` 는 생성 설명 템플릿
- `model_name: chirp-fenix`
- `major_model_version: v5.5`

## 가장 민감한 구간

- CAPTCHA
- 세션 / 쿠키
- persistent browser profile
- 브라우저 자동 입력
- `Create` 클릭
- polling 결과 시점 차이

## GUI 세션 메모

- SSH 세션에서 headed Chromium 실행은 실패한다.
- `Missing X server or $DISPLAY` 가 뜨면 GUI 세션이 아니다.
- RustDesk 로 접속한 Ubuntu 데스크탑에서 `echo $DISPLAY` 결과가 `:0` 인 터미널에서만 headed 브라우저 실행 가능

## 현재 판단

- wrapper 는 구조적으로 불가능한 것은 아니다.
- 하지만 외부 상태 변화 영향을 크게 받는다.
- 운영 반영 전 반복 검증이 필요하다.
