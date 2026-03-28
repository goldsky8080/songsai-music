# Deposit Integration Design

## 1. 목적

이 문서는 `songsai-music` 메인 프로젝트와 `songsai-bank-bridge` 보조 프로젝트가
입금 요청과 자동 매칭을 어떤 방식으로 연결할지 설계한 문서다.

현재 목표는 다음과 같다.

- 사용자가 충전 요청을 생성한다
- bank bridge 가 입금 알림을 수신한다
- bank bridge 가 메인 앱의 입금 요청과 자동 매칭한다
- 최종 승인과 크레딧 지급은 메인 앱에서 처리한다

즉, 이 문서는 메인 앱 기준의 `DepositRequest` 모델과 내부 API 계약을 정의한다.

## 2. 역할 분리

### songsai-music

- 사용자 충전 요청 생성
- 관리자 승인/반려
- 유료 크레딧 지급
- 거래내역 기록

### songsai-bank-bridge

- 입금 문자 또는 알림 수신
- 알림 파싱
- 입금 요청 후보 매칭
- 메인 앱에 자동 매칭 결과 전달

## 3. 메인 앱 DB 모델 제안

메인 앱 `prisma/schema.prisma` 에 아래 모델을 추가하는 방향을 추천한다.

```prisma
enum DepositRequestStatus {
  PENDING
  AUTO_MATCHED
  APPROVED
  REJECTED
  CANCELLED
}

model DepositRequest {
  id                   String               @id @default(cuid())
  userId               String
  requestedAmount      Int
  requestedCredits     Int
  depositorName        String
  bankName             String
  accountNumberSnapshot String
  status               DepositRequestStatus @default(PENDING)
  autoMatchedAt        DateTime?
  matchedNotificationId String?
  approvedBy           String?
  approvedAt           DateTime?
  rejectedAt           DateTime?
  memo                 String?
  createdAt            DateTime             @default(now())
  updatedAt            DateTime             @updatedAt

  user                 User                 @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([status, createdAt])
  @@index([requestedAmount, status])
  @@index([depositorName])
}
```

## 4. DepositRequest 필드 설명

- `userId`
  - 요청 사용자 식별자
- `requestedAmount`
  - 사용자가 입금할 실제 금액
- `requestedCredits`
  - 승인 시 지급할 유료 크레딧
- `depositorName`
  - 사용자가 입력한 입금자명
- `bankName`
  - 입금받을 은행명 표시용
- `accountNumberSnapshot`
  - 요청 시점 기준 계좌 정보 스냅샷
- `status`
  - 현재 요청 상태
- `autoMatchedAt`
  - bank bridge 가 자동 매칭 처리한 시각
- `matchedNotificationId`
  - bank bridge 의 알림 id 또는 외부 참조 id
- `approvedBy`
  - 승인 관리자 식별자
- `approvedAt`
  - 승인 시각
- `rejectedAt`
  - 반려 시각
- `memo`
  - 관리자 메모

## 5. 상태 흐름

메인 앱의 입금 요청 상태는 아래 흐름을 기준으로 한다.

1. `PENDING`
2. `AUTO_MATCHED`
3. `APPROVED`

또는

1. `PENDING`
2. `REJECTED`

또는

1. `PENDING`
2. `CANCELLED`

중요:

- bank bridge 는 `APPROVED` 를 만들지 않는다
- bank bridge 는 최대 `AUTO_MATCHED` 까지만 올린다
- `APPROVED` 는 반드시 메인 앱 관리자 액션으로만 바뀐다

## 6. 메인 앱 API 제안

### 사용자용 API

#### `POST /api/deposits`

역할:
- 사용자가 입금 요청 생성

요청 예시:

```json
{
  "requestedAmount": 5000,
  "requestedCredits": 5000,
  "depositorName": "홍길동"
}
```

서버 처리:
- 상품 정책 검증
- 계좌 정보 스냅샷 저장
- `DepositRequest(PENDING)` 생성

#### `GET /api/deposits`

역할:
- 현재 로그인 사용자의 입금 요청 목록 조회

### 관리자용 API

#### `GET /api/admin/deposits`

역할:
- 전체 입금 요청 조회
- 상태 필터, 금액 필터, 사용자 검색 지원

