import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { consumeAdditionalTrackUnlockCredits } from "@/server/credits/service";
import { BONUS_TRACK_UNLOCK_WINDOW_DAYS } from "@/server/music/constants";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

export async function POST(_: Request, context: RouteContext) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const groupedTracks = await db.music.findMany({
    where: {
      userId: sessionUser.id,
      requestGroupId: id,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const targetTracks =
    groupedTracks.length > 0
      ? groupedTracks
      : await db.music.findMany({
          where: {
            userId: sessionUser.id,
            id,
          },
          orderBy: {
            createdAt: "asc",
          },
        });

  if (targetTracks.length === 0) {
    return NextResponse.json({ error: "Music not found" }, { status: 404 });
  }

  const primaryTrack = targetTracks[0];
  const unlockDeadline = addDays(primaryTrack.createdAt, BONUS_TRACK_UNLOCK_WINDOW_DAYS);

  if (unlockDeadline.getTime() <= Date.now()) {
    return NextResponse.json({ error: "추가곡은 생성 후 7일 동안만 열 수 있습니다." }, { status: 410 });
  }

  const lockedBonusTracks = targetTracks.filter(
    (track) => track.isBonusTrack && !track.bonusUnlockedAt,
  );

  if (lockedBonusTracks.length === 0) {
    return NextResponse.json({ error: "열 수 있는 추가곡이 없습니다." }, { status: 409 });
  }

  const groupId = primaryTrack.requestGroupId ?? primaryTrack.id;

  await db.$transaction(async (tx) => {
    await consumeAdditionalTrackUnlockCredits(sessionUser.id, groupId, tx);

    await tx.music.updateMany({
      where: {
        id: {
          in: lockedBonusTracks.map((track) => track.id),
        },
      },
      data: {
        bonusUnlockedAt: new Date(),
      },
    });
  });

  return NextResponse.json({
    success: true,
    unlockedTrackCount: lockedBonusTracks.length,
  });
}
