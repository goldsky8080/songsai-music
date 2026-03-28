import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { DOWNLOAD_DELAY_MS } from "@/server/music/constants";
import { getMusicProvider } from "@/server/music/provider";

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

function isAudioLikeContentType(contentType: string | null) {
  if (!contentType) {
    return true;
  }

  const normalized = contentType.toLowerCase();
  return (
    normalized.startsWith("audio/") ||
    normalized === "application/octet-stream" ||
    normalized.includes("mpeg")
  );
}

function isValidDownloadResponse(response: Response) {
  if (!response.ok || !response.body) {
    return false;
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength === "0") {
    return false;
  }

  return isAudioLikeContentType(response.headers.get("content-type"));
}

type DownloadStreamResult = {
  stream: ReadableStream<Uint8Array>;
  contentType: string | null;
};

async function fetchDownloadStream(
  url: string,
  options?: {
    verifyBytes?: boolean;
  },
): Promise<DownloadStreamResult | null> {
  const response = await fetch(url, {
    redirect: "follow",
    cache: "no-store",
  });

  if (!isValidDownloadResponse(response)) {
    return null;
  }

  if (!options?.verifyBytes) {
    return {
      stream: response.body!,
      contentType: response.headers.get("content-type"),
    };
  }

  const reader = response.body!.getReader();
  const firstChunk = await reader.read();

  if (firstChunk.done || !firstChunk.value || firstChunk.value.byteLength === 0) {
    await reader.cancel().catch(() => undefined);
    return null;
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(firstChunk.value);
    },
    async pull(controller) {
      const chunk = await reader.read();

      if (chunk.done) {
        controller.close();
        return;
      }

      controller.enqueue(chunk.value);
    },
    async cancel(reason) {
      await reader.cancel(reason).catch(() => undefined);
    },
  });

  return {
    stream,
    contentType: response.headers.get("content-type"),
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
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
      providerTaskId: true,
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
    return NextResponse.json({ error: "추가곡을 먼저 열어야 다운로드할 수 있습니다." }, { status: 403 });
  }

  if (!music.mp3Url) {
    return NextResponse.json({ error: "MP3 파일이 아직 준비되지 않았습니다." }, { status: 409 });
  }

  const isInlinePlayback = request.nextUrl.searchParams.get("inline") === "1";
  const downloadAvailableAt = music.createdAt.getTime() + DOWNLOAD_DELAY_MS;

  if (!isInlinePlayback && Date.now() < downloadAvailableAt) {
    return NextResponse.json(
      {
        error: "음악 생성 후 5분이 지나야 다운로드할 수 있습니다.",
        downloadAvailableAt: new Date(downloadAvailableAt).toISOString(),
      },
      { status: 403 },
    );
  }

  let resolvedMp3Url = music.mp3Url;
  let upstream = isInlinePlayback
    ? null
    : await fetchDownloadStream(resolvedMp3Url, {
        verifyBytes: true,
      });

  if ((isInlinePlayback || !upstream) && music.providerTaskId) {
    try {
      const provider = getMusicProvider();
      const latest = await provider.getMusicStatus(music.providerTaskId);

      if (latest.mp3Url) {
        resolvedMp3Url = latest.mp3Url;

        if (latest.mp3Url !== music.mp3Url) {
          await db.music.update({
            where: { id: music.id },
            data: {
              mp3Url: latest.mp3Url,
            },
          });
        }

        if (!isInlinePlayback) {
          upstream = await fetchDownloadStream(resolvedMp3Url, {
            verifyBytes: true,
          });
        }
      }
    } catch (error) {
      console.warn("[music-download] Failed to refresh provider status", {
        musicId: music.id,
        providerTaskId: music.providerTaskId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (isInlinePlayback) {
    return NextResponse.redirect(resolvedMp3Url, { status: 307 });
  }

  if (!upstream) {
    return NextResponse.json({ error: "MP3 파일을 가져오지 못했습니다." }, { status: 502 });
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
  const disposition = isInlinePlayback ? "inline" : "attachment";

  return new Response(upstream.stream, {
    status: 200,
    headers: {
      "Content-Type": upstream.contentType ?? "audio/mpeg",
      "Content-Disposition": `${disposition}; filename="music-${trackIndex}.mp3"; filename*=UTF-8''${utf8Filename}`,
      "Cache-Control": "private, no-store",
    },
  });
}
