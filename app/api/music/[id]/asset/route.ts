import { access, readFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { MusicAssetType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function parseAssetType(value: string | null) {
  if (!value) {
    return null;
  }

  if (value in MusicAssetType) {
    return value as MusicAssetType;
  }

  return null;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const assetType = parseAssetType(request.nextUrl.searchParams.get("type"));

  if (!assetType) {
    return NextResponse.json({ error: "잘못된 자산 타입입니다." }, { status: 400 });
  }

  const music = await db.music.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      assets: {
        where: {
          assetType,
        },
        select: {
          status: true,
          storagePath: true,
          mimeType: true,
        },
        take: 1,
      },
    },
  });

  if (!music || music.userId !== sessionUser.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const asset = music.assets[0];

  if (!asset || asset.status !== "READY" || !asset.storagePath) {
    return NextResponse.json({ error: "자산을 찾을 수 없습니다." }, { status: 404 });
  }

  try {
    await access(asset.storagePath);
  } catch {
    return NextResponse.json({ error: "자산 파일을 찾을 수 없습니다." }, { status: 404 });
  }

  const disposition = request.nextUrl.searchParams.get("download") === "1" ? "attachment" : "inline";
  const filename = asset.storagePath.split(/[\\/]/).pop() ?? `${assetType.toLowerCase()}.bin`;

  if (assetType === MusicAssetType.ALIGNED_LYRICS_LINES_JSON || assetType === MusicAssetType.ALIGNED_LYRICS_RAW_JSON || assetType === MusicAssetType.TITLE_TEXT) {
    const body = await readFile(asset.storagePath);
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": asset.mimeType ?? "application/octet-stream",
        "Content-Disposition": `${disposition}; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  return new Response(Readable.toWeb(createReadStream(asset.storagePath)) as ReadableStream<Uint8Array>, {
    status: 200,
    headers: {
      "Content-Type": asset.mimeType ?? "application/octet-stream",
      "Content-Disposition": `${disposition}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
