# SONGSAI Music Platform

이 저장소는 SONGSAI 메인 앱이다. 현재 코드 기준으로 아래 기능이 들어 있다.

- Google 로그인과 세션 기반 인증
- 크레딧 원장, 쿠폰, 관리자 지급
- 입금 요청 생성과 내부 자동화 연동 준비
- SONGS API 기반 음악 생성
- 최근 생성 목록, 재생, 다운로드, 보너스 트랙 열기
- 음악 자산 저장(`MusicAsset`)
- 커버 이미지와 가사 타이밍 기반 비디오 생성

프로젝트를 다시 파악할 때는 아래 3개만 보면 된다.

1. `README.md`
2. `docs/ARCHITECTURE.md`
3. `docs/OPERATIONS.md`

프로젝트가 어떻게 여기까지 왔는지 보려면 아래 문서를 추가로 보면 된다.

4. `docs/PROJECT_HISTORY.md`
5. `docs/ECOSYSTEM_OVERVIEW.md`
6. `docs/AGENT_START_HERE.md`
7. `docs/WORK_LOG.md`
8. `docs/MEDIA_STORAGE_AND_STREAMING_PLAN.md`

## 현재 구조

- 메인 앱: `D:\music`
- 외부 음악 생성 연동: SONGS API / wrapper 계열 서비스
- 입금 자동화 보조 서비스: `D:\songsai-bank-bridge` 별도 저장소

메인 앱은 Next.js 15 + React 19 + Prisma + PostgreSQL 조합이다.

## 지금 중요한 판단

- 가장 큰 운영 리스크는 메인 앱보다 외부 음악 생성 wrapper 안정성이다.
- 음악 결과물은 `MusicAsset` 으로 저장해 재생, 다운로드, 비디오 생성에 재사용하는 방향이 맞다.
- 비디오는 서버 렌더와 브라우저 렌더가 함께 존재하지만, 브라우저 렌더 비중이 커지고 있다.

## 현재 우선순위

1. 음악 생성 안정성
2. 다운로드와 자산 확보 안정성
3. 비디오 생성 품질과 처리 흐름 정리
4. 입금 자동화 연결 마무리
5. 관리자 UX와 메인 UI 개선
