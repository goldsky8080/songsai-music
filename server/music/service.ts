import { MusicStatus, QueueStatus, VideoStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getMusicProvider } from "@/server/music/provider";
import type { ProviderMusicResult } from "@/server/music/types";

function toDbMusicStatus(status: ProviderMusicResult["status"]): MusicStatus {
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

function toDbQueueStatus(status: ProviderMusicResult["status"]): QueueStatus {
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

export async function syncMusicStatuses(userId: string) {
  const provider = getMusicProvider();

  const musics = await db.music.findMany({
    where: {
      userId,
      status: {
        in: [MusicStatus.QUEUED, MusicStatus.PROCESSING],
      },
      providerTaskId: {
        not: null,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  });

  for (const music of musics) {
    if (!music.providerTaskId) {
      continue;
    }

    try {
      const snapshot = await provider.getMusicStatus(music.providerTaskId);
      const existingVideo = snapshot.videoUrl
        ? await db.video.findFirst({
            where: { musicId: music.id },
            orderBy: { createdAt: "desc" },
            select: { id: true },
          })
        : null;

      await db.$transaction(async (tx) => {
        await tx.music.update({
          where: { id: music.id },
          data: {
            status: toDbMusicStatus(snapshot.status),
            mp3Url: snapshot.mp3Url ?? music.mp3Url,
            errorMessage: snapshot.errorMessage ?? null,
          },
        });

        await tx.generationJob.updateMany({
          where: {
            musicId: music.id,
            jobType: "MUSIC_GENERATION",
          },
          data: {
            queueStatus: toDbQueueStatus(snapshot.status),
            result: {
              providerTaskId: snapshot.providerTaskId,
              status: snapshot.status,
              mp3Url: snapshot.mp3Url ?? null,
              videoUrl: snapshot.videoUrl ?? null,
              generatedLyrics: snapshot.generatedLyrics ?? null,
              providerPrompt: snapshot.providerPrompt ?? null,
              providerDescriptionPrompt: snapshot.providerDescriptionPrompt ?? null,
            },
            errorMessage: snapshot.errorMessage ?? null,
          },
        });

        if (snapshot.videoUrl) {
          if (existingVideo) {
            await tx.video.update({
              where: { id: existingVideo.id },
              data: {
                mp4Url: snapshot.videoUrl,
                status: VideoStatus.COMPLETED,
                errorMessage: null,
              },
            });
          } else {
            await tx.video.create({
              data: {
                musicId: music.id,
                mp4Url: snapshot.videoUrl,
                status: VideoStatus.COMPLETED,
              },
            });
          }
        }
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Provider status lookup failed.";

      console.warn("[syncMusicStatuses] Provider status lookup failed", {
        musicId: music.id,
        providerTaskId: music.providerTaskId,
        error: errorMessage,
      });

      await db.generationJob.updateMany({
        where: {
          musicId: music.id,
          jobType: "MUSIC_GENERATION",
        },
        data: {
          errorMessage,
        },
      });
    }
  }
}
