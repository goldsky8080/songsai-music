import path from "node:path";
import { AssetStatus, MusicAssetType, Prisma } from "@prisma/client";

const MUSIC_ASSET_ROOT = path.join(process.cwd(), "storage", "music-assets");

export const MUSIC_ASSET_DIRS: Record<MusicAssetType, string> = {
  [MusicAssetType.MP3]: path.join(MUSIC_ASSET_ROOT, "audio"),
  [MusicAssetType.COVER_IMAGE]: path.join(MUSIC_ASSET_ROOT, "images"),
  [MusicAssetType.ALIGNED_LYRICS_RAW_JSON]: path.join(MUSIC_ASSET_ROOT, "lyrics-raw"),
  [MusicAssetType.ALIGNED_LYRICS_LINES_JSON]: path.join(MUSIC_ASSET_ROOT, "lyrics-lines"),
  [MusicAssetType.TITLE_TEXT]: path.join(MUSIC_ASSET_ROOT, "titles"),
};

export function getMusicAssetDir(assetType: MusicAssetType) {
  return MUSIC_ASSET_DIRS[assetType];
}

export function getMusicAssetPath(params: {
  musicId: string;
  assetType: MusicAssetType;
  extension: string;
}) {
  const extension = params.extension.startsWith(".") ? params.extension : `.${params.extension}`;
  return path.join(getMusicAssetDir(params.assetType), `${params.musicId}${extension}`);
}

export type MusicAssetRecordInput = {
  musicId: string;
  assetType: MusicAssetType;
  sourceUrl?: string | null;
  storagePath?: string | null;
  publicUrl?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  errorMessage?: string | null;
  metadata?: Prisma.InputJsonValue | null;
  status?: AssetStatus;
};

export function buildMusicAssetUpsertData(input: MusicAssetRecordInput) {
  return {
    where: {
      musicId_assetType: {
        musicId: input.musicId,
        assetType: input.assetType,
      },
    },
    create: {
      musicId: input.musicId,
      assetType: input.assetType,
      status: input.status ?? AssetStatus.PENDING,
      sourceUrl: input.sourceUrl ?? null,
      storagePath: input.storagePath ?? null,
      publicUrl: input.publicUrl ?? null,
      mimeType: input.mimeType ?? null,
      fileSize: input.fileSize ?? null,
      errorMessage: input.errorMessage ?? null,
      metadata: input.metadata ?? undefined,
    },
    update: {
      status: input.status ?? AssetStatus.PENDING,
      sourceUrl: input.sourceUrl ?? null,
      storagePath: input.storagePath ?? null,
      publicUrl: input.publicUrl ?? null,
      mimeType: input.mimeType ?? null,
      fileSize: input.fileSize ?? null,
      errorMessage: input.errorMessage ?? null,
      metadata: input.metadata ?? undefined,
    },
  };
}
