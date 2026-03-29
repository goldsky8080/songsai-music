import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMusicProvider } from "@/server/music/provider";
import { buildAlignedLyricLines } from "@/server/music/aligned-lyrics";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: NextRequest, context: RouteContext) {
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
      providerTaskId: true,
      status: true,
    },
  });

  if (!music) {
    return NextResponse.json({ error: "곡 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  if (!music.providerTaskId) {
    return NextResponse.json({ error: "공급자 트랙 ID가 아직 준비되지 않았습니다." }, { status: 409 });
  }

  try {
    const provider = getMusicProvider();
    const words = await provider.getAlignedLyrics(music.providerTaskId);
    const lines = buildAlignedLyricLines(words);

    return NextResponse.json({
      musicId: music.id,
      providerTaskId: music.providerTaskId,
      status: music.status,
      count: words.length,
      words,
      lineCount: lines.length,
      lines,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "aligned lyrics 를 가져오지 못했습니다.",
      },
      { status: 502 },
    );
  }
}
