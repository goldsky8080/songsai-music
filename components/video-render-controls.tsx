"use client";

import { useEffect, useRef, useState } from "react";

type VideoRenderControlsProps = {
  musicId: string;
  trackIndex: number;
  mp4Url: string | null | undefined;
  onCompleted?: () => Promise<void> | void;
};

async function readJson(response: Response) {
  const data = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Request failed");
  }

  return data;
}

function shortenFileName(name: string) {
  return name.length > 12 ? `${name.slice(0, 12)}...` : name;
}

function triggerDownload(url: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "";
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function VideoRenderControls({
  musicId,
  trackIndex,
  mp4Url,
  onCompleted,
}: VideoRenderControlsProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (progressTimerRef.current !== null) {
        window.clearInterval(progressTimerRef.current);
      }
    };
  }, []);

  function chooseImage() {
    inputRef.current?.click();
  }

  function startProgress() {
    setProgress(8);
    setStatusText("비디오 렌더링을 준비하고 있습니다.");

    if (progressTimerRef.current !== null) {
      window.clearInterval(progressTimerRef.current);
    }

    progressTimerRef.current = window.setInterval(() => {
      setProgress((current) => {
        if (current < 28) {
          setStatusText("커버 이미지와 오디오를 불러오는 중입니다.");
          return current + 4;
        }

        if (current < 58) {
          setStatusText("세로형 비디오 프레임을 만드는 중입니다.");
          return current + 3;
        }

        if (current < 82) {
          setStatusText("확대/이동 효과를 적용하는 중입니다.");
          return current + 2;
        }

        if (current < 94) {
          setStatusText("마무리 렌더링 중입니다.");
          return current + 1;
        }

        return current;
      });
    }, 700);
  }

  function stopProgress() {
    if (progressTimerRef.current !== null) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }

  function handleCreateVideo() {
    setIsRendering(true);
    startProgress();

    void (async () => {
      try {
        const formData = new FormData();

        if (selectedFile) {
          formData.append("image", selectedFile);
        }

        const response = await fetch(`/api/music/${musicId}/video`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        const data = await readJson(response);
        const item =
          data.item && typeof data.item === "object" ? (data.item as Record<string, unknown>) : null;
        const nextMp4Url = typeof item?.mp4Url === "string" ? item.mp4Url : null;

        stopProgress();
        setProgress(100);
        setStatusText("완료되었습니다. 비디오를 다운로드합니다.");
        setSelectedFile(null);

        if (inputRef.current) {
          inputRef.current.value = "";
        }

        await onCompleted?.();

        if (nextMp4Url) {
          triggerDownload(nextMp4Url);
        }

        window.setTimeout(() => {
          setProgress(0);
          setStatusText(null);
        }, 1200);
      } catch (error) {
        stopProgress();
        setProgress(0);
        setStatusText(null);
        window.alert(error instanceof Error ? error.message : "비디오 생성에 실패했습니다.");
      } finally {
        setIsRendering(false);
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
        {isRendering ? `비디오 생성중 ${progress}%` : selectedFile ? "비디오+100" : "커버로 비디오+100"}
      </button>
      {mp4Url ? (
        <a
          href={mp4Url}
          download
          className="rounded-full bg-[var(--accent)] px-3 py-2 text-[11px] font-semibold text-white"
        >
          비디오 {trackIndex}
        </a>
      ) : null}
      {isRendering || progress > 0 ? (
        <div className="w-full rounded-[1rem] border border-[var(--border)] bg-white/80 px-3 py-3">
          <div className="flex items-center justify-between gap-3 text-[11px] font-semibold text-[#6f5849]">
            <span>{statusText ?? "비디오를 준비하고 있습니다."}</span>
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
