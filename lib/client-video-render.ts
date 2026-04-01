"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

type AlignedLyricLine = {
  text: string;
  start_s: number;
  end_s: number;
};

type SubtitleCue = {
  text: string;
  start_s: number;
  end_s: number;
};

type RenderAssetsPayload = {
  musicId: string;
  audioUrl: string;
  imageUrl: string | null;
  imageMimeType: string | null;
  alignedLyricLines: AlignedLyricLine[];
  titleText: string;
  suggestedFilename: string;
};

type RenderClientVideoParams = {
  musicId: string;
  selectedImageFile?: File | null;
  showLyrics: boolean;
  showTitle: boolean;
  fallbackTitle: string;
  onStage?: (message: string) => void;
  onProgress?: (progress: number) => void;
};

const FFMPEG_CORE_VERSION = "0.12.10";
const OUTPUT_WIDTH = 540;
const OUTPUT_HEIGHT = 960;
const OUTPUT_FPS = 8;
const TITLE_SAFE_Y = 58;
const LYRICS_SAFE_Y = OUTPUT_HEIGHT - 124;

let ffmpegSingleton: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<FFmpeg> | null = null;

function buildVideoFilename(name: string) {
  const safeName = name.replace(/[\\/:*?"<>|]/g, "").trim() || "songsai-video";
  return safeName.toLowerCase().endsWith(".mp4") ? safeName : `${safeName}.mp4`;
}

function sanitizeTitleText(value: string) {
  return value.trim().slice(0, 80);
}

function getCurrentCue(cues: SubtitleCue[], seconds: number) {
  return (
    cues.find((line) => seconds >= line.start_s && seconds < line.end_s) ??
    cues.find((line) => Math.abs(line.start_s - seconds) < 0.18) ??
    null
  );
}

function buildSubtitleCues(lines: AlignedLyricLine[]) {
  const rawCues: SubtitleCue[] = [];
  for (let index = 0; index < lines.length; index += 2) {
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
      return {
        ...cue,
        end_s: next ? Math.max(cue.end_s, next.start_s - 0.12) : cue.end_s,
      };
    })
    .filter((cue) => cue.text.trim().length > 0 && cue.end_s > cue.start_s);
}

function chooseRecorderMimeType() {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];

  for (const candidate of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }

  return "";
}

async function createImageBitmapFromSource(source: File | string) {
  const blob = source instanceof File ? source : await fetch(source, { cache: "no-store" }).then(async (response) => new Blob([await response.arrayBuffer()], { type: response.headers.get("content-type") ?? "image/jpeg" }));
  return await createImageBitmap(blob);
}

