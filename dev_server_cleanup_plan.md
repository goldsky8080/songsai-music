# Dev Server Cleanup Plan

이 문서는 운영 서버 1차 배포가 끝난 시점에서, 개발 서버를 어떤 순서로 정리하고 다음 개발 작업을 어디부터 다시 시작하면 좋은지 빠르게 판단하기 위한 기준 문서다.

## 1. 현재 상태 요약

### 운영에서 이미 검증된 것
- 메인 앱 Docker 배포 성공
- PostgreSQL 연결 성공
- Prisma 마이그레이션 성공
- Suno wrapper 연결 성공
- wrapper 운영 포트 `3101` 검증 완료
- 메인 앱에서 wrapper를 `http://host.docker.internal:3101` 로 바라보는 방식 검증 완료
- Nginx + HTTPS + Cloudflare 적용 성공
- `https://songsai.org` 외부 접속 성공
- Origin Certificate 재발급까지 완료

### 지금 개발 서버에서 다시 정리해야 하는 것
- 운영에서 검증된 값이 개발 문서/예시 파일과 완전히 맞는지 재점검
- 실제 사용자 흐름을 기준으로 UI/UX 보강 포인트 정리
- AI 자동 가사 기능 재개 전 선행 작업 정리
- 개발 환경에서 남은 임시 설정, 설명 부족한 문구, 중복 설정 정리
- 로컬 개발 앱이 실제 운영 wrapper 를 바라볼 때 필요한 공개 주소 전략 정리

## 2. 운영 기준으로 확정된 핵심 값

다음 값들은 앞으로 개발/배포 문서에서 기준값으로 유지한다.

- 메인 앱 포트: `3000`
- Suno wrapper 포트: `3101`
- PostgreSQL 포트: `5432`
- 메인 앱 내부에서 wrapper 접근 주소: `http://host.docker.internal:3101`
- 운영 도메인: `https://songsai.org`
- 메인 앱 실행 방식: Docker Compose
- wrapper 실행 방식: `npm run build && npm run start` + `systemd`
- 외부 공개 포트: `80`, `443`
- 공개 wrapper 권장 주소: `https://suno.songsai.org`

## 3. 개발/운영 환경 분리 원칙

같은 소스를 Git 에 올리고, 운영에서 pull 받은 뒤에도 음악 생성이 계속 되게 하려면 코드가 아니라 환경변수로 분리해야 한다.

### 운영 환경
- `APP_URL=https://songsai.org`
- `SUNO_API_BASE_URL=http://host.docker.internal:3101`
- `MUSIC_PROVIDER_MODE=suno`

### 로컬 개발 환경
선택지는 세 가지다.

1. 로컬 wrapper 사용
- `APP_URL=http://localhost:3000`
- `SUNO_API_BASE_URL=http://localhost:3101`
- `MUSIC_PROVIDER_MODE=suno`

2. 운영 wrapper 공개 주소 사용
- `APP_URL=http://localhost:3000`
- `SUNO_API_BASE_URL=https://suno.songsai.org`
- `MUSIC_PROVIDER_MODE=suno`

3. AI 자동 가사 테스트용 wrapper 사용
- `APP_URL=http://localhost:3000`
- `SUNO_API_BASE_URL=https://dev-suno.songsai.org`
- `MUSIC_PROVIDER_MODE=suno`

### 중요
현재 로컬 `.env` 가 예전 Vercel wrapper 를 보고 있으면 실제 생성이 불안정하다.
같은 소스로 개발과 운영을 모두 안정화하려면 운영 wrapper 를 외부에서 접근 가능한 별도 주소로 공개하는 것이 가장 깔끔하다.

## 4. 추천 공개 구조

### 메인 앱
- `songsai.org` -> 메인 앱

### wrapper
- `suno.songsai.org` -> Suno wrapper

### AI 자동 가사 테스트용 wrapper
- `dev-suno.songsai.org` -> 테스트 Suno wrapper
- 테스트 포트: `3201`
- 운영 wrapper 와 별도 디렉터리/프로세스로 유지

이 구조가 되면:
- 로컬 개발 앱은 `https://suno.songsai.org` 를 사용
- 운영 앱은 내부 주소 `http://host.docker.internal:3101` 을 사용
- 소스는 그대로 두고 env 만 나눠서 운영 가능

AI 자동 가사 기능처럼 wrapper 패치가 필요한 실험은 아래처럼 분리한다.

- 기본 로컬 개발: `https://suno.songsai.org`
- 자동 가사 테스트 시: `https://dev-suno.songsai.org`
- 운영 서비스는 항상 기존 `suno.songsai.org` 유지

## 5. 개발 서버 정리 체크리스트

### 5-1. 환경 변수 정리
- `.env.example` 는 안전한 mock 기본값으로 유지
- `.env.suno.example` 는 로컬 개발에서 실제 Suno wrapper 를 붙일 때 참고용으로 유지
- `deploy/.env.n100.example` 는 운영 서버용 기준으로 유지
- `APP_URL`, `SUNO_API_BASE_URL`, `MUSIC_PROVIDER_MODE` 의 개발/운영 차이를 문서화
- HTTPS 여부에 따라 세션 쿠키 동작이 달라진다는 점을 개발 메모에 유지

