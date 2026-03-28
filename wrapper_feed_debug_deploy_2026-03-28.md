# Wrapper Raw Feed Debug Deploy

## 1. FTP로 서버에 올릴 파일

- `D:\wrapper\suno-api\src\lib\SunoApi.ts`

참고용 env 스니펫 파일:

- `D:\music\wrapper_feed_debug_env_snippet_2026-03-28.txt`

이 스니펫 내용:

```env
SUNO_DEBUG_RAW_FEED=true
```

## 2. 서버에서 실행할 순서

### 1) 서버 접속

```bash
ssh -p 2233 young@211.247.107.135
```

### 2) 프로젝트 위치로 이동

```bash
cd ~/services/suno-api-dev
```

### 3) env 수정

```bash
nano .env.local
```

아래 한 줄 추가:

```env
SUNO_DEBUG_RAW_FEED=true
```

저장:

- `Ctrl + O`
- `Enter`
- `Ctrl + X`

### 4) 기존 dev 서버 종료

```bash
pkill -f "next dev"
```

### 5) dev 서버 다시 실행

```bash
cd ~/services/suno-api-dev
nohup env PORT=3201 npm run dev > dev.log 2>&1 &
```

### 6) 로그 보기

```bash
tail -f dev.log
```

## 3. 그 다음 할 일

- 메인 앱에서 음악 생성 1회
- 또는 wrapper의 `/api/get` 이 1회 호출되게 만들기

그러면 로그에 아래 문구가 뜹니다.

```txt
[SunoApi.get] raw first clip:
```

그 아래 JSON을 복사해서 확인하면 됩니다.

## 4. 이번 작업에서 서버에 올릴 것 / 내릴 것

올릴 것:

- `src/lib/SunoApi.ts`

내릴 것:

- 없음

재시작할 것:

- `suno-api-dev`