function drawCoverImage(ctx: CanvasRenderingContext2D, image: ImageBitmap) {
  ctx.clearRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

  const scale = Math.max(OUTPUT_WIDTH / image.width, OUTPUT_HEIGHT / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const dx = (OUTPUT_WIDTH - drawWidth) / 2;
  const dy = (OUTPUT_HEIGHT - drawHeight) / 2;

  ctx.drawImage(image, dx, dy, drawWidth, drawHeight);
}

function drawOverlayShade(ctx: CanvasRenderingContext2D) {
  const gradient = ctx.createLinearGradient(0, 0, 0, OUTPUT_HEIGHT);
  gradient.addColorStop(0, "rgba(0,0,0,0.18)");
  gradient.addColorStop(0.55, "rgba(0,0,0,0.10)");
  gradient.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
}

function drawTitle(ctx: CanvasRenderingContext2D, title: string) {
  const text = sanitizeTitleText(title);
  if (!text) {
    return;
  }

  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = "700 28px Arial";
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(0,0,0,0.78)";
  ctx.fillStyle = "#fff6a8";
  ctx.strokeText(text, 28, TITLE_SAFE_Y);
  ctx.fillText(text, 28, TITLE_SAFE_Y);
  ctx.restore();
}

function splitLinesForCanvas(text: string, maxChars = 24) {
  const rawLines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const flattened: string[] = [];
  for (const rawLine of rawLines) {
    if (rawLine.length <= maxChars) {
      flattened.push(rawLine);
      continue;
    }

    let remaining = rawLine;
    while (remaining.length > maxChars) {
      flattened.push(remaining.slice(0, maxChars));
      remaining = remaining.slice(maxChars);
    }
    if (remaining.length > 0) {
      flattened.push(remaining);
    }
  }

  return flattened.slice(0, 2);
}

function drawLyrics(ctx: CanvasRenderingContext2D, cue: AlignedLyricLine | null) {
  if (!cue) {
    return;
  }

  const lines = splitLinesForCanvas(cue.text, 24);
  if (lines.length === 0) {
    return;
  }

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 28px Arial";
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(0,0,0,0.88)";
  ctx.fillStyle = "#fff04a";

  lines.forEach((line, index) => {
    const y = LYRICS_SAFE_Y + index * 38;
    ctx.strokeText(line, OUTPUT_WIDTH / 2, y);
    ctx.fillText(line, OUTPUT_WIDTH / 2, y);
  });
  ctx.restore();
}

async function getFfmpeg(onStage?: (message: string) => void) {
  if (ffmpegSingleton?.loaded) {
    return ffmpegSingleton;
  }

  if (ffmpegLoadPromise) {
    return ffmpegLoadPromise;
  }

  ffmpegLoadPromise = (async () => {
    onStage?.("비디오 엔진을 불러오는 중입니다.");

    const ffmpeg = new FFmpeg();
    ffmpegSingleton = ffmpeg;

    ffmpeg.on("log", ({ message }) => {
      if (typeof window !== "undefined") {
        console.log("[client-video][ffmpeg]", message);
      }
    });

    ffmpeg.on("progress", ({ progress }) => {
      if (typeof window !== "undefined") {
        console.log("[client-video][progress]", progress);
      }
    });

    const canUseMultithread =
      typeof window !== "undefined" &&
      window.crossOriginIsolated &&
      typeof SharedArrayBuffer !== "undefined";

    try {
      if (!canUseMultithread) {
        throw new Error("Multithread unavailable");
      }

      const mtBase = `https://unpkg.com/@ffmpeg/core-mt@${FFMPEG_CORE_VERSION}/dist/umd`;
      const coreURL = await toBlobURL(`${mtBase}/ffmpeg-core.js`, "text/javascript", true);
      const wasmURL = await toBlobURL(`${mtBase}/ffmpeg-core.wasm`, "application/wasm", true);
      const workerURL = await toBlobURL(
        `${mtBase}/ffmpeg-core.worker.js`,
        "text/javascript",
        true,
      );

      await ffmpeg.load({
        coreURL,
        wasmURL,
        workerURL,
      });

      if (typeof window !== "undefined") {
        console.log("[client-video] ffmpeg core-mt loaded");
      }
    } catch (error) {
      if (typeof window !== "undefined") {
        console.warn("[client-video] core-mt unavailable, falling back to single-thread", error);
      }

      const base = `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/umd`;
      const coreURL = await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript", true);
      const wasmURL = await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm", true);

      await ffmpeg.load({
        coreURL,
        wasmURL,
      });
    }

    return ffmpeg;
  })();

  try {
    return await ffmpegLoadPromise;
  } finally {
    ffmpegLoadPromise = null;
  }
}

async function readJson(response: Response) {
  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "요청에 실패했습니다.");
  }
  return data;
}

async function getAudioDurationSeconds(ffmpeg: FFmpeg) {
  try {
    await ffmpeg.ffprobe([
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      "audio.mp3",
      "-o",
      "duration.txt",
    ]);

    const durationOutput = await ffmpeg.readFile("duration.txt", "utf8");
    const text =
      typeof durationOutput === "string" ? durationOutput : new TextDecoder().decode(durationOutput);
    return Math.max(0, Number.parseFloat(text.trim()) || 0);
  } catch {
    return 0;
  }
}

async function renderCanvasVideo(params: {
  imageSource: File | string;
  durationSeconds: number;
  titleText: string;
  alignedLyricLines: AlignedLyricLine[];
  showLyrics: boolean;
  showTitle: boolean;
  onProgress?: (progress: number) => void;
  onStage?: (message: string) => void;
}) {
  const subtitleCues = params.showLyrics ? buildSubtitleCues(params.alignedLyricLines) : [];
  const imageBitmap = await createImageBitmapFromSource(params.imageSource);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_WIDTH;
  canvas.height = OUTPUT_HEIGHT;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("브라우저 Canvas를 초기화하지 못했습니다.");
  }

  const mimeType = chooseRecorderMimeType();
  if (!mimeType) {
    throw new Error("이 브라우저는 비디오 녹화를 지원하지 않습니다.");
  }

  const stream = canvas.captureStream(OUTPUT_FPS);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 1_000_000 });
  const chunks: BlobPart[] = [];

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  const stopped = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => {
      reject(new Error("브라우저 비디오 녹화에 실패했습니다."));
    };
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: mimeType }));
    };
  });

  const renderFrame = (seconds: number) => {
    drawCoverImage(ctx, imageBitmap);
    drawOverlayShade(ctx);
    if (params.showTitle) {
      drawTitle(ctx, params.titleText);
    }
    if (params.showLyrics) {
      drawLyrics(ctx, getCurrentCue(subtitleCues, seconds));
    }
  };

  renderFrame(0);
  recorder.start(1000);
  params.onStage?.("브라우저 캔버스에서 영상을 그리는 중입니다.");

  const start = performance.now();
  await new Promise<void>((resolve) => {
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      const seconds = Math.min(params.durationSeconds, elapsed);

      renderFrame(seconds);

      const ratio =
        params.durationSeconds > 0 ? Math.max(0, Math.min(1, seconds / params.durationSeconds)) : 0;
      params.onProgress?.(24 + Math.round(ratio * 56));

      if (elapsed < params.durationSeconds + 0.2) {
        requestAnimationFrame(tick);
        return;
      }

      recorder.stop();
      resolve();
    };

    requestAnimationFrame(tick);
  });

  imageBitmap.close();
  return await stopped;
}

