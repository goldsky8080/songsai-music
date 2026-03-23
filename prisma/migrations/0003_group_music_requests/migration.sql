ALTER TABLE "Music"
ADD COLUMN "requestGroupId" TEXT;

CREATE INDEX "Music_requestGroupId_createdAt_idx"
ON "Music"("requestGroupId", "createdAt");
