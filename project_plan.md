# 프로젝트명: AI 트로트/음악 생성 웹 플랫폼 (Suno AI 기반)

## 1. 프로젝트 목표
사용자가 가사와 음악 스타일을 입력하면 AI로 음악을 생성하고, 필요 시 이미지와 자막을 합성해 영상까지 만들 수 있는 웹 기반 서비스를 구축한다.

이 프로젝트의 1차 목표는 "사용자가 실제로 원하는 스타일의 음악을 빠르게 생성하고 다운로드할 수 있는가"를 검증하는 것이다. 영상 합성은 중요한 기능이지만, 초기에는 음악 생성 자체의 안정성과 결제/포인트 흐름을 먼저 검증하는 것이 우선이다.

## 2. 문제 정의
- 사용자는 직접 작곡하지 않아도 간단한 입력만으로 트로트/가요 스타일의 음악을 만들고 싶어한다.
- 생성된 음악을 유튜브 업로드용 콘텐츠로 활용하려는 수요가 있다.
- 음악 생성과 영상 제작을 각각 따로 처리하면 번거롭기 때문에, 한 플랫폼 안에서 일괄 처리할 수 있는 경험이 필요하다.

## 3. MVP 전략
초기 MVP는 한 번에 모든 기능을 넣기보다 2단계로 나눠 개발한다.

### 3-1. 1차 MVP
- 회원 가입 및 로그인
- 사용자 포인트 관리
- 가사 및 스타일 입력
- Suno 기반 음악 생성 요청
- 생성 결과(MP3) 저장 및 다운로드
- 생성 이력 조회

1차 MVP의 핵심은 "음악 생성이 안정적으로 되는가"와 "사용자가 이 결과물에 비용을 지불할 의사가 있는가"를 검증하는 것이다.

### 3-2. 2차 MVP
- 사용자 이미지 업로드
- 자막(.srt) 생성 또는 업로드
- MP3 + 이미지 + 자막 기반 MP4 생성
- 결과 영상 저장 및 다운로드
- 유튜브 업로드용 포맷 지원

2차 MVP는 1차 MVP가 안정화된 이후 붙이는 것이 바람직하다. 영상 인코딩은 처리 시간이 길고 장애 포인트가 많아, 초기부터 함께 넣으면 문제 원인 분리가 어려워질 수 있다.

## 4. 핵심 기능 정의
### 4-1. 사용자 관리
- 이메일 기반 회원 가입/로그인
- 사용자별 포인트 잔액 관리
- 충전/사용 내역 조회
- 관리자 수동 충전 기능

### 4-2. 음악 생성
- 가사 입력
- 스타일 입력: 장르, BPM, 악기, 분위기
- Suno 비공식 API 연동
- 생성 요청 상태 확인: pending, processing, completed, failed
- 생성 실패 시 사유 저장 및 사용자 안내

### 4-3. 미디어 처리
- 생성된 MP3를 기반으로 영상 렌더링
- 배경 이미지 1장 또는 여러 장 지원 가능하도록 고려
- 자막 타이밍 데이터가 있으면 자동 자막 합성
- 자막 데이터가 없을 경우 fallback 처리

### 4-4. 콘텐츠 보관함
- 사용자별 생성 이력 조회
- MP3 다운로드
- MP4 다운로드
- 상태별 필터링 및 재시도 지원

## 5. 권장 기술 스택
- Frontend: Next.js (App Router), Tailwind CSS
- Backend: Next.js API Routes 또는 Route Handlers
- Database: PostgreSQL + Prisma
- Queue: Redis + BullMQ
- Worker: Python + FFmpeg
- Storage: S3 우선, 초기 개발 단계에서는 Local Storage 가능
- AI Provider Layer: Suno API 래퍼 + 향후 다른 공급자 교체 가능한 추상화 계층

초기 단계에서는 Next.js 단일 프로젝트 구조가 개발 속도 측면에서 유리하다. 단, 영상 인코딩처럼 오래 걸리는 작업은 반드시 별도 워커로 분리한다.

## 6. 시스템 아키텍처 제안
1. Client가 가사, 스타일, 이미지 등을 입력해 생성 요청
2. Server가 사용자 인증 및 포인트 차감 가능 여부 확인
3. Server가 음악 생성 작업을 등록
4. AI Service Layer가 Suno API 호출
5. 결과 MP3와 메타데이터를 저장
6. 영상 생성이 필요한 경우 Queue에 렌더링 작업 등록
7. Worker가 FFmpeg로 MP4 생성 후 Storage에 업로드
8. Client가 상태 조회 후 결과 다운로드

## 7. 설계상 핵심 원칙
### 7-1. 외부 AI 의존성 분리
Suno는 비공식 API 기반이므로 세션 만료, 응답 포맷 변경, 사용 제한 등의 리스크가 있다. 따라서 AI 호출 로직은 서비스 전반에 흩어지지 않게 `AI Service Layer`로 감싸는 것이 중요하다.

예시 인터페이스:
- `createMusic(input)`
- `getMusicStatus(taskId)`
- `cancelMusic(taskId)`

