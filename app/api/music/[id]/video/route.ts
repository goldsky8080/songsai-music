import { NextResponse } from "next/server";
import { QueueStatus, VideoStatus } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { DOWNLOAD_DELAY_MS, getVideoRenderCost } from "@/server/music/constants";
import { buildAlignedLyricLines } from "@/server/music/aligned-lyrics";
import { getMusicProvider } from "@/server/music/provider";
import { consumeVideoRenderCredits, refundVideoRenderCredits } from "@/server/credits/service";
import { renderVideoFromImage } from "@/server/video/render";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function readTitleFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const title = (payload as { title?: unknown }).title;
  return typeof title === "string" && title.trim().length > 0 ? title.trim() : null;
}

export async function POST(request: Request, context: RouteContext) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const formData = await request.formData();
  const imageFile = formData.get("image");
  const showLyrics = formData.get("showLyrics") !== "false";
  const showTitle = formData.get("showTitle") !== "false";
  const rawTitleText = formData.get("titleText");
  const titleText = typeof rawTitleText === "string" ? rawTitleText.trim() : "";
  const hasUploadedImage = imageFile instanceof File && imageFile.size > 0;
  const videoRenderCost = getVideoRenderCost(showLyrics);

  if (imageFile !== null && imageFile !== undefined && !(imageFile instanceof File)) {
    return NextResponse.json({ error: "이미지 파일 형식을 확인해 주세요." }, { status: 400 });
  }

  if (hasUploadedImage && !imageFile.type.startsWith("image/")) {
    return NextResponse.json({ error: "이미지 파일만 업로드할 수 있습니다." }, { status: 400 });
  }

  if (hasUploadedImage && imageFile.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "이미지는 10MB 이하만 업로드할 수 있습니다." }, { status: 400 });
  }

  const music = await db.music.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      mp3Url: true,
      providerTaskId: true,
      createdAt: true,
      generationJobs: {
        where: {
          jobType: "MUSIC_GENERATION",
        },
        select: {
          payload: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 1,
      },
      videos: {
        where: {
          status: {
            in: [VideoStatus.QUEUED, VideoStatus.PROCESSING],
          },
        },
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  if (!music || music.userId !== sessionUser.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!music.mp3Url) {
    return NextResponse.json({ error: "오디오가 준비된 곡만 비디오로 만들 수 있습니다." }, { status: 409 });
  }

  if (music.videos.length > 0) {
    return NextResponse.json({ error: "이미 비디오 생성이 진행 중입니다." }, { status: 409 });
  }

  const downloadAvailableAt = music.createdAt.getTime() + DOWNLOAD_DELAY_MS;

  if (Date.now() < downloadAvailableAt) {
    return NextResponse.json(
      {
        error: "음악 생성 후 5분이 지나야 비디오를 만들 수 있습니다.",
        downloadAvailableAt: new Date(downloadAvailableAt).toISOString(),
      },
      { status: 403 },
    );
  }

  let resolvedAudioUrl = music.mp3Url;
  let providerImageUrl: string | null = null;
  let alignedLyricLines = [] as ReturnType<typeof buildAlignedLyricLines>;

  if (music.providerTaskId) {
    try {
      const provider = getMusicProvider();
      const latest = await provider.getMusicStatus(music.providerTaskId);
      const alignedWords = showLyrics
        ? await provider.getAlignedLyrics(music.providerTaskId).catch(() => [])
        : [];

      if (latest.mp3Url && latest.mp3Url !== music.mp3Url) {
        resolvedAudioUrl = latest.mp3Url;

        await db.music.update({
          where: { id: music.id },
          data: {
            mp3Url: latest.mp3Url,
          },
        });
      }

      providerImageUrl = latest.imageLargeUrl ?? latest.imageUrl ?? null;
      alignedLyricLines = showLyrics ? buildAlignedLyricLines(alignedWords) : [];
    } catch (error) {
      console.warn("[video-render] Failed to refresh provider status", {
        musicId: music.id,
        providerTaskId: music.providerTaskId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (!hasUploadedImage && !providerImageUrl) {
    return NextResponse.json(
      { error: "배경 이미지가 없어 비디오를 만들 수 없습니다. 이미지를 선택하거나 커버가 있는 곡을 사용해 주세요." },
      { status: 409 },
    );
  }

  if (showLyrics && alignedLyricLines.length === 0) {
    return NextResponse.json(
      { error: "가사 타이밍을 준비하지 못해 가사 자막 비디오를 만들 수 없습니다." },
      { status: 409 },
    );
  }

  const resolvedTitleText = titleText || readTitleFromPayload(music.generationJobs[0]?.payload) || "제목 없는 곡";
  const imageBuffer = hasUploadedImage ? Buffer.from(await imageFile.arrayBuffer()) : undefined;

  const created = await db.$transaction(async (tx) => {
    const video = await tx.video.create({
      data: {
        musicId: music.id,
        status: VideoStatus.PROCESSING,
      },
    });

    await consumeVideoRenderCredits(sessionUser.id, video.id, videoRenderCost, tx);

    await tx.generationJob.create({
      data: {
        userId: sessionUser.id,
        musicId: music.id,
        videoId: video.id,
        targetType: "VIDEO",
        jobType: "VIDEO_RENDER",
        queueStatus: QueueStatus.ACTIVE,
        payload: {
          source: hasUploadedImage ? "image_upload" : "provider_cover",
          imageName: hasUploadedImage ? imageFile.name : null,
          imageMimeType: hasUploadedImage ? imageFile.type : null,
          imageUrl: providerImageUrl,
          showLyrics,
          showTitle,
          titleText: resolvedTitleText,
          cost: videoRenderCost,
        },
      },
    });

    return video;
  });

  try {
    const rendered = await renderVideoFromImage({
      audioUrl: resolvedAudioUrl,
      videoId: created.id,
      imageBuffer,
      imageMimeType: hasUploadedImage ? imageFile.type : undefined,
      imageUrl: hasUploadedImage ? undefined : providerImageUrl ?? undefined,
      alignedLyricLines: showLyrics ? alignedLyricLines : [],
      titleText: showTitle ? resolvedTitleText : undefined,
    });

    const updated = await db.video.update({
      where: { id: created.id },
      data: {
        mp4Url: rendered.mp4Url,
        bgImageUrl: rendered.bgImageUrl,
        status: VideoStatus.COMPLETED,
        errorMessage: null,
      },
    });

    await db.generationJob.updateMany({
      where: {
        videoId: created.id,
        jobType: "VIDEO_RENDER",
      },
      data: {
        queueStatus: QueueStatus.COMPLETED,
        result: rendered,
        errorMessage: null,
      },
    });

    return NextResponse.json({ item: updated }, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "비디오 생성에 실패했습니다.";

    await db.$transaction([
      db.video.update({
        where: { id: created.id },
        data: {
          status: VideoStatus.FAILED,
          errorMessage,
        },
      }),
      db.generationJob.updateMany({
        where: {
          videoId: created.id,
          jobType: "VIDEO_RENDER",
        },
        data: {
          queueStatus: QueueStatus.FAILED,
          errorMessage,
        },
      }),
    ]);

    await refundVideoRenderCredits(sessionUser.id, created.id);

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
