import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { AssetStatus, MusicAssetType } from "@prisma/client";
import { db } from "@/lib/db";
import type { AlignedLyricLine } from "@/server/music/aligned-lyrics";
import type { ProviderAlignedLyricWord } from "@/server/music/types";
import { buildMusicAssetUpsertData, getMusicAssetPath, MUSIC_ASSET_DIRS } from "./assets";

function inferImageExtension(contentType?: string | null, sourceUrl?: string | null) {
  const normalized = contentType?.split(";")[0].trim().toLowerCase();

  switch (normalized) {
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/jpeg":
    case "image/jpg":
      return ".jpg";
    default:
      break;
  }

  const pathname = sourceUrl ? new URL(sourceUrl).pathname.toLowerCase() : "";
  const ext = path.extname(pathname);
  return ext || ".jpg";
}

async function ensureAssetDirs() {
  await Promise.all(Object.values(MUSIC_ASSET_DIRS).map((dir) => mkdir(dir, { recursive: true })));
}

async function saveRemoteFile(params: {
  url: string;
  assetType: MusicAssetType;
  musicId: string;
  fallbackExtension: string;
}) {
  const response = await fetch(params.url, {
    redirect: "follow",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`${params.assetType} 파일을 가져오지 못했습니다.`);
  }

  const fileBuffer = Buffer.from(await response.arrayBuffer());
  if (fileBuffer.byteLength === 0) {
    throw new Error(`${params.assetType} 파일이 비어 있습니다.`);
  }

  const contentType = response.headers.get("content-type");
  const extension =
    params.assetType === MusicAssetType.COVER_IMAGE
      ? inferImageExtension(contentType, params.url)
      : params.fallbackExtension;
  const storagePath = getMusicAssetPath({
    musicId: params.musicId,
    assetType: params.assetType,
    extension,
  });

  await writeFile(storagePath, fileBuffer);

  return {
    storagePath,
    mimeType: contentType ?? undefined,
    fileSize: fileBuffer.byteLength,
  };
}

async function saveJsonFile(params: {
  musicId: string;
  assetType: MusicAssetType;
  value: unknown;
}) {
  const serialized = JSON.stringify(params.value, null, 2);
  const storagePath = getMusicAssetPath({
    musicId: params.musicId,
    assetType: params.assetType,
    extension: ".json",
  });

  await writeFile(storagePath, serialized, "utf8");

  return {
    storagePath,
    mimeType: "application/json",
    fileSize: Buffer.byteLength(serialized, "utf8"),
  };
}

async function saveTextFile(params: {
  musicId: string;
  assetType: MusicAssetType;
  value: string;
}) {
  const text = params.value.trim();
  const storagePath = getMusicAssetPath({
    musicId: params.musicId,
    assetType: params.assetType,
    extension: ".txt",
  });

  await writeFile(storagePath, text, "utf8");

  return {
    storagePath,
    mimeType: "text/plain; charset=utf-8",
    fileSize: Buffer.byteLength(text, "utf8"),
  };
}

async function upsertFailedAsset(params: {
  musicId: string;
  assetType: MusicAssetType;
  sourceUrl?: string | null;
  errorMessage: string;
}) {
  await db.musicAsset.upsert(
    buildMusicAssetUpsertData({
      musicId: params.musicId,
      assetType: params.assetType,
      sourceUrl: params.sourceUrl,
      status: AssetStatus.FAILED,
      errorMessage: params.errorMessage,
    }),
  );
}