이 구조를 잡아두면 추후 Google Lyria 등 다른 API로 교체하기 쉬워진다.

### 7-2. 비동기 처리 우선
음악 생성과 영상 인코딩은 즉시 완료되지 않을 수 있으므로, 요청-응답 방식만으로 처리하지 말고 작업 상태 중심으로 설계해야 한다.

추천 상태값:
- `queued`
- `processing`
- `completed`
- `failed`
- `cancelled`

### 7-3. 포인트 차감 정책 명확화
포인트는 생성 요청 시점에 바로 차감할지, 완료 시점에 차감할지 정책이 필요하다.

권장 방식:
- 요청 시 선차감
- 실패 시 자동 환불
- 모든 차감/환불 내역은 트랜잭션 로그로 기록

## 8. 주요 리스크와 대응 방안
### 8-1. Suno 비공식 API 리스크
- 위험: 세션 만료, 차단, 응답 구조 변경
- 대응:
  - Cookie 만료 감지 및 관리자 알림
  - 재시도 로직
  - 실패 로그 저장
  - Provider 추상화 계층 도입

### 8-2. 영상 인코딩 리소스 부담
- 위험: CPU 사용량 증가, 처리 지연, 서버 다운
- 대응:
  - Worker 분리
  - 동시 작업 수 제한
  - FFmpeg preset 최적화
  - 작업 큐 기반 처리

### 8-3. 사용자 경험 저하
- 위험: 생성 시간이 길어 이탈 가능
- 대응:
  - 상태 표시 UI 제공
  - 완료 알림
  - 실패 시 재시도 제공
  - 예상 대기시간 표시 검토

### 8-4. 저작권 및 운영 정책
- 위험: 상업적 사용 가능 범위 불명확
- 대응:
  - 이용약관 및 운영정책 명시
  - 생성물의 사용 범위 사전 안내
  - 외부 공급자 정책 변경 시 즉시 대응 가능한 구조 확보

## 9. 데이터 모델 초안
### 9-1. User
- `id`
- `email`
- `passwordHash`
- `points`
- `tier`
- `role`
- `createdAt`
- `updatedAt`

### 9-2. Music
- `id`
- `userId`
- `lyrics`
- `stylePrompt`
- `provider`
- `providerTaskId`
- `mp3Url`
- `status`
- `duration`
- `errorMessage`
- `createdAt`
- `updatedAt`

### 9-3. Video
- `id`
- `musicId`
- `mp4Url`
- `bgImageUrl`
- `srtUrl`
- `status`
- `errorMessage`
- `createdAt`
- `updatedAt`

### 9-4. Transaction
- `id`
- `userId`
- `amount`
- `type`
- `status`
- `balanceAfter`
- `memo`
- `approvedBy`
- `createdAt`

### 9-5. GenerationJob
- `id`
- `userId`
- `targetType`
- `targetId`
- `jobType`
- `queueStatus`
- `attemptCount`
- `payload`
- `result`
- `errorMessage`
- `createdAt`
- `updatedAt`

`GenerationJob` 테이블은 작업 큐와 운영 로그를 연결하는 데 유용하다. 음악 생성과 영상 생성 모두 같은 패턴으로 추적할 수 있어 운영성이 좋아진다.

## 10. API 설계 초안
### 인증/사용자
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/me`

### 포인트
- `GET /api/transactions`
- `POST /api/admin/points/charge`

### 음악 생성
- `POST /api/music`
- `GET /api/music`
- `GET /api/music/:id`
- `POST /api/music/:id/retry`

### 영상 생성
- `POST /api/videos`
- `GET /api/videos/:id`

## 11. 개발 우선순위
### Phase 1
- Next.js 프로젝트 초기 세팅
- Prisma + PostgreSQL 연결
- 회원 인증 구현
- 사용자/포인트 기본 모델 구현

### Phase 2
- Suno 연동 래퍼 구현
- 음악 생성 API 구현
- 작업 상태 저장 구조 구현
- 생성 결과 목록/상세 UI 구현

### Phase 3
- Redis + BullMQ 연동
- Python Worker 구축
- FFmpeg 기반 MP4 생성
- 다운로드 및 보관함 정리

### Phase 4
- 관리자 기능
- 환불/실패 처리 고도화
- 모니터링 및 로그 수집
- 향후 다른 AI Provider 연동 준비

## 12. 최종 의견
이 프로젝트는 수요가 있을 가능성이 충분하지만, 기술적으로 가장 큰 리스크는 음악 생성 모델이 아니라 `비공식 Suno API 의존성`이다. 따라서 초기에는 "예쁘고 많은 기능"보다 "생성이 실제로 안정적으로 돌아가는가"를 먼저 검증해야 한다.

가장 좋은 전략은 다음과 같다.
- 1차 출시에서는 MP3 생성과 포인트 흐름에 집중한다.
- 영상 생성은 별도 워커 구조까지 포함해 2차로 확장한다.
- AI Provider Layer와 Job 상태 관리 구조를 초기에 제대로 잡는다.

이 원칙만 지키면 이후 확장성과 운영 안정성이 크게 좋아질 가능성이 높다.
