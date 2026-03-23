import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

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
    include: {
      videos: true,
      generationJobs: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!music) {
    return NextResponse.json({ error: "Music not found" }, { status: 404 });
  }

  if (music.userId !== sessionUser.id && sessionUser.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ item: music });
}