### 5-2. 배포 예시 파일 정리
다음 파일은 운영에서 실제 검증된 기준으로 유지한다.
- `Dockerfile`
- `deploy/docker-compose.n100.yml`
- `deploy/.env.n100.example`
- `deploy/nginx.music-platform.conf.example`
- `deploy/nginx.suno-wrapper.conf.example`
- `deploy/nginx.dev-suno-wrapper.conf.example`
- `deploy/systemd.music-app-docker.example.service`
- `deploy/systemd.suno-wrapper.example.service`

### 5-3. 문서 정리
읽는 순서를 아래 기준으로 맞춘다.
- 현재 상태와 Suno 이슈: `suno_progress_notes.md`
- 운영 구조와 확장 계획: `deployment_plan.md`
- N100 실제 배포 절차: `deploy/n100_quickstart.md`
- 개발 서버 정리/backlog: `dev_server_cleanup_plan.md`

### 5-4. 개발 서버 점검 명령
개발 서버를 다시 만질 때 우선 확인할 명령:

```bash
npm run build
npx prisma generate
```

필요 시 개발 서버 실행:

```bash
npm run dev
```

## 6. 추가 보강이 필요한 기능 목록

### 6-1. 인증/세션
- 운영/개발 환경별 세션 쿠키 동작 설명 보강
- 관리자 권한 관련 화면 또는 관리 액션 로그 설계 검토
- 로그인 실패/세션 만료 메시지 한국어 정리

### 6-2. 크레딧
- 관리자 수동 충전 화면
- 충전/차감/환불 내역 조회 화면
- 무료/유료 크레딧 표시를 더 직관적으로 정리
- 실패 환불 시 사용자에게 보이는 상태 문구 개선

### 6-3. 음악 생성 UX
- 생성 중/실패/완료 상태 표시 더 명확하게
- 모델 선택 설명 추가 (`v4.5+`, `v5` 차이)
- 보컬 선택과 스타일 태그의 관계를 사용자에게 설명
- 생성 목록 정렬/필터 및 최신 요청 강조
- 실패 원인 메시지를 한국어 중심으로 정리

### 6-4. 재생/다운로드
- 다운로드 파일명 규칙 개선
- 재생 버튼과 다운로드 버튼 시각 구분 강화
- 생성 완료 후 자동 새로고침 또는 수동 새로고침 안내 개선

### 6-5. AI 자동 가사
현재는 차단 상태다.

재개 조건:
- wrapper 에서 `gpt_description_prompt` 지원
- title/tags/mv/vocal_gender 와 동시 전달 가능
- 기존 인증 흐름 유지

실제 작업 위치:
- `gcui-art/suno-api`
- `src/app/api/custom_generate/route.ts`
- `src/lib/SunoApi.ts`

### 6-6. 영상 생성
- 현재는 후순위
- 음악 생성 흐름이 충분히 안정화된 뒤 진행
- MP3 생성/다운로드/상태 추적이 먼저 안정화되어야 함

## 7. 운영 서버는 잠시 보류하되 기억해야 할 명령

### 메인 앱/DB 상태 확인
```bash
cd ~/services/music/deploy
sudo docker compose -f docker-compose.n100.yml ps
```

### 메인 앱/DB 재시작
```bash
cd ~/services/music/deploy
sudo docker compose -f docker-compose.n100.yml down
sudo docker compose -f docker-compose.n100.yml up -d --build
```

### wrapper 상태 확인
```bash
sudo systemctl status suno-wrapper
```

### wrapper 재시작
```bash
sudo systemctl restart suno-wrapper
```

### wrapper 로그 확인
```bash
sudo journalctl -u suno-wrapper -f
```

### Nginx 설정 점검
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 8. 지금 시점의 추천 다음 작업

1. 로컬 `.env` 는 일단 mock 또는 기존 값 그대로 두고 유지
2. 운영 wrapper 를 `suno.songsai.org` 로 공개하는 서버 설정 추가
3. AI 자동 가사 재개 전에는 `dev-suno.songsai.org` 로 분리된 테스트 wrapper 준비
4. 로컬에서 실제 생성이 필요할 때는 `.env.suno.example` 값을 `.env` 로 복사해 사용
5. 그 다음 UI/문구/에러 표시 개선 작업으로 들어간다

## 9. AI 자동 가사 실험용 분리 운영 원칙

- 운영 wrapper(`suno.songsai.org`) 는 안정성 우선, 직접 패치 금지
- 테스트 wrapper(`dev-suno.songsai.org`) 에서만 `gpt_description_prompt` 관련 패치 실험
- 테스트 wrapper 는 상시 실행보다 필요할 때만 실행 권장
- N100 리소스 부담을 줄이기 위해 운영/테스트 wrapper 동시 부하 테스트는 짧게 진행
- 기능 검증이 끝난 뒤에만 운영 wrapper 반영 여부를 판단

## 10. 결론

지금은 큰 구조 변경보다, 이미 검증된 운영 구성을 기준으로 개발 문서와 환경 분리 원칙을 다듬는 단계다.
같은 소스를 개발/운영 양쪽에서 안정적으로 쓰려면, 로컬에서는 공개 wrapper 주소를 쓰고 운영에서는 내부 wrapper 주소를 쓰는 방식이 가장 깔끔하다.
AI 자동 가사처럼 위험도가 있는 실험은 `dev-suno.songsai.org` 같은 분리된 테스트 wrapper 에서 먼저 검증하는 편이 가장 안전하다.
