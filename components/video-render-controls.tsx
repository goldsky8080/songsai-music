"use client";

import { useEffect, useRef, useState } from "react";
import { renderVideoInBrowser } from "@/lib/client-video-render";

type VideoRenderControlsProps = {
  musicId: string;
  trackIndex: number;
  mp4Url: string | null | undefined;
  latestVideoId?: string | null;
  title: string;
  isMr?: boolean;
  onCompleted?: () => Promise<void> | void;
};

const BASE_VIDEO_COST = 100;
const LYRICS_VIDEO_COST = 300;

function shortenFileName(name: string) {
  return name.length > 12 ? `${name.slice(0, 12)}...` : name;
}

function triggerBlobDownload(url: string, fileName: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function buildVideoDownloadUrl(musicId: string, videoId?: string | null) {
  const query = videoId ? `?videoId=${encodeURIComponent(videoId)}` : "";
  return `/api/music/${musicId}/video-file${query}`;
}

export function VideoRenderControls({
  musicId,
  trackIndex,
  mp4Url,
  latestVideoId,
  title,
  isMr = false,
  onCompleted,
}: VideoRenderControlsProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const onCompletedRef = useRef<VideoRenderControlsProps["onCompleted"]>(onCompleted);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [showLyrics, setShowLyrics] = useState(true);
  const [showTitle, setShowTitle] = useState(true);
  const [downloadVideoId, setDownloadVideoId] = useState<string | null>(latestVideoId ?? null);
  const [hasDownloadableVideo, setHasDownloadableVideo] = useState(Boolean(mp4Url));

  const videoCost = showLyrics ? LYRICS_VIDEO_COST : BASE_VIDEO_COST;

  useEffect(() => {
    setDownloadVideoId(latestVideoId ?? null);
  }, [latestVideoId]);

  useEffect(() => {
    setHasDownloadableVideo(Boolean(mp4Url));
  }, [mp4Url]);

  useEffect(() => {
    onCompletedRef.current = onCompleted;
  }, [onCompleted]);

  useEffect(() => {
    if (isMr && showLyrics) {
      setShowLyrics(false);
    }
  }, [isMr, showLyrics]);

  function chooseImage() {
    inputRef.current?.click();
  }

  function handleCreateVideo() {
    void (async () => {
      try {
        setIsRendering(true);
        setStatusText("브라우저에서 비디오 생성을 준비하고 있습니다.");
        setProgress(8);

        const rendered = await renderVideoInBrowser({
          musicId,
          selectedImageFile: selectedFile,
          showLyrics: isMr ? false : showLyrics,
          showTitle,
          fallbackTitle: title,
          onStage: (message) => {
            setStatusText(message);
          },
          onProgress: (nextProgress) => {
            setProgress((current) => Math.max(current, nextProgress));
          },
        });

        await onCompletedRef.current?.();

        setProgress(100);
        setStatusText("완료되었습니다. 비디오를 다운로드합니다.");
        triggerBlobDownload(rendered.videoUrl, rendered.filename);

        window.setTimeout(() => {
          URL.revokeObjectURL(rendered.videoUrl);
          setIsRendering(false);
          setProgress(0);
          setStatusText(null);
        }, 1200);
      } catch (error) {
        setIsRendering(false);
        setProgress(0);
        setStatusText(null);
        window.alert(error instanceof Error ? error.message : "브라우저 비디오 생성에 실패했습니다.");
      }
    })();
  }

  return (
    <div className="flex w-full flex-wrap gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          const nextFile = event.target.files?.[0] ?? null;
          setSelectedFile(nextFile);
        }}
      />
      <button
        type="button"
        onClick={chooseImage}
        className="rounded-full border border-[var(--border)] bg-white px-3 py-2 text-[11px] font-semibold text-[#4e3b30]"
      >
        {selectedFile ? shortenFileName(selectedFile.name) : "이미지선택"}
      </button>
      <button
        type="button"
        onClick={handleCreateVideo}
        disabled={isRendering}
        className="rounded-full border border-[var(--accent)] bg-[#fff1eb] px-3 py-2 text-[11px] font-semibold text-[var(--accent)] disabled:opacity-50"
      >
        {isRendering
          ? `브라우저 렌더중 ${progress}%`
          : selectedFile
            ? `비디오+${videoCost}`
            : `커버로 비디오+${videoCost}`}
      </button>
      {hasDownloadableVideo && downloadVideoId ? (
        <a
          href={buildVideoDownloadUrl(musicId, downloadVideoId)}
          download
          className="rounded-full bg-[var(--accent)] px-3 py-2 text-[11px] font-semibold text-white"
        >
          비디오 {trackIndex}
        </a>
      ) : null}

      <label className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-3 py-2 text-[11px] font-semibold text-[#4e3b30]">
        <input
          type="checkbox"
          checked={showLyrics}
          disabled={isMr}
          onChange={(event) => setShowLyrics(event.target.checked)}
          className="h-3.5 w-3.5"
        />
        가사 표시
      </label>
      <label className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-3 py-2 text-[11px] font-semibold text-[#4e3b30]">
        <input
          type="checkbox"
          checked={showTitle}
          onChange={(event) => setShowTitle(event.target.checked)}
          className="h-3.5 w-3.5"
        />
        제목 표시
      </label>

      {isRendering || progress > 0 ? (
        <div className="w-full rounded-[1rem] border border-[var(--border)] bg-white/80 px-3 py-3">
          <div className="flex items-center justify-between gap-3 text-[11px] font-semibold text-[#6f5849]">
            <span>{statusText ?? "브라우저에서 비디오를 준비하고 있습니다."}</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f3e4da]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500"
              style={{ width: `${Math.max(progress, 4)}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
