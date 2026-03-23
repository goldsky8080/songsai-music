-- CreateEnum
CREATE TYPE "CreditKind" AS ENUM ('FREE', 'PAID');

-- CreateEnum
CREATE TYPE "CreditGrantStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Transaction"
ADD COLUMN "creditKind" "CreditKind";

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "freeCredits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "paidCredits" INTEGER NOT NULL DEFAULT 0;

-- Backfill
UPDATE "User"
SET "paidCredits" = COALESCE("points", 0);

-- CreateTable
CREATE TABLE "CreditGrant" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "creditKind" "CreditKind" NOT NULL,
  "amount" INTEGER NOT NULL,
  "remainingAmount" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastUsedAt" TIMESTAMP(3),
  "status" "CreditGrantStatus" NOT NULL DEFAULT 'ACTIVE',
  "source" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreditGrant_pkey" PRIMARY KEY ("id")
);

-- Backfill legacy points as paid credit grants
INSERT INTO "CreditGrant" (
  "id",
  "userId",
  "creditKind",
  "amount",
  "remainingAmount",
  "expiresAt",
  "status",
  "source",
  "createdAt",
  "updatedAt"
)
SELECT
  md5(random()::text || clock_timestamp()::text),
  "id",
  'PAID'::"CreditKind",
  "paidCredits",
  "paidCredits",
  NOW() + INTERVAL '60 days',
  'ACTIVE'::"CreditGrantStatus",
  'legacy_points_migration',
  NOW(),
  NOW()
FROM "User"
WHERE "paidCredits" > 0;

-- Drop legacy points column
ALTER TABLE "User"
DROP COLUMN "points";

-- CreateIndex
CREATE INDEX "CreditGrant_userId_creditKind_status_idx" ON "CreditGrant"("userId", "creditKind", "status");

-- CreateIndex
CREATE INDEX "CreditGrant_expiresAt_status_idx" ON "CreditGrant"("expiresAt", "status");

-- AddForeignKey
ALTER TABLE "CreditGrant"
ADD CONSTRAINT "CreditGrant_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
