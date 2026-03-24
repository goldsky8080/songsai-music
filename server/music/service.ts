import { MusicStatus, QueueStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { getMusicProvider } from "@/server/music/provider";
import type { ProviderMusicResult } from "@/server/music/types";

// provider 문자열 상태를 내부 MusicStatus enum으로 정규화한다.
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

// 작업 큐 레코드도 같은 시점에 함께 갱신하기 위해 QueueStatus로 변환한다.
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

/**
 * 현재 사용자 기준으로 진행 중인 음악의 최신 상태를 provider에서 다시 읽어와 반영한다.
 * 아직은 GET /api/music 시점의 경량 폴링 방식이며, 추후 워커 분리 시 배치 작업으로 이동 가능하다.
 */
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

      // Music 레코드와 GenerationJob 결과를 동시에 갱신해 화면/운영 로그가 엇갈리지 않게 맞춘다.
      await db.$transaction([
        db.music.update({
          where: { id: music.id },
          data: {
            status: toDbMusicStatus(snapshot.status),
            mp3Url: snapshot.mp3Url ?? music.mp3Url,
            errorMessage: snapshot.errorMessage ?? null,
          },
        }),
        db.generationJob.updateMany({
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
            },
            errorMessage: snapshot.errorMessage ?? null,
          },
        }),
      ]);
    } catch (error) {
      // 상태 조회 실패 자체도 운영 중 중요한 단서이므로 failed 상태와 메시지를 남긴다.
      const errorMessage =
        error instanceof Error ? error.message : "Provider status lookup failed.";

      await db.$transaction([
        db.music.update({
          where: { id: music.id },
          data: {
            status: MusicStatus.FAILED,
            errorMessage,
          },
        }),
        db.generationJob.updateMany({
          where: {
            musicId: music.id,
            jobType: "MUSIC_GENERATION",
          },
          data: {
            queueStatus: QueueStatus.FAILED,
            errorMessage,
          },
        }),
      ]);
    }
  }
}
