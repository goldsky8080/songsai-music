ALTER TABLE "Music"
ADD COLUMN "isBonusTrack" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "bonusUnlockedAt" TIMESTAMP(3);

CREATE INDEX "Music_requestGroupId_isBonusTrack_createdAt_idx"
ON "Music"("requestGroupId", "isBonusTrack", "createdAt");
