# CURRENT STATUS

## music 현재 상태

### 완료된 것
- 음악 생성
- 최근 생성 목록
- 듣기 / 다운로드
- 가사 txt 다운로드 fallback 보강
- 커버 이미지 기반 세로형 비디오 생성

### 최근 중요 보강
- stale cookie 영향 완화
- 다운로드 0KB 방지
- 듣기 경로를 최종 mp3 URL 리다이렉트 방식으로 조정
- auto 곡 제목 보강

### 아직 불안정한 것
- 일부 곡 듣기 편차
- 최근 목록 fallback 문구 노출

## wrapper 현재 상태

### 확인된 사실
- 실제 완성 가사는 `metadata.prompt`
- `gpt_description_prompt` 는 설명용 템플릿
- `model_name: chirp-fenix`
- `major_model_version: v5.5`

### 불안정 구간
- CAPTCHA
- Chromium GUI 세션
- 세션 / 쿠키
- `Create` 자동 클릭

## bank-bridge 현재 상태

- 입금 문자 webhook / 파싱 / 자동 매칭 담당
- 메인 음악 생성 본체가 아니라 운영 자동화 축

## 비디오 현재 상태

- 현재 최종 상태는 자막 없는 버전
- 커버 이미지 기반
- 세로형 `9:16`
- 확대 / 이동 효과 포함
- 진행률 UI + 완료 후 자동 다운로드