export async function syncMusicAssets(params: {
  musicId: string;
  mp3Url?: string | null;
  imageUrl?: string | null;
  alignedWords?: ProviderAlignedLyricWord[] | null;
  alignedLines?: AlignedLyricLine[] | null;
  titleText?: string | null;
}) {
  await ensureAssetDirs();

  if (params.mp3Url) {
    try {
      const stored = await saveRemoteFile({
        url: params.mp3Url,
        assetType: MusicAssetType.MP3,
        musicId: params.musicId,
        fallbackExtension: ".mp3",
      });

      await db.musicAsset.upsert(
        buildMusicAssetUpsertData({
          musicId: params.musicId,
          assetType: MusicAssetType.MP3,
          sourceUrl: params.mp3Url,
          storagePath: stored.storagePath,
          mimeType: stored.mimeType,
          fileSize: stored.fileSize,
          status: AssetStatus.READY,
          errorMessage: null,
        }),
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "MP3 저장에 실패했습니다.";
      await upsertFailedAsset({
        musicId: params.musicId,
        assetType: MusicAssetType.MP3,
        sourceUrl: params.mp3Url,
        errorMessage,
      });
    }
  }

  if (params.imageUrl) {
    try {
      const stored = await saveRemoteFile({
        url: params.imageUrl,
        assetType: MusicAssetType.COVER_IMAGE,
        musicId: params.musicId,
        fallbackExtension: ".jpg",
      });

      await db.musicAsset.upsert(
        buildMusicAssetUpsertData({
          musicId: params.musicId,
          assetType: MusicAssetType.COVER_IMAGE,
          sourceUrl: params.imageUrl,
          storagePath: stored.storagePath,
          mimeType: stored.mimeType,
          fileSize: stored.fileSize,
          status: AssetStatus.READY,
          errorMessage: null,
        }),
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "커버 이미지 저장에 실패했습니다.";
      await upsertFailedAsset({
        musicId: params.musicId,
        assetType: MusicAssetType.COVER_IMAGE,
        sourceUrl: params.imageUrl,
        errorMessage,
      });
    }
  }

  if (params.alignedWords && params.alignedWords.length > 0) {
    try {
      const stored = await saveJsonFile({
        musicId: params.musicId,
        assetType: MusicAssetType.ALIGNED_LYRICS_RAW_JSON,
        value: params.alignedWords,
      });

      await db.musicAsset.upsert(
        buildMusicAssetUpsertData({
          musicId: params.musicId,
          assetType: MusicAssetType.ALIGNED_LYRICS_RAW_JSON,
          storagePath: stored.storagePath,
          mimeType: stored.mimeType,
          fileSize: stored.fileSize,
          status: AssetStatus.READY,
          errorMessage: null,
          metadata: {
            count: params.alignedWords.length,
          },
        }),
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "aligned lyrics 원본 저장에 실패했습니다.";
      await upsertFailedAsset({
        musicId: params.musicId,
        assetType: MusicAssetType.ALIGNED_LYRICS_RAW_JSON,
        errorMessage,
      });
    }
  }

  if (params.alignedLines && params.alignedLines.length > 0) {
    try {
      const stored = await saveJsonFile({
        musicId: params.musicId,
        assetType: MusicAssetType.ALIGNED_LYRICS_LINES_JSON,
        value: params.alignedLines,
      });

      await db.musicAsset.upsert(
        buildMusicAssetUpsertData({
          musicId: params.musicId,
          assetType: MusicAssetType.ALIGNED_LYRICS_LINES_JSON,
          storagePath: stored.storagePath,
          mimeType: stored.mimeType,
          fileSize: stored.fileSize,
          status: AssetStatus.READY,
          errorMessage: null,
          metadata: {
            count: params.alignedLines.length,
          },
        }),
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "aligned lyrics 줄 데이터 저장에 실패했습니다.";
      await upsertFailedAsset({
        musicId: params.musicId,
        assetType: MusicAssetType.ALIGNED_LYRICS_LINES_JSON,
        errorMessage,
      });
    }
  }

  if (params.titleText && params.titleText.trim().length > 0) {
    try {
      const stored = await saveTextFile({
        musicId: params.musicId,
        assetType: MusicAssetType.TITLE_TEXT,
        value: params.titleText,
      });

      await db.musicAsset.upsert(
        buildMusicAssetUpsertData({
          musicId: params.musicId,
          assetType: MusicAssetType.TITLE_TEXT,
          storagePath: stored.storagePath,
          mimeType: stored.mimeType,
          fileSize: stored.fileSize,
          status: AssetStatus.READY,
          errorMessage: null,
        }),
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "제목 텍스트 저장에 실패했습니다.";
      await upsertFailedAsset({
        musicId: params.musicId,
        assetType: MusicAssetType.TITLE_TEXT,
        errorMessage,
      });
    }
  }
}
