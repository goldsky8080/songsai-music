import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { DOWNLOAD_DELAY_MS } from "@/server/music/constants";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function sanitizeFilenamePart(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "").trim() || "music";
}

function readTitleFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const title = (payload as { title?: unknown }).title;
  return typeof title === "string" && title.trim().length > 0 ? title.trim() : null;
}

export async function GET(_: Request, context: RouteContext) {
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
      mp3Url: true,
      requestGroupId: true,
      isBonusTrack: true,
      bonusUnlockedAt: true,
      createdAt: true,
      updatedAt: true,
      generationJobs: {
        where: {
          jobType: "MUSIC_GENERATION",
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          payload: true,
        },
        take: 1,
      },
    },
  });

  if (!music || music.userId !== sessionUser.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (music.isBonusTrack && !music.bonusUnlockedAt) {
    return NextResponse.json(
      { error: "추가곡을 먼저 열어야 다운로드할 수 있습니다." },
      { status: 403 },
    );
  }

  if (!music.mp3Url) {
    return NextResponse.json({ error: "MP3 file is not ready yet." }, { status: 409 });
  }

  const downloadAvailableAt = music.updatedAt.getTime() + DOWNLOAD_DELAY_MS;

  if (Date.now() < downloadAvailableAt) {
    return NextResponse.json(
      {
        error: "듣기 가능 후 90초가 지나야 다운로드할 수 있습니다. 지금은 듣기만 가능합니다.",
        downloadAvailableAt: new Date(downloadAvailableAt).toISOString(),
      },
      { status: 403 },
    );
  }

  const upstream = await fetch(music.mp3Url);

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Failed to fetch MP3 file." }, { status: 502 });
  }

  let trackIndex = 1;

  if (music.requestGroupId) {
    const groupTracks = await db.music.findMany({
      where: {
        userId: sessionUser.id,
        requestGroupId: music.requestGroupId,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
      },
    });

    const foundIndex = groupTracks.findIndex((track) => track.id === music.id);
    trackIndex = foundIndex >= 0 ? foundIndex + 1 : 1;
  }

  const rawTitle = readTitleFromPayload(music.generationJobs[0]?.payload) ?? "music";
  const safeTitle = sanitizeFilenamePart(rawTitle);
  const utf8Filename = encodeURIComponent(`${safeTitle}${trackIndex}.mp3`);

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "audio/mpeg",
      "Content-Disposition": `attachment; filename="music-${trackIndex}.mp3"; filename*=UTF-8''${utf8Filename}`,
      "Cache-Control": "private, no-store",
    },
  });
}
