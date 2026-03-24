"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

type FormMode = "signup" | "login";
type VocalGender = "auto" | "female" | "male";
type LyricMode = "manual" | "auto";
type TrackCount = 1 | 2;
type ModelVersion = "v4_5_plus" | "v5";

type PublicUser = {
  id: string;
  email: string;
  freeCredits: number;
  paidCredits: number;
  totalCredits: number;
  tier: string | null;
  role: "USER" | "ADMIN";
};

type MusicTrack = {
  id: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  mp3Url: string | null;
};

type MusicItem = {
  id: string;
  title: string | null;
  lyrics: string;
  stylePrompt: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  createdAt: string;
  errorMessage: string | null;
  tracks: MusicTrack[];
};

type AuthPanelProps = {
  showAllMusicList?: boolean;
};

async function readJson(response: Response) {
  const data = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Request failed");
  }

  return data;
}

function formatCredits(value: number) {
  return value.toLocaleString("ko-KR");
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: MusicItem["status"]) {
  switch (status) {
    case "QUEUED":
      return "대기 중";
    case "PROCESSING":
      return "생성 중";
    case "COMPLETED":
      return "완료";
    case "FAILED":
      return "실패";
    case "CANCELLED":
      return "취소됨";
    default:
      return status;
  }
}

function statusTone(status: MusicItem["status"]) {
  switch (status) {
    case "COMPLETED":
      return "bg-[#eef8f1] text-[#1c6a42]";
    case "FAILED":
      return "bg-[#fff0eb] text-[#b64822]";
    case "PROCESSING":
      return "bg-[#fff6e6] text-[#9a5b09]";
    default:
      return "bg-[#f4efe8] text-[#6b5648]";
  }
}

function formatCost(trackCount: TrackCount) {
  return trackCount === 2 ? "700" : "500";
}

function summarizeMusicLabel(item: MusicItem) {
  const base = item.title?.trim() || item.lyrics.replace(/\s+/g, " ").trim();
  return base.length > 34 ? `${base.slice(0, 34)}...` : base;
}

