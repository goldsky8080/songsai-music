import { existsSync } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import ffmpegStatic from "ffmpeg-static";
import type { AlignedLyricLine } from "@/server/music/aligned-lyrics";

const GENERATED_VIDEO_DIR = path.join(process.cwd(), "public", "generated-videos");
const GENERATED_VIDEO_ASSET_DIR = path.join(process.cwd(), "public", "generated-video-assets");
const TEMP_DIR = path.join(tmpdir(), "songsai-video-render");
const SUBTITLE_GAP_PADDING_S = 0.12;
const TITLE_EVENT_END = "9:59:59.00";

type SubtitleCue = {
  text: string;
  start_s: number;
  end_s: number;
};

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

function buildSubtitleCues(lines: AlignedLyricLine[]) {
  const rawCues: SubtitleCue[] = [];
  const introLineCount = Math.min(4, lines.length);

  if (introLineCount > 0) {
    const introLines = lines.slice(0, introLineCount);
    rawCues.push({
      text: introLines.map((line) => line.text.trim()).filter(Boolean).join("\n"),
      start_s: introLines[0].start_s,
      end_s: introLines[introLines.length - 1].end_s,
    });
  }

  for (let index = introLineCount; index < lines.length; index += 2) {
    const first = lines[index];
    const second = lines[index + 1];

    if (!first) {
      continue;
    }

    const parts = [first.text.trim()];
    let end_s = first.end_s;

    if (second && second.text.trim().length > 0) {
      parts.push(second.text.trim());
      end_s = second.end_s;
    }

    rawCues.push({
      text: parts.join("\n"),
      start_s: first.start_s,
      end_s,
    });
  }

  return rawCues
    .map((cue, index) => {
      const next = rawCues[index + 1];
      const extendedEnd = next ? Math.max(cue.end_s, next.start_s - SUBTITLE_GAP_PADDING_S) : cue.end_s;

      return {
        ...cue,
        end_s: extendedEnd,
      };
    })
    .filter((cue) => cue.text.trim().length > 0 && cue.end_s > cue.start_s);
}

function toAssTimestamp(seconds: number) {
  const totalCentiseconds = Math.max(0, Math.round(seconds * 100));
  const hours = Math.floor(totalCentiseconds / 360000);
  const minutes = Math.floor((totalCentiseconds % 360000) / 6000);
  const secs = Math.floor((totalCentiseconds % 6000) / 100);
  const centiseconds = totalCentiseconds % 100;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
}

function escapeAssText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/\n/g, "\\N");
}

function toSubtitleFilterPath(filePath: string) {
  return filePath.replace(/\\/g, "/").replace(/:/g, "\\:");
}

async function writeAssSubtitleFile(params: {
  lines: AlignedLyricLine[];
  basename: string;
  titleText?: string;
}) {
  const subtitlePath = path.join(TEMP_DIR, `${params.basename}.ass`);
  const cues = buildSubtitleCues(params.lines);
  const events: string[] = [];

  if (params.titleText && params.titleText.trim().length > 0) {
    events.push(
      `Dialogue: 0,0:00:00.00,${TITLE_EVENT_END},Title,,0,0,0,,${escapeAssText(params.titleText.trim())}`,
    );
  }

  for (const cue of cues) {
    events.push(
      `Dialogue: 0,${toAssTimestamp(cue.start_s)},${toAssTimestamp(cue.end_s)},Default,,0,0,0,,${escapeAssText(cue.text.trim())}`,
    );
  }

  const assContent = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Malgun Gothic,70,&H0000F6FF,&H0000F6FF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,2.8,0,2,90,90,165,1
Style: Title,Malgun Gothic,44,&H0000F6FF,&H0000F6FF,&H00000000,&H00000000,1,0,0,0,100,100,0,0,1,2.4,0,7,46,70,62,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events.join("\n")}
`;

  await writeFile(subtitlePath, assContent, "utf8");
  return subtitlePath;
}

function runFfmpeg(
  inputImagePath: string,
  inputAudioPath: string,
  outputVideoPath: string,
  subtitlePath?: string,
) {
  return new Promise<void>((resolve, reject) => {
    const ffmpegPath = resolveFfmpegPath();

    if (!ffmpegPath) {
      reject(new Error("ffmpeg를 찾지 못했습니다."));
      return;
    }

    const videoFilter = [
      "scale=1280:2276:force_original_aspect_ratio=increase",
      "crop=1280:2276",
      "zoompan=z='if(lte(on,180),1.02+on*0.00035,if(lte(on,360),1.083-(on-180)*0.00025,1.038))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=30",
      "format=yuv420p",
    ];

    if (subtitlePath) {
      videoFilter.push(`subtitles='${toSubtitleFilterPath(subtitlePath)}'`);
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
        videoFilter.join(","),
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
  alignedLyricLines?: AlignedLyricLine[];
  titleText?: string;
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
  const subtitlePath =
    (params.alignedLyricLines && params.alignedLyricLines.length > 0) || params.titleText
      ? await writeAssSubtitleFile({
          lines: params.alignedLyricLines ?? [],
          basename: uniqueName,
          titleText: params.titleText,
        })
      : null;

  try {
    await runFfmpeg(publicImagePath, tempAudioPath, publicVideoPath, subtitlePath ?? undefined);
  } finally {
    await unlink(tempAudioPath).catch(() => undefined);
    if (subtitlePath) {
      await unlink(subtitlePath).catch(() => undefined);
    }
  }

  return {
    bgImageUrl: `/generated-video-assets/${path.basename(publicImagePath)}`,
    mp4Url: `/generated-videos/${path.basename(publicVideoPath)}`,
  };
}
