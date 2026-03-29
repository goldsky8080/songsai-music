import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getMusicProvider } from "@/server/music/provider";

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "").trim() || "lyrics";
}

function encodeUtf8WithBom(value: string) {
  const encoder = new TextEncoder();
  const utf8 = encoder.encode(value);
  const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
  const output = new Uint8Array(bom.byteLength + utf8.byteLength);
  output.set(bom, 0);
  output.set(utf8, bom.byteLength);
  return output;
}

function readLyricsFromResult(result: unknown) {
  if (!result || typeof result !== "object") {
    return null;
  }

  const value = result as Record<string, unknown>;

  if (typeof value.generatedLyrics === "string" && value.generatedLyrics.trim().length > 0) {
    return value.generatedLyrics;
  }

  if (typeof value.providerPrompt === "string" && value.providerPrompt.trim().length > 0) {
    return value.providerPrompt;
  }

  return null;
}

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const music = await db.music.findFirst({
    where: {
      id,
      userId: sessionUser.id,
    },
    select: {
      id: true,
      lyrics: true,
      createdAt: true,
      providerTaskId: true,
      generationJobs: {
        where: {
          jobType: "MUSIC_GENERATION",
        },
        select: {
          payload: true,
          result: true,
          updatedAt: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 1,
      },
    },
  });

  if (!music) {
    return NextResponse.json({ error: "곡 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  const latestJob = music.generationJobs[0];
  const payload =
    latestJob?.payload && typeof latestJob.payload === "object"
      ? (latestJob.payload as Record<string, unknown>)
      : null;

  const lyricMode = typeof payload?.lyricMode === "string" ? payload.lyricMode : null;
  let lyricText = readLyricsFromResult(latestJob?.result) ?? (lyricMode === "manual" ? music.lyrics : null);

  if (!lyricText && music.providerTaskId) {
    try {
      const provider = getMusicProvider();
      const latest = await provider.getMusicStatus(music.providerTaskId);
      const refreshedLyrics =
        (typeof latest.generatedLyrics === "string" && latest.generatedLyrics.trim().length > 0
          ? latest.generatedLyrics
          : null) ??
        (typeof latest.providerPrompt === "string" && latest.providerPrompt.trim().length > 0
          ? latest.providerPrompt
          : null);

      if (refreshedLyrics) {
        lyricText = refreshedLyrics;

        await db.generationJob.updateMany({
          where: {
            musicId: music.id,
            jobType: "MUSIC_GENERATION",
          },
          data: {
            result: {
              providerTaskId: latest.providerTaskId,
              status: latest.status,
              mp3Url: latest.mp3Url ?? null,
              videoUrl: latest.videoUrl ?? null,
              generatedLyrics: latest.generatedLyrics ?? refreshedLyrics,
              providerPrompt: latest.providerPrompt ?? null,
              providerDescriptionPrompt: latest.providerDescriptionPrompt ?? null,
            },
            errorMessage: latest.errorMessage ?? null,
          },
        });
      }
    } catch (error) {
      console.warn("[music-lyrics] Failed to refresh provider lyrics", {
        musicId: music.id,
        providerTaskId: music.providerTaskId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (!lyricText) {
    return NextResponse.json({ error: "실제 가사가 아직 준비되지 않았습니다." }, { status: 409 });
  }

  const title = sanitizeFileName(`lyrics-${music.createdAt.toISOString().slice(0, 10)}`);

  return new NextResponse(encodeUtf8WithBom(lyricText), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`${title}.txt`)}`,
      "Cache-Control": "no-store",
    },
  });
}
