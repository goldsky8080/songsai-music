import { NextRequest, NextResponse } from "next/server";
import { MusicStatus, QueueStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { consumeMusicGenerationCredits, refundMusicGenerationCredits } from "@/server/credits/service";
import { getMusicGenerationCost } from "@/server/music/constants";
import { getMusicProvider } from "@/server/music/provider";
import { createMusicSchema } from "@/server/music/schema";
import { syncMusicStatuses } from "@/server/music/service";

function toDbMusicStatus(status: "queued" | "processing" | "completed" | "failed") {
  switch (status) {
    case "queued":
      return MusicStatus.QUEUED;
    case "processing":
      return MusicStatus.PROCESSING;
    case "completed":
      return MusicStatus.COMPLETED;
    case "failed":
      return MusicStatus.FAILED;
    default:
      return MusicStatus.QUEUED;
  }
}

function toDbQueueStatus(status: "queued" | "processing" | "completed" | "failed") {
  switch (status) {
    case "queued":
      return QueueStatus.QUEUED;
    case "processing":
      return QueueStatus.ACTIVE;
    case "completed":
      return QueueStatus.COMPLETED;
    case "failed":
      return QueueStatus.FAILED;
    default:
      return QueueStatus.QUEUED;
  }
}

type MusicRow = Awaited<ReturnType<typeof db.music.findMany>>[number];

function summarizeGroupStatus(statuses: MusicStatus[]) {
  if (statuses.some((status) => status === MusicStatus.PROCESSING)) {
    return MusicStatus.PROCESSING;
  }

  if (statuses.some((status) => status === MusicStatus.QUEUED)) {
    return MusicStatus.QUEUED;
  }

  if (statuses.every((status) => status === MusicStatus.COMPLETED)) {
    return MusicStatus.COMPLETED;
  }

  if (statuses.some((status) => status === MusicStatus.COMPLETED)) {
    return MusicStatus.COMPLETED;
  }

  if (statuses.some((status) => status === MusicStatus.FAILED)) {
    return MusicStatus.FAILED;
  }

  return statuses[0] ?? MusicStatus.QUEUED;
}

function groupMusicItems(musics: MusicRow[]) {
  const groups = new Map<string, MusicRow[]>();

  for (const music of musics) {
    const groupKey = music.requestGroupId ?? music.id;
    const current = groups.get(groupKey) ?? [];
    current.push(music);
    groups.set(groupKey, current);
  }

  return Array.from(groups.entries())
    .map(([groupId, tracks]) => {
      const sortedTracks = [...tracks].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const first = sortedTracks[0];
      const statuses = sortedTracks.map((track) => track.status);
      const errorMessage = sortedTracks.find((track) => track.errorMessage)?.errorMessage ?? null;

      return {
        id: groupId,
        title: null,
        lyrics: first.lyrics,
        stylePrompt: first.stylePrompt,
        status: summarizeGroupStatus(statuses),
        createdAt: first.createdAt,
        errorMessage,
        tracks: sortedTracks.map((track) => ({
          id: track.id,
          status: track.status,
          mp3Url: track.mp3Url,
        })),
      };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await syncMusicStatuses(sessionUser.id);

  const page = Number.parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10);
  const limit = Number.parseInt(request.nextUrl.searchParams.get("limit") ?? "50", 10);
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 50) : 50;
  const skip = (safePage - 1) * safeLimit;

  const musics = await db.music.findMany({
    where: {
      userId: sessionUser.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 200,
  });

  const grouped = groupMusicItems(musics);
  const visibleItems = grouped.filter((item) => item.status !== MusicStatus.FAILED);
  const pagedItems = visibleItems.slice(skip, skip + safeLimit);

  return NextResponse.json({
    items: pagedItems,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: visibleItems.length,
      totalPages: Math.max(1, Math.ceil(visibleItems.length / safeLimit)),
    },
  });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createMusicSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const provider = getMusicProvider();
  const trackCount = parsed.data.trackCount;
  const requestGroupId = crypto.randomUUID();
  const generationCost = getMusicGenerationCost(trackCount);

  const created = await db.$transaction(async (tx) => {
    const music = await tx.music.create({
      data: {
        userId: sessionUser.id,
        requestGroupId,
        lyrics: parsed.data.lyrics,
        stylePrompt: parsed.data.stylePrompt,
        provider: "SUNO",
        status: "QUEUED",
      },
    });

    await consumeMusicGenerationCredits(sessionUser.id, music.id, trackCount, tx);

    await tx.generationJob.create({
      data: {
        userId: sessionUser.id,
        musicId: music.id,
        targetType: "MUSIC",
        jobType: "MUSIC_GENERATION",
        queueStatus: "QUEUED",
        payload: {
          title: parsed.data.title,
          lyrics: parsed.data.lyrics,
          stylePrompt: parsed.data.stylePrompt,
          lyricMode: parsed.data.lyricMode,
          vocalGender: parsed.data.vocalGender,
          trackCount,
          modelVersion: parsed.data.modelVersion,
          cost: generationCost,
        },
      },
    });

    return music;
  });

  try {
    const providerResult = await provider.createMusic({
      userId: sessionUser.id,
      title: parsed.data.title,
      lyrics: parsed.data.lyrics,
      stylePrompt: parsed.data.stylePrompt,
      lyricMode: parsed.data.lyricMode,
      vocalGender: parsed.data.vocalGender,
      trackCount,
      modelVersion: parsed.data.modelVersion,
    });
    const tracks =
      providerResult.tracks && providerResult.tracks.length > 0
        ? providerResult.tracks
        : [
            {
              providerTaskId: providerResult.providerTaskId,
              status: providerResult.status,
              mp3Url: providerResult.mp3Url,
            },
          ];

    const selectedTracks = tracks.slice(0, trackCount);

    const [primaryTrack, ...extraTracks] = selectedTracks;

    const items = await db.$transaction(async (tx) => {
      const primaryMusic = await tx.music.update({
        where: { id: created.id },
        data: {
          providerTaskId: primaryTrack.providerTaskId,
          status: toDbMusicStatus(primaryTrack.status),
          mp3Url: primaryTrack.mp3Url ?? null,
          errorMessage: providerResult.errorMessage ?? null,
        },
      });

      await tx.generationJob.updateMany({
        where: {
          musicId: created.id,
          jobType: "MUSIC_GENERATION",
        },
        data: {
          queueStatus: toDbQueueStatus(primaryTrack.status),
          result: {
            providerTaskId: primaryTrack.providerTaskId,
            status: primaryTrack.status,
            mp3Url: primaryTrack.mp3Url ?? null,
          },
          errorMessage: providerResult.errorMessage ?? null,
        },
      });

      const extraMusics = await Promise.all(
        extraTracks.map(async (track) => {
          const music = await tx.music.create({
            data: {
              userId: sessionUser.id,
              requestGroupId,
              lyrics: parsed.data.lyrics,
              stylePrompt: parsed.data.stylePrompt,
              provider: "SUNO",
              providerTaskId: track.providerTaskId,
              status: toDbMusicStatus(track.status),
              mp3Url: track.mp3Url ?? null,
              errorMessage: providerResult.errorMessage ?? null,
            },
          });

          await tx.generationJob.create({
            data: {
              userId: sessionUser.id,
              musicId: music.id,
              targetType: "MUSIC",
              jobType: "MUSIC_GENERATION",
              queueStatus: toDbQueueStatus(track.status),
              payload: {
                title: parsed.data.title,
                lyrics: parsed.data.lyrics,
                stylePrompt: parsed.data.stylePrompt,
                lyricMode: parsed.data.lyricMode,
                vocalGender: parsed.data.vocalGender,
                trackCount,
                modelVersion: parsed.data.modelVersion,
                cost: 0,
                source: "provider-duplicate-track",
              },
              result: {
                providerTaskId: track.providerTaskId,
                status: track.status,
                mp3Url: track.mp3Url ?? null,
              },
              errorMessage: providerResult.errorMessage ?? null,
            },
          });

          return music;
        }),
      );

      return [primaryMusic, ...extraMusics];
    });

    return NextResponse.json({ items: groupMusicItems(items) }, { status: 201 });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Music generation request failed.";

    await refundMusicGenerationCredits(sessionUser.id, created.id);

    await db.$transaction([
      db.music.update({
        where: { id: created.id },
        data: {
          status: MusicStatus.FAILED,
          errorMessage,
        },
      }),
      db.generationJob.updateMany({
        where: {
          musicId: created.id,
          jobType: "MUSIC_GENERATION",
        },
        data: {
          queueStatus: QueueStatus.FAILED,
          errorMessage,
        },
      }),
    ]);

    return NextResponse.json({ error: errorMessage }, { status: 502 });
  }
}
