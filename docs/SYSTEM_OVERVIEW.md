# System Overview

이 문서는 `D:\music`, `D:\songsai-bank-bridge`, `D:\wrapper` 를 함께 보는 전체 구조 요약 문서다.

## 1. 프로젝트 구성

### 메인 서비스

- 경로: [D:\music](D:/music)
- 역할:
  - 사용자 로그인
  - 크레딧
  - 음악 생성
  - 최근 생성 목록
  - 듣기 / 다운로드
  - 비디오 생성 UI/로직
  - 관리자 기능

### 입금 자동화 서비스

- 경로: [D:\songsai-bank-bridge](D:/songsai-bank-bridge)
- 역할:
  - 입금 문자 webhook 수신
  - 문자 원문 저장
  - 금액 / 입금자명 파싱
  - 입금 요청과 자동 매칭
  - 운영 모니터링

### Suno wrapper

- 경로: [D:\wrapper](D:/wrapper)
- 실제 API 프로젝트: [D:\wrapper\suno-api](D:/wrapper/suno-api)
- 역할:
  - Suno 연동
  - 세션 유지
  - CAPTCHA 대응
  - polling
  - recent result matching

## 2. 책임 분리

### `music`

제품 본체다.
사용자가 실제로 접속하는 화면과 핵심 비즈니스 로직은 대부분 여기 있다.

현재 중요한 축:
- 음악 생성
- 자산 준비(`MusicAsset`)
- 재생 / 다운로드
- 비디오 생성
- 관리자 / 크레딧

### `songsai-bank-bridge`

제품 본체는 아니지만, 운영 자동화 쪽에서 중요하다.
입금 승인 전에 “자동 매칭 후보”를 만드는 보조 시스템으로 보면 된다.

### `wrapper`

가장 외부 의존성이 큰 구간이다.
Suno UI/세션/쿠키/CAPTCHA 변화에 가장 민감하다.
즉 기능 문제보다 운영 안정성 리스크가 더 크다.

## 3. 현재 큰 흐름

### 음악 생성

1. `music` 에서 생성 요청
2. `wrapper` 로 전달
3. `wrapper` 가 Suno 쪽 처리
4. 결과를 `music` 이 저장
5. 최근 생성 목록 / 듣기 / 다운로드에 반영

### 재생 / 다운로드

1. 사용자가 듣기 또는 다운로드 시도
2. `music` 이 `MusicAsset` 저장본을 우선 확인
3. 없으면 provider/wrapper 쪽 최신 상태를 확인
4. mp3 / 이미지 / 가사 타이밍 자산을 확보

### 비디오 생성

현재는 두 흐름이 섞여 있다.

- 과거:
  - 서버 ffmpeg 렌더
- 현재 실험:
  - 브라우저 렌더(canvas + ffmpeg.wasm)

핵심은 `MusicAsset` 으로 재료를 확보한 뒤 비디오에 재사용하는 방향이다.

### 입금 자동화

1. `songsai-bank-bridge` 가 문자 webhook 수신
2. 파싱
3. 메인 서비스의 입금 요청과 매칭
4. 운영자 확인 흐름에 연결

## 4. 운영 / 개발 구조

### 도메인

- 메인 앱: [https://songsai.org](https://songsai.org)
- 운영 wrapper: [https://suno.songsai.org](https://suno.songsai.org)
- 개발 wrapper: [https://dev-suno.songsai.org](https://dev-suno.songsai.org)

### 포트

- 메인 앱: `3000`
- 운영 wrapper: `3101`
- 개발 wrapper: `3201`
- PostgreSQL: `5432`

## 5. 현재 중요한 기술 판단

### 1. wrapper 가 가장 큰 리스크

특히 아래가 민감하다.

- CAPTCHA
- 세션 유지
- manual CAPTCHA 모드
- recent result matching

### 2. 비디오는 서버보다 브라우저 렌더 쪽을 탐색 중

이유:
- n100 서버에서 서버 렌더가 무겁다
- HTTP 요청 안에서 끝내기 어려웠다
- worker/queue 없이 오래 걸리는 작업은 운영상 불리하다

### 3. `MusicAsset` 이 중간 기반

mp3, 이미지, 가사 타이밍을 자산으로 저장해 두고,
재생/다운로드/비디오 생성에서 재사용하는 방향이 현재 가장 중요하다.

## 6. 지금 기준 우선순위

1. wrapper 안정화
2. 음악 생성 / 재생 / 다운로드 안정화
3. 비디오 생성 구조 정리
4. bank-bridge 자동화 연결
5. UI/브랜딩 고도화

## 7. 같이 볼 문서

- 전체 우선순위: [PRODUCT_AND_BACKLOG.md](D:/music/docs/PRODUCT_AND_BACKLOG.md)
- 배포/운영: [DEPLOYMENT_AND_OPERATIONS.md](D:/music/docs/DEPLOYMENT_AND_OPERATIONS.md)
- wrapper 상세: [SUNO_WRAPPER_INTEGRATION.md](D:/music/docs/SUNO_WRAPPER_INTEGRATION.md)
- 비디오 상세: [VIDEO_RENDER_PLAN.md](D:/music/docs/VIDEO_RENDER_PLAN.md)
- bank-bridge 상세: [BANK_BRIDGE_DESIGN.md](D:/music/docs/BANK_BRIDGE_DESIGN.md)

