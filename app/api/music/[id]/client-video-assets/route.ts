import { readFile } from "node:fs/promises";
import { MusicAssetType } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildAlignedLyricLines } from "@/server/music/aligned-lyrics";
import type { AlignedLyricLine } from "@/server/music/aligned-lyrics";
import { syncMusicAssets } from "@/server/music/asset-storage";
import { getMusicProvider } from "@/server/music/provider";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function readTitleFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const title = (payload as { title?: unknown }).title;
  return typeof title === "string" && title.trim().length > 0 ? title.trim() : null;
}

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "").trim() || "songsai-video";
}

async function readAlignedLines(storagePath: string | null | undefined) {
  if (!storagePath) {
    return [] as AlignedLyricLine[];
  }

  try {
    const raw = await readFile(storagePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as AlignedLyricLine[]) : [];
  } catch {
    return [];
  }
}

async function getAssetsPayload(musicId: string, userId: string, showLyrics: boolean) {
  const music = await db.music.findUnique({
    where: { id: musicId },
    select: {
      id: true,
      userId: true,
      mp3Url: true,
      providerTaskId: true,
      generationJobs: {
        where: {
          jobType: "MUSIC_GENERATION",
        },
        select: {
          payload: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 1,
      },
      assets: {
        where: {
          assetType: {
            in: [
              MusicAssetType.COVER_IMAGE,
              MusicAssetType.ALIGNED_LYRICS_LINES_JSON,
              MusicAssetType.TITLE_TEXT,
            ],
          },
        },
        select: {
          assetType: true,
          status: true,
          storagePath: true,
          mimeType: true,
        },
      },
    },
  });

  if (!music || music.userId !== userId) {
    return null;
  }

  let coverImage = music.assets.find((asset) => asset.assetType === MusicAssetType.COVER_IMAGE && asset.status === "READY");
  let titleAsset = music.assets.find((asset) => asset.assetType === MusicAssetType.TITLE_TEXT && asset.status === "READY");
  let lyricLinesAsset = music.assets.find((asset) => asset.assetType === MusicAssetType.ALIGNED_LYRICS_LINES_JSON && asset.status === "READY");

  if ((!coverImage || (showLyrics && !lyricLinesAsset)) && music.providerTaskId) {
    const provider = getMusicProvider();
    const latest = await provider.getMusicStatus(music.providerTaskId);
    const alignedWords = showLyrics ? await provider.getAlignedLyrics(music.providerTaskId).catch(() => []) : [];
    const alignedLines = showLyrics ? buildAlignedLyricLines(alignedWords) : [];
    const titleText = readTitleFromPayload(music.generationJobs[0]?.payload);

    await syncMusicAssets({
      musicId: music.id,
      mp3Url: latest.mp3Url ?? music.mp3Url ?? null,
      imageUrl: latest.imageLargeUrl ?? latest.imageUrl ?? null,
      alignedWords,
      alignedLines,
      titleText,
    });

    const refreshedAssets = await db.musicAsset.findMany({
      where: {
        musicId: music.id,
        assetType: {
          in: [
            MusicAssetType.COVER_IMAGE,
            MusicAssetType.ALIGNED_LYRICS_LINES_JSON,
            MusicAssetType.TITLE_TEXT,
          ],
        },
        status: "READY",
      },
      select: {
        assetType: true,
        status: true,
        storagePath: true,
        mimeType: true,
      },
    });

    coverImage = refreshedAssets.find((asset) => asset.assetType === MusicAssetType.COVER_IMAGE) ?? coverImage;
    titleAsset = refreshedAssets.find((asset) => asset.assetType === MusicAssetType.TITLE_TEXT) ?? titleAsset;
    lyricLinesAsset = refreshedAssets.find((asset) => asset.assetType === MusicAssetType.ALIGNED_LYRICS_LINES_JSON) ?? lyricLinesAsset;
  }

  const alignedLyricLines = showLyrics ? await readAlignedLines(lyricLinesAsset?.storagePath) : [];
  const resolvedTitle =
    (titleAsset?.storagePath ? (await readFile(titleAsset.storagePath, "utf8")).trim() : null) ??
    readTitleFromPayload(music.generationJobs[0]?.payload) ??
    "제목 없는 곡";

  return {
    musicId: music.id,
    audioUrl: `/api/music/${music.id}/download?inline=1`,
    imageUrl: coverImage ? `/api/music/${music.id}/asset?type=${MusicAssetType.COVER_IMAGE}` : null,
    imageMimeType: coverImage?.mimeType ?? null,
    alignedLyricLines,
    titleText: resolvedTitle,
    suggestedFilename: `${sanitizeFileName(resolvedTitle)}.mp4`,
  };
}

export async function GET(request: Request, context: RouteContext) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const showLyrics = searchParams.get("showLyrics") !== "false";

  const payload = await getAssetsPayload(id, sessionUser.id, showLyrics);

  if (!payload) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!payload.imageUrl) {
    return NextResponse.json({ error: "배경 이미지를 준비하지 못했습니다." }, { status: 409 });
  }

  if (showLyrics && payload.alignedLyricLines.length === 0) {
    return NextResponse.json({ error: "가사 타이밍을 준비하지 못했습니다." }, { status: 409 });
  }

  return NextResponse.json(payload);
}
