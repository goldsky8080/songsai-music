ALTER TABLE "Music"
ADD COLUMN IF NOT EXISTS "requestGroupId" TEXT;

CREATE INDEX IF NOT EXISTS "Music_requestGroupId_createdAt_idx"
ON "Music"("requestGroupId", "createdAt");
