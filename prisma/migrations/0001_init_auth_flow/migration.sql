-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "MusicStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'USAGE', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobTargetType" AS ENUM ('MUSIC', 'VIDEO');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('MUSIC_GENERATION', 'VIDEO_RENDER');

-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('QUEUED', 'ACTIVE', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "points" INTEGER NOT NULL DEFAULT 0,
  "tier" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'USER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Music" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lyrics" TEXT NOT NULL,
  "stylePrompt" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerTaskId" TEXT,
  "mp3Url" TEXT,
  "status" "MusicStatus" NOT NULL DEFAULT 'QUEUED',
  "duration" INTEGER,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Music_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Video" (
  "id" TEXT NOT NULL,
  "musicId" TEXT NOT NULL,
  "mp4Url" TEXT,
  "bgImageUrl" TEXT,
  "srtUrl" TEXT,
  "status" "VideoStatus" NOT NULL DEFAULT 'QUEUED',
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "type" "TransactionType" NOT NULL,
  "status" "TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
  "balanceAfter" INTEGER NOT NULL,
  "memo" TEXT,
  "approvedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationJob" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "musicId" TEXT,
  "videoId" TEXT,
  "targetType" "JobTargetType" NOT NULL,
  "jobType" "JobType" NOT NULL,
  "queueStatus" "QueueStatus" NOT NULL DEFAULT 'QUEUED',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "payload" JSONB,
  "result" JSONB,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Music_providerTaskId_key" ON "Music"("providerTaskId");

-- CreateIndex
CREATE INDEX "Music_userId_createdAt_idx" ON "Music"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Music_status_idx" ON "Music"("status");

-- CreateIndex
CREATE INDEX "Video_musicId_createdAt_idx" ON "Video"("musicId", "createdAt");

-- CreateIndex
CREATE INDEX "Video_status_idx" ON "Video"("status");

-- CreateIndex
CREATE INDEX "Transaction_userId_createdAt_idx" ON "Transaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_type_status_idx" ON "Transaction"("type", "status");

-- CreateIndex
CREATE INDEX "GenerationJob_userId_createdAt_idx" ON "GenerationJob"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "GenerationJob_queueStatus_jobType_idx" ON "GenerationJob"("queueStatus", "jobType");

-- CreateIndex
CREATE INDEX "GenerationJob_musicId_idx" ON "GenerationJob"("musicId");

-- CreateIndex
CREATE INDEX "GenerationJob_videoId_idx" ON "GenerationJob"("videoId");

-- AddForeignKey
ALTER TABLE "Music"
ADD CONSTRAINT "Music_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video"
ADD CONSTRAINT "Video_musicId_fkey"
FOREIGN KEY ("musicId") REFERENCES "Music"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction"
ADD CONSTRAINT "Transaction_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob"
ADD CONSTRAINT "GenerationJob_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob"
ADD CONSTRAINT "GenerationJob_musicId_fkey"
FOREIGN KEY ("musicId") REFERENCES "Music"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob"
ADD CONSTRAINT "GenerationJob_videoId_fkey"
FOREIGN KEY ("videoId") REFERENCES "Video"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
