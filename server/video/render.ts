import { existsSync } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import ffmpegStatic from "ffmpeg-static";

const GENERATED_VIDEO_DIR = path.join(process.cwd(), "public", "generated-videos");
const GENERATED_VIDEO_ASSET_DIR = path.join(process.cwd(), "public", "generated-video-assets");
const TEMP_DIR = path.join(tmpdir(), "songsai-video-render");

function resolveFfmpegPath() {
  const configuredPath = process.env.FFMPEG_PATH;

  if (configuredPath && existsSync(configuredPath)) {
    return configuredPath;
  }

  if (typeof ffmpegStatic === "string" && existsSync(ffmpegStatic)) {
    return ffmpegStatic;
  }

  const bundledBinaryPath = path.join(
    process.cwd(),
    "node_modules",
    "ffmpeg-static",
    process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg",
  );

  if (existsSync(bundledBinaryPath)) {
    return bundledBinaryPath;
  }

  return null;
}

function getImageExtension(mimeType: string) {
  switch (mimeType) {
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/jpeg":
    case "image/jpg":
      return ".jpg";
    default:
      return null;
  }
}

async function ensureDirs() {
  await Promise.all([
    mkdir(GENERATED_VIDEO_DIR, { recursive: true }),
    mkdir(GENERATED_VIDEO_ASSET_DIR, { recursive: true }),
    mkdir(TEMP_DIR, { recursive: true }),
  ]);
}

async function saveRemoteAudioToTemp(audioUrl: string, basename: string) {
  const response = await fetch(audioUrl, {
    redirect: "follow",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("오디오 파일을 가져오지 못했습니다.");
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());

  if (audioBuffer.byteLength === 0) {
    throw new Error("오디오 파일이 비어 있습니다.");
  }

  const audioPath = path.join(TEMP_DIR, `${basename}.mp3`);
  await writeFile(audioPath, audioBuffer);
  return audioPath;
}

async function saveRemoteImageToPublic(imageUrl: string, basename: string) {
  const response = await fetch(imageUrl, {
    redirect: "follow",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("배경 이미지를 가져오지 못했습니다.");
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());

  if (imageBuffer.byteLength === 0) {
    throw new Error("배경 이미지가 비어 있습니다.");
  }

  const contentType = response.headers.get("content-type")?.split(";")[0].trim() ?? "image/jpeg";
  const imageExtension = getImageExtension(contentType);

  if (!imageExtension) {
    throw new Error("커버 이미지 형식을 확인할 수 없습니다.");
  }

  const publicImagePath = path.join(GENERATED_VIDEO_ASSET_DIR, `${basename}${imageExtension}`);
  await writeFile(publicImagePath, imageBuffer);
  return publicImagePath;
}

function runFfmpeg(inputImagePath: string, inputAudioPath: string, outputVideoPath: string) {
  return new Promise<void>((resolve, reject) => {
    const ffmpegPath = resolveFfmpegPath();

    if (!ffmpegPath) {
      reject(new Error("ffmpeg를 찾지 못했습니다."));
      return;
    }

    const processHandle = spawn(
      ffmpegPath,
      [
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-loop",
        "1",
        "-i",
        inputImagePath,
        "-i",
        inputAudioPath,
        "-vf",
        "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.00045,1.12)':x='max(0,min(iw-iw/zoom,iw/2-(iw/zoom/2)+sin(on/45)*24))':y='max(0,min(ih-ih/zoom,ih/2-(ih/zoom/2)+cos(on/60)*36))':d=1:s=1080x1920:fps=30,format=yuv420p",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-movflags",
        "+faststart",
        "-pix_fmt",
        "yuv420p",
        "-shortest",
        outputVideoPath,
      ],
      {
        windowsHide: true,
      },
    );

    let stderr = "";

    processHandle.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    processHandle.on("error", (error) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        reject(new Error("ffmpeg를 찾지 못했습니다."));
        return;
      }

      reject(error);
    });

    processHandle.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr.trim() || "비디오 렌더링에 실패했습니다."));
    });
  });
}

export async function renderVideoFromImage(params: {
  audioUrl: string;
  videoId: string;
  imageBuffer?: Buffer;
  imageMimeType?: string;
  imageUrl?: string;
}) {
  await ensureDirs();

  const uniqueName = `${params.videoId}-${randomUUID().slice(0, 8)}`;
  const publicVideoPath = path.join(GENERATED_VIDEO_DIR, `${uniqueName}.mp4`);
  let publicImagePath: string;

  if (params.imageBuffer && params.imageMimeType) {
    const imageExtension = getImageExtension(params.imageMimeType);

    if (!imageExtension) {
      throw new Error("PNG, JPG, WEBP 이미지만 업로드할 수 있습니다.");
    }

    publicImagePath = path.join(GENERATED_VIDEO_ASSET_DIR, `${uniqueName}${imageExtension}`);
    await writeFile(publicImagePath, params.imageBuffer);
  } else if (params.imageUrl) {
    publicImagePath = await saveRemoteImageToPublic(params.imageUrl, uniqueName);
  } else {
    throw new Error("비디오 배경 이미지가 필요합니다.");
  }

  const tempAudioPath = await saveRemoteAudioToTemp(params.audioUrl, uniqueName);

  try {
    await runFfmpeg(publicImagePath, tempAudioPath, publicVideoPath);
  } finally {
    await unlink(tempAudioPath).catch(() => undefined);
  }

  return {
    bgImageUrl: `/generated-video-assets/${path.basename(publicImagePath)}`,
    mp4Url: `/generated-videos/${path.basename(publicVideoPath)}`,
  };
}

