-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('PENDING', 'READY', 'FAILED', 'DELETED');

-- CreateEnum
CREATE TYPE "MusicAssetType" AS ENUM (
  'MP3',
  'COVER_IMAGE',
  'ALIGNED_LYRICS_RAW_JSON',
  'ALIGNED_LYRICS_LINES_JSON',
  'TITLE_TEXT'
);

-- CreateTable
CREATE TABLE "MusicAsset" (
  "id" TEXT NOT NULL,
  "musicId" TEXT NOT NULL,
  "assetType" "MusicAssetType" NOT NULL,
  "status" "AssetStatus" NOT NULL DEFAULT 'PENDING',
  "sourceUrl" TEXT,
  "storagePath" TEXT,
  "publicUrl" TEXT,
  "mimeType" TEXT,
  "fileSize" INTEGER,
  "errorMessage" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MusicAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MusicAsset_musicId_assetType_key" ON "MusicAsset"("musicId", "assetType");

-- CreateIndex
CREATE INDEX "MusicAsset_musicId_status_idx" ON "MusicAsset"("musicId", "status");

-- CreateIndex
CREATE INDEX "MusicAsset_assetType_status_idx" ON "MusicAsset"("assetType", "status");

-- AddForeignKey
ALTER TABLE "MusicAsset"
ADD CONSTRAINT "MusicAsset_musicId_fkey"
FOREIGN KEY ("musicId") REFERENCES "Music"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
