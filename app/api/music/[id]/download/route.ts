import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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
    },
  });

  if (!music || music.userId !== sessionUser.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!music.mp3Url) {
    return NextResponse.json({ error: "MP3 file is not ready yet." }, { status: 409 });
  }

  const upstream = await fetch(music.mp3Url);

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Failed to fetch MP3 file." }, { status: 502 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "audio/mpeg",
      "Content-Disposition": `attachment; filename="music-${music.id}.mp3"`,
      "Cache-Control": "private, no-store",
    },
  });
}
