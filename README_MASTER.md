# README MASTER

이 문서는 SONGSAI 작업을 다시 시작할 때 가장 먼저 보는 메인 입구 문서다.

## 프로젝트 구조

### `D:\music`
- 메인 서비스
- 관리자
- 크레딧
- 음악 생성
- 듣기 / 다운로드
- 비디오 생성

### `D:\songsai-bank-bridge`
- 입금 문자 webhook
- 문자 파싱
- 자동 매칭
- 모니터링 / 운영 보조

### `D:\wrapper`
- Suno 연동 wrapper
- CAPTCHA
- 브라우저 세션
- polling / 상태 조회
- 가장 민감한 리스크 구간

## 큰 흐름

1. 사용자는 `music` 에서 생성 요청을 넣는다.
2. `music` 은 wrapper 를 호출한다.
3. wrapper 가 Suno 와 통신하고 상태를 polling 한다.
4. `music` 은 결과를 DB에 저장하고 UI에 보여준다.
5. 입금 / 충전 운영은 `songsai-bank-bridge` 가 보조한다.

## 지금 봐야 할 문서

1. [CURRENT_STATUS.md](/d:/music/CURRENT_STATUS.md)
2. [NEXT_ACTIONS.md](/d:/music/NEXT_ACTIONS.md)
3. [WRAPPER_NOTES.md](/d:/music/WRAPPER_NOTES.md)
4. [DEPLOYMENT.md](/d:/music/DEPLOYMENT.md)
5. [BANK_BRIDGE.md](/d:/music/BANK_BRIDGE.md)

## 현재 핵심 판단

- 사용자-facing 안정화는 `music` 에서 이뤄진다.
- 실제 생성 안정성 병목은 대부분 `wrapper` 에 있다.
- `songsai-bank-bridge` 는 운영 자동화 보조 축이다.
