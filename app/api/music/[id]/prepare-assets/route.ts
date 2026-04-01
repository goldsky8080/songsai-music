import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildAlignedLyricLines } from "@/server/music/aligned-lyrics";
import { syncMusicAssets } from "@/server/music/asset-storage";
import { getMusicProvider } from "@/server/music/provider";

function readTitleFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const title = (payload as { title?: unknown }).title;
  return typeof title === "string" && title.trim().length > 0 ? title.trim() : null;
}

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const music = await db.music.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      requestGroupId: true,
    },
  });

  if (!music || music.userId !== sessionUser.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const tracks = await db.music.findMany({
    where: {
      userId: sessionUser.id,
      ...(music.requestGroupId
        ? {
            requestGroupId: music.requestGroupId,
          }
        : {
            id: music.id,
          }),
      providerTaskId: {
        not: null,
      },
    },
    select: {
      id: true,
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
    },
  });

  const provider = getMusicProvider();

  const results = await Promise.allSettled(
    tracks.map(async (track) => {
      if (!track.providerTaskId) {
        return null;
      }

      const latest = await provider.getMusicStatus(track.providerTaskId);
      const alignedWords = await provider.getAlignedLyrics(track.providerTaskId).catch(() => []);
      const alignedLines = alignedWords.length > 0 ? buildAlignedLyricLines(alignedWords) : [];
      const titleText = readTitleFromPayload(track.generationJobs[0]?.payload);

      if (latest.mp3Url && latest.mp3Url !== track.mp3Url) {
        await db.music.update({
          where: { id: track.id },
          data: {
            mp3Url: latest.mp3Url,
          },
        });
      }

      await syncMusicAssets({
        musicId: track.id,
        mp3Url: latest.mp3Url ?? track.mp3Url ?? null,
        imageUrl: latest.imageLargeUrl ?? latest.imageUrl ?? null,
        alignedWords,
        alignedLines,
        titleText,
      });

      return {
        musicId: track.id,
        hasMp3: Boolean(latest.mp3Url ?? track.mp3Url),
        hasImage: Boolean(latest.imageLargeUrl ?? latest.imageUrl),
        hasLyrics: alignedLines.length > 0,
      };
    }),
  );

  const prepared = results
    .filter((result): result is PromiseFulfilledResult<{ musicId: string; hasMp3: boolean; hasImage: boolean; hasLyrics: boolean } | null> => result.status === "fulfilled")
    .map((result) => result.value)
    .filter(Boolean);

  const failed = results.filter((result) => result.status === "rejected").length;

  return NextResponse.json({
    preparedCount: prepared.length,
    failedCount: failed,
    items: prepared,
  });
}
