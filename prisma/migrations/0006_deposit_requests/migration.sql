DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'DepositRequestStatus'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "DepositRequestStatus" AS ENUM (
      'PENDING',
      'AUTO_MATCHED',
      'APPROVED',
      'REJECTED',
      'CANCELLED'
    );
  END IF;
END $$;

CREATE TABLE "DepositRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "requestedAmount" INTEGER NOT NULL,
  "requestedCredits" INTEGER NOT NULL,
  "depositorName" TEXT NOT NULL,
  "bankName" TEXT NOT NULL,
  "accountNumberSnapshot" TEXT NOT NULL,
  "status" "DepositRequestStatus" NOT NULL DEFAULT 'PENDING',
  "autoMatchedAt" TIMESTAMP(3),
  "matchedNotificationId" TEXT,
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "memo" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DepositRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DepositRequest_userId_createdAt_idx" ON "DepositRequest"("userId", "createdAt");
CREATE INDEX "DepositRequest_status_createdAt_idx" ON "DepositRequest"("status", "createdAt");
CREATE INDEX "DepositRequest_requestedAmount_status_idx" ON "DepositRequest"("requestedAmount", "status");
CREATE INDEX "DepositRequest_depositorName_idx" ON "DepositRequest"("depositorName");

ALTER TABLE "DepositRequest"
ADD CONSTRAINT "DepositRequest_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