#### `POST /api/admin/deposits/:id/approve`

역할:
- 요청 승인

서버 처리:
- `DepositRequest.status = APPROVED`
- `CreditGrant(PAID)` 생성
- `User.paidCredits` 반영
- `Transaction(DEPOSIT)` 기록

#### `POST /api/admin/deposits/:id/reject`

역할:
- 요청 반려

## 7. bank-bridge 전용 내부 API 제안

이 API 는 외부 사용자용이 아니라 `songsai-bank-bridge` 가 호출하는 내부 endpoint 다.

인증 방식:

- `X-Bridge-Secret` 헤더 사용
- 값은 서버 env 에 저장

### `GET /api/internal/deposits/pending`

역할:
- 현재 `PENDING` 상태 요청 목록을 bridge 에 제공

응답 예시:

```json
{
  "items": [
    {
      "id": "dep_1",
      "userId": "user_1",
      "email": "user@example.com",
      "depositorName": "홍길동",
      "requestedAmount": 5000,
      "requestedCredits": 5000,
      "status": "PENDING",
      "createdAt": "2026-03-26T06:00:00.000Z"
    }
  ]
}
```

### `POST /api/internal/deposits/:id/mark-auto-matched`

역할:
- bridge 가 특정 입금 요청을 자동 매칭 후보로 표시

요청 예시:

```json
{
  "notificationId": "notif_1",
  "score": 95,
  "note": "금액 일치, 입금자명 일치, 최근 10분 이내"
}
```

서버 처리:
- 현재 상태가 `PENDING` 인 경우에만 `AUTO_MATCHED`
- `autoMatchedAt` 저장
- `matchedNotificationId` 저장
- 필요하면 관리자 UI 에 강조 표시

### `POST /api/internal/deposits/sync`

역할:
- bridge 가 메인 앱 입금 요청을 스냅샷 동기화할 때 사용 가능

초기에는 없어도 되지만,
나중에 polling 대신 push 기반 동기화로 갈 수 있다.

## 8. 자동 매칭 기준

초기 규칙은 단순하게 가져간다.

가산점 기준 예시:

- 금액 완전 일치: +60
- 입금자명 완전 일치: +30
- 요청 생성 후 24시간 이내: +10

보수적으로 처리:

- 최고 점수 1건만 존재
- 점수 80 이상

이 조건일 때만 `AUTO_MATCHED`

그 외는:

- bridge 에서는 `AMBIGUOUS` 또는 `UNMATCHED`
- 메인 앱 상태는 그대로 `PENDING`

## 9. 승인 처리 원칙

승인 API 는 반드시 DB 트랜잭션으로 처리한다.

한 번의 승인에서 함께 처리할 것:

1. `DepositRequest.status = APPROVED`
2. `CreditGrant(PAID)` 생성
3. `User.paidCredits` 증가
4. `Transaction(DEPOSIT, COMPLETED)` 생성

즉, 부분 성공이 생기지 않게 해야 한다.

## 10. 사용자 화면 제안

충전 페이지 [page.tsx](/d:/music/app/credits/page.tsx)에 아래를 추가한다.

- 충전 상품 카드
- 입금 계좌 표시
- 입금자명 입력
- 입금 요청 버튼
- 내 요청 상태 목록

표시 문구 예:

- `입금 후 관리자 확인이 완료되면 유료 크레딧이 지급됩니다.`
- `자동 매칭되면 더 빠르게 처리될 수 있습니다.`

## 11. 관리자 화면 제안

관리자 페이지 [page.tsx](/d:/music/app/admin/page.tsx)에 입금 요청 섹션 추가

표시 항목:

- 이메일
- 요청 금액
- 지급 예정 크레딧
- 입금자명
- 상태
- 자동 매칭 여부
- 신청 시각

액션:

- 승인
- 반려
- 메모 저장

## 12. 지금 기준 다음 단계

이 설계 문서 다음으로 바로 이어질 작업은 아래다.

1. `songsai-music` 의 Prisma 모델 초안 반영 여부 결정
2. `songsai-bank-bridge` webhook payload 문서 작성
3. 내부 API request/response 타입 정의
4. 관리자 UI 최소 화면 설계
