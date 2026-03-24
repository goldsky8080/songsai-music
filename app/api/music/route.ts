import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { consumeMusicGenerationCredits, refundMusicGenerationCredits } from "@/server/credits/service";
import { getMusicGenerationCost } from "@/server/music/constants";
import { getMusicProvider } from "@/server/music/provider";
import { createMusicSchema } from "@/server/music/schema";
import { syncMusicStatuses } from "@/server/music/service";
import { MusicStatus, QueueStatus } from "@prisma/client";

// provider 상태 문자열을 MusicStatus enum으로 정규화한다.
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

// GenerationJob은 별도 큐 상태를 가지므로 QueueStatus로 한 번 더 변환한다.
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

/**
 * 여러 트랙이 하나의 요청 그룹으로 묶일 때, 카드 전체 상태를 결정한다.
 * 사용자는 "이번 요청이 아직 처리 중인지 / 끝났는지"를 먼저 보기 때문에
 * 개별 트랙보다 그룹 상태를 먼저 요약해 내려준다.
 */
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

/**
 * DB에는 트랙 단위로 저장된 Music 레코드를 requestGroupId 기준으로 다시 묶는다.
 * 프론트는 이 구조를 받아 "한 요청 카드 안에 여러 곡 버튼" UI를 만들 수 있다.
 */
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

export async function GET() {
  // 로그인 사용자만 자신의 생성 이력을 조회할 수 있다.
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 목록 조회 시점에 진행 중 항목 상태를 가볍게 동기화해 최신 결과를 보여준다.
  await syncMusicStatuses(sessionUser.id);

  const musics = await db.music.findMany({
    where: {
      userId: sessionUser.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  return NextResponse.json({ items: groupMusicItems(musics) });
}

export async function POST(request: Request) {
  // 음악 생성은 반드시 로그인 세션이 있어야 한다.
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

  /**
   * 자동 가사 모드는 향후 wrapper 패치 후 재개 예정이다.
   * 현재는 인증 흐름 문제로 막아 두고, 안내 메시지를 그대로 내려준다.
   */
  if (parsed.data.lyricMode === "auto") {
    return NextResponse.json(
      {
        error:
          "AI 자동 가사 생성은 Suno wrapper 패치가 필요해서 현재는 잠시 비활성화되어 있습니다.",
      },
      { status: 400 },
    );
  }

  const provider = getMusicProvider();
  const trackCount = parsed.data.trackCount;
  const requestGroupId = crypto.randomUUID();
  const generationCost = getMusicGenerationCost(trackCount);

  /**
   * 1단계 트랜잭션:
   * - 대표 Music 레코드 생성
   * - 크레딧 선차감
   * - GenerationJob 기록
   *
   * 외부 provider 호출 이전에 내부 원장을 먼저 확보해야 실패 시 환불 처리도 단순해진다.
   */
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

    /**
     * 2단계 트랜잭션:
     * - 첫 번째 트랙은 기존 대표 레코드에 반영
     * - 두 번째 트랙이 있으면 추가 Music 레코드 생성
     * - 각각의 결과를 GenerationJob에도 기록
     */
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
    // 외부 요청 실패 시에는 선차감 크레딧을 환불하고 대표 레코드를 실패 상태로 마감한다.
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