export function AuthPanel({ showAllMusicList = false }: AuthPanelProps) {
  const [mode, setMode] = useState<FormMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("로그인하면 바로 작업 화면으로 이동합니다.");
  const [user, setUser] = useState<PublicUser | null>(null);
  const [title, setTitle] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [stylePrompt, setStylePrompt] = useState("");
  const [lyricMode, setLyricMode] = useState<LyricMode>("manual");
  const [vocalGender, setVocalGender] = useState<VocalGender>("auto");
  const [trackCount, setTrackCount] = useState<TrackCount>(2);
  const [modelVersion, setModelVersion] = useState<ModelVersion>("v5");
  const [musics, setMusics] = useState<MusicItem[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isBooting, setIsBooting] = useState(true);

  async function loadCurrentUser() {
    const response = await fetch("/api/me", {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    const data = (await readJson(response)) as { item: PublicUser };
    return data.item;
  }

  async function loadMusicItems() {
    const response = await fetch("/api/music", {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("음악 목록을 불러오지 못했습니다.");
    }

    const data = (await readJson(response)) as { items: MusicItem[] };
    setMusics(data.items);
  }

  useEffect(() => {
    let isMounted = true;

    startTransition(async () => {
      try {
        const currentUser = await loadCurrentUser();

        if (isMounted) {
          setUser(currentUser);
          if (currentUser) {
            setMessage("다시 오신 것을 환영합니다.");
            await loadMusicItems();
          }
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsBooting(false);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const hasPendingMusic = musics.some(
      (item) => item.status === "QUEUED" || item.status === "PROCESSING",
    );

    if (!hasPendingMusic) {
      return;
    }

    const timer = window.setInterval(() => {
      startTransition(async () => {
        try {
          await loadMusicItems();
          const refreshedUser = await loadCurrentUser();
          setUser(refreshedUser);
        } catch {
          // silent polling
        }
      });
    }, 4000);

    return () => {
      window.clearInterval(timer);
    };
  }, [musics, user]);

  function submitAuth() {
    startTransition(async () => {
      try {
        setMessage("요청을 처리하는 중입니다...");

        const response = await fetch(`/api/auth/${mode}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        const data = (await readJson(response)) as { item: PublicUser };
        setUser(data.item);
        setPassword("");
        setMessage(
          mode === "signup"
            ? "회원가입이 완료됐습니다. 무료 크레딧 1,000이 지급됐습니다."
            : "로그인이 완료됐습니다.",
        );
        await loadMusicItems();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.");
      }
    });
  }

  function logout() {
    startTransition(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setMusics([]);
      setPassword("");
      setMode("login");
      setMessage("로그아웃했습니다.");
    });
  }

  function createMusic() {
    startTransition(async () => {
      try {
        setMessage("음악 생성 요청을 등록하는 중입니다...");

        const response = await fetch("/api/music", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            title,
            lyrics,
            stylePrompt,
            lyricMode,
            vocalGender,
            trackCount,
            modelVersion,
          }),
        });

        await readJson(response);
        await loadMusicItems();
        const refreshedUser = await loadCurrentUser();
        setUser(refreshedUser);
        setTitle("");
        setLyrics("");
        setStylePrompt("");
        setLyricMode("manual");
        setVocalGender("auto");
        setTrackCount(2);
        setModelVersion("v5");
        setMessage("음악 생성 요청을 등록했습니다.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "음악 생성 요청에 실패했습니다.");
      }
    });
  }

  const visibleMusics = musics.filter((item) => item.status !== "FAILED");
  const recentMusics = showAllMusicList ? visibleMusics : visibleMusics.slice(0, 3);

  if (isBooting) {
    return (
      <section className="flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm rounded-[1.75rem] border border-[var(--border)] bg-white/85 p-7 text-center shadow-[0_20px_60px_rgba(90,55,30,0.12)]">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
            AI Trot Studio
          </p>
          <p className="mt-4 text-base text-[#5a4336]">세션 상태를 확인하는 중입니다...</p>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="flex min-h-screen items-center justify-center px-5 py-8">
        <div className="w-full max-w-sm rounded-[1.9rem] border border-[var(--border)] bg-white/90 p-6 shadow-[0_25px_80px_rgba(90,55,30,0.12)]">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--accent)]">
            AI Trot Studio
          </p>
          <h1 className="mt-4 text-[1.9rem] font-semibold leading-tight text-[#2d2018]">
            로그인하고 바로 음악 작업을 시작하세요
          </h1>
          <p className="mt-4 text-sm leading-7 text-[#6b5648]">
            회원가입하면 무료 크레딧 1,000이 즉시 지급됩니다. 무료 30일, 유료 60일 정책은
            자동 적용됩니다.
          </p>

          <div className="mt-6 inline-flex rounded-full border border-[var(--border)] bg-[#fbf4ea] p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              disabled={isPending}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                mode === "login" ? "bg-[var(--accent)] text-white" : "text-[#6b5648]"
              } disabled:opacity-60`}
            >
              로그인
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              disabled={isPending}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                mode === "signup" ? "bg-[var(--accent)] text-white" : "text-[#6b5648]"
              } disabled:opacity-60`}
            >
              회원가입
            </button>
          </div>

          <div className="mt-6 grid gap-3">
            <label className="grid gap-2 text-sm font-medium text-[#3b2a20]">
              이메일
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="artist@example.com"
                className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-base outline-none transition focus:border-[var(--accent-soft)]"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-[#3b2a20]">
              비밀번호
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="8자 이상 입력"
                className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-base outline-none transition focus:border-[var(--accent-soft)]"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={submitAuth}
            disabled={isPending}
            className="mt-6 w-full rounded-2xl bg-[var(--accent)] px-5 py-4 text-base font-semibold text-white disabled:opacity-60"
          >
            {isPending ? "처리 중..." : mode === "signup" ? "회원가입하고 시작하기" : "로그인하기"}
          </button>

          <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[#fffaf4] p-4">
            <p className="text-sm leading-7 text-[#6b5648]">{message}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-5 sm:px-5">
      <div className="rounded-[1.6rem] border border-[var(--border)] bg-white/88 p-4 shadow-[0_15px_40px_rgba(90,55,30,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#5a4336]">{user.email}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#f4efe8] px-3 py-1 text-xs font-semibold text-[#5d493e]">
                총 {formatCredits(user.totalCredits)}
              </span>
              <span className="rounded-full bg-[#eef8f1] px-3 py-1 text-xs font-semibold text-[#1c6a42]">
                무료 {formatCredits(user.freeCredits)}
              </span>
              <span className="rounded-full bg-[#fff0eb] px-3 py-1 text-xs font-semibold text-[#b64822]">
                유료 {formatCredits(user.paidCredits)}
              </span>
              <Link
                href="/credits"
                className="rounded-full border border-[var(--border)] bg-[#fffdf9] px-3 py-1 text-[11px] font-semibold text-[var(--accent)]"
              >
                크레딧 충전
              </Link>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            disabled={isPending}
            className="shrink-0 rounded-full border border-[var(--border)] bg-[#fbf6ef] px-4 py-2 text-xs font-semibold text-[#4e3b30] disabled:opacity-60"
          >
            로그아웃
          </button>
        </div>
      </div>

      {!showAllMusicList ? (
        <div className="mt-4 rounded-[1.8rem] border border-[var(--border)] bg-white/92 p-5 shadow-[0_18px_50px_rgba(90,55,30,0.1)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                Music Create
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[#2d2018]">음악 생성 입력</h2>
            </div>
            <span className="rounded-full bg-[#fff6e6] px-3 py-1 text-xs font-semibold text-[#9a5b09]">
              {trackCount}곡 · {formatCost(trackCount)}크레딧
            </span>
          </div>

          <p className="mt-3 text-sm leading-7 text-[#6b5648]">
            제목, 가사, 스타일을 넣고 모델과 곡 수를 선택하면 생성 요청이 등록됩니다.
          </p>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-[#3b2a20]">
              제목
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="예: 당신을 만나지 어제 같은데"
                className="rounded-[1.2rem] border border-[var(--border)] bg-[#fffdf9] px-4 py-3 text-base outline-none transition focus:border-[var(--accent)]"
              />
            </label>

            <div className="grid gap-2 text-sm font-medium text-[#3b2a20]">
              <span>가사 모드</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "manual", label: "직접 입력" },
                  { value: "auto", label: "AI 자동 생성", disabled: true },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      if (option.disabled) {
                        setMessage(
                          "AI 자동 가사 생성은 Suno wrapper 패치가 필요해서 현재는 임시 비활성화되어 있습니다.",
                        );
                        return;
                      }

                      setLyricMode(option.value as LyricMode);
                    }}
                    disabled={Boolean(option.disabled)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      lyricMode === option.value
                        ? "bg-[var(--accent)] text-white"
                        : option.disabled
                          ? "border border-[var(--border)] bg-[#f5f1eb] text-[#a08c7d]"
                          : "border border-[var(--border)] bg-[#fffdf9] text-[#5a4336]"
                    } disabled:cursor-not-allowed`}
                  >
                    {option.label}
                    {option.disabled ? " 준비중" : ""}
                  </button>
                ))}
              </div>
            </div>

            <label className="grid gap-2 text-sm font-medium text-[#3b2a20]">
              {lyricMode === "manual" ? "가사" : "가사 아이디어"}
              <textarea
                value={lyrics}
                onChange={(event) => setLyrics(event.target.value)}
                placeholder={
                  lyricMode === "manual"
                    ? "예: 바람이 차가운 저녁이 오면..."
                    : "예: 고향을 그리워하는 중년 여성의 애틋한 트로트 가사를 만들어줘"
                }
                rows={7}
                className="min-h-[170px] rounded-[1.4rem] border border-[var(--border)] bg-[#fffdf9] px-4 py-4 text-base leading-7 outline-none transition focus:border-[var(--accent)]"
              />
              <span className="text-xs text-[#8a7465]">{lyrics.length}자</span>
            </label>

            <label className="grid gap-2 text-sm font-medium text-[#3b2a20]">
              스타일
              <input
                type="text"
                value={stylePrompt}
                onChange={(event) => setStylePrompt(event.target.value)}
                placeholder="예: 신비롭고 애절한 분위기, 여성보컬"
                className="rounded-[1.2rem] border border-[var(--border)] bg-[#fffdf9] px-4 py-3 text-base outline-none transition focus:border-[var(--accent)]"
              />
            </label>

            <div className="grid gap-2 text-sm font-medium text-[#3b2a20]">
              <span>모델 버전</span>
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    value: "v4_5_plus" as ModelVersion,
                    label: "블루",
                    activeClass: "bg-[#1f5fbf] text-white border-[#1f5fbf]",
                    idleClass: "border border-[#bfd7ff] bg-[#eef5ff] text-[#1f5fbf]",
                  },
                  {
                    value: "v5" as ModelVersion,
                    label: "레드",
                    activeClass: "bg-[#b64822] text-white border-[#b64822]",
                    idleClass: "border border-[#f0c3b4] bg-[#fff1eb] text-[#b64822]",
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setModelVersion(option.value)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      modelVersion === option.value ? option.activeClass : option.idleClass
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2 text-sm font-medium text-[#3b2a20]">
              <span>보컬</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "auto", label: "자동" },
                  { value: "female", label: "여성" },
                  { value: "male", label: "남성" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setVocalGender(option.value as VocalGender)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      vocalGender === option.value
                        ? "bg-[var(--accent)] text-white"
                        : "border border-[var(--border)] bg-[#fffdf9] text-[#5a4336]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2 text-sm font-medium text-[#3b2a20]">
              <span>생성 곡 수</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 1 as TrackCount, label: "1곡", cost: "500크레딧" },
                  { value: 2 as TrackCount, label: "2곡", cost: "700크레딧" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTrackCount(option.value)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      trackCount === option.value
                        ? "bg-[var(--accent)] text-white"
                        : "border border-[var(--border)] bg-[#fffdf9] text-[#5a4336]"
                    }`}
                  >
                    {option.label} · {option.cost}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={createMusic}
            disabled={
              isPending ||
              title.trim().length < 1 ||
              lyrics.trim().length < 10 ||
              stylePrompt.trim().length < 2
            }
            className="mt-5 w-full rounded-[1.3rem] bg-[var(--accent)] px-5 py-4 text-base font-semibold text-white shadow-[0_14px_30px_rgba(182,72,34,0.22)] disabled:opacity-60"
          >
            {isPending ? "처리 중..." : "음악 생성 요청하기"}
          </button>

          <div className="mt-4 rounded-[1.2rem] border border-[var(--border)] bg-[#fffaf4] px-4 py-3">
            <p className="text-sm leading-7 text-[#6b5648]">{message}</p>
          </div>
        </div>
      ) : null}

      <div className="mt-4 rounded-[1.6rem] border border-[var(--border)] bg-white/88 p-4 shadow-[0_15px_40px_rgba(90,55,30,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              My Music
            </p>
            <h2 className="mt-2 text-lg font-semibold text-[#2d2018]">
              {showAllMusicList ? "전체 음악 리스트" : "최근 생성 음악"}
            </h2>
          </div>
          {!showAllMusicList && visibleMusics.length > 3 ? (
            <Link
              href="/music-history"
              className="rounded-full border border-[var(--border)] bg-[#fffdf9] px-3 py-2 text-xs font-semibold text-[#5a4336]"
            >
              전체 보기
            </Link>
          ) : (
            <span className="text-xs text-[#7a6558]">{visibleMusics.length}건</span>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {recentMusics.length === 0 ? (
            <div className="rounded-[1.2rem] border border-dashed border-[var(--border)] bg-[#fffaf4] p-4 text-sm leading-7 text-[#6b5648]">
              {showAllMusicList
                ? "표시할 완료/진행 중 음악이 없습니다."
                : "최근 생성한 음악이 없습니다. 아래 입력 폼에서 첫 요청을 등록해보세요."}
            </div>
          ) : (
            recentMusics.map((music) => (
              <article
                key={music.id}
                className="rounded-[1rem] border border-[var(--border)] bg-[#fffdf9] px-3 py-3"
              >
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 lg:flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[11px] text-[#8a7465]">{formatDate(music.createdAt)}</p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusTone(
                          music.status,
                        )}`}
                      >
                        {statusLabel(music.status)}
                      </span>
                      <span className="text-[11px] text-[#8a7465]">{music.tracks.length}곡</span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-[#3f2f25]">{summarizeMusicLabel(music)}</p>
                    <p className="mt-1 text-[11px] text-[#8a7465]">스타일 · {music.stylePrompt}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {music.tracks.map((track, index) =>
                      track.mp3Url ? (
                        <div key={track.id} className="flex gap-2">
                          <a
                            href={track.mp3Url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-[var(--border)] bg-white px-3 py-2 text-[11px] font-semibold text-[#4e3b30]"
                          >
                            듣기 {index + 1}
                          </a>
                          <a
                            href={`/api/music/${track.id}/download`}
                            className="rounded-full bg-[var(--accent)] px-3 py-2 text-[11px] font-semibold text-white"
                          >
                            다운로드 {index + 1}
                          </a>
                        </div>
                      ) : (
                        <span
                          key={track.id}
                          className="rounded-full border border-[var(--border)] bg-[#f7f2eb] px-3 py-2 text-[11px] text-[#8a7465]"
                        >
                          트랙 {index + 1} 준비중
                        </span>
                      ),
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