export async function renderVideoInBrowser({
  musicId,
  selectedImageFile,
  showLyrics,
  showTitle,
  fallbackTitle,
  onStage,
  onProgress,
}: RenderClientVideoParams) {
  onStage?.("비디오 재료를 준비하는 중입니다.");
  onProgress?.(8);

  const assetsResponse = await fetch(
    `/api/music/${musicId}/client-video-assets?showLyrics=${showLyrics ? "true" : "false"}`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    },
  );

  const assets = (await readJson(assetsResponse)) as unknown as RenderAssetsPayload;

  if (typeof window !== "undefined") {
    console.log("[client-video] assets", {
      musicId,
      showLyrics,
      showTitle,
      titleText: assets.titleText,
      lineCount: assets.alignedLyricLines?.length ?? 0,
      imageUrl: assets.imageUrl,
      audioUrl: assets.audioUrl,
    });
  }

  const imageSource = selectedImageFile ?? assets.imageUrl;
  if (!imageSource) {
    throw new Error("배경 이미지를 준비하지 못했습니다.");
  }

  const ffmpeg = await getFfmpeg(onStage);

  onStage?.("오디오와 이미지를 불러오는 중입니다.");
  onProgress?.(18);

  await ffmpeg.writeFile("audio.mp3", await fetchFile(assets.audioUrl));
  const durationSeconds = await getAudioDurationSeconds(ffmpeg);

  if (durationSeconds <= 0) {
    throw new Error("오디오 길이를 확인하지 못했습니다.");
  }

  const silentVideoBlob = await renderCanvasVideo({
    imageSource,
    durationSeconds,
    titleText: showTitle ? assets.titleText || fallbackTitle : "",
    alignedLyricLines: assets.alignedLyricLines ?? [],
    showLyrics,
    showTitle,
    onStage,
    onProgress,
  });

  onStage?.("오디오와 영상을 합치는 중입니다.");
  onProgress?.(82);

  await ffmpeg.writeFile("video.webm", await fetchFile(silentVideoBlob));

  let fallbackProgress = 82;
  const muxProgressHandler = ({ progress }: { progress: number }) => {
    const bounded = Math.max(0, Math.min(1, progress));
    onProgress?.(82 + Math.round(bounded * 14));
  };

  ffmpeg.on("progress", muxProgressHandler);
  let pulseTimer: number | null = null;

  let exitCode = 1;
  try {
    pulseTimer = window.setInterval(() => {
      fallbackProgress = Math.min(96, fallbackProgress + 1);
      onProgress?.(fallbackProgress);
    }, 1000);

    exitCode = await ffmpeg.exec([
      "-i",
      "video.webm",
      "-i",
      "audio.mp3",
      "-c:v",
      "copy",
      "-c:a",
      "copy",
      "-shortest",
      "output.mp4",
    ]);

    if (exitCode !== 0) {
      exitCode = await ffmpeg.exec([
        "-i",
        "video.webm",
        "-i",
        "audio.mp3",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-shortest",
        "output.mp4",
      ]);
    }
  } finally {
    ffmpeg.off("progress", muxProgressHandler);
    if (pulseTimer !== null) {
      window.clearInterval(pulseTimer);
    }
  }

  if (exitCode !== 0) {
    throw new Error("브라우저 비디오 생성에 실패했습니다.");
  }

  onStage?.("완성된 비디오를 정리하는 중입니다.");
  onProgress?.(98);

  const output = await ffmpeg.readFile("output.mp4");
  const binaryOutput = output instanceof Uint8Array ? output : new TextEncoder().encode(output);
  const stableOutputBuffer = binaryOutput.slice().buffer as ArrayBuffer;
  const videoBlob = new Blob([stableOutputBuffer], { type: "video/mp4" });
  const videoUrl = URL.createObjectURL(videoBlob);

  return {
    filename: buildVideoFilename(assets.suggestedFilename || fallbackTitle || "songsai-video.mp4"),
    videoBlob,
    videoUrl,
  };
}
