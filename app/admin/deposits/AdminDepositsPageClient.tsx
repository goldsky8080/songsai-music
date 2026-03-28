"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

type DepositRequestItem = {
  id: string;
  userId: string;
  email: string;
  requestedAmount: number;
  requestedCredits: number;
  depositorName: string;
  bankName: string;
  accountNumberSnapshot: string;
  status: "PENDING" | "AUTO_MATCHED" | "APPROVED" | "REJECTED" | "CANCELLED";
  autoMatchedAt: string | null;
  matchedNotificationId: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

async function readJson(response: Response) {
  const data = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "요청에 실패했습니다.");
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

function depositStatusLabel(status: DepositRequestItem["status"]) {
  switch (status) {
    case "PENDING":
      return "입금 대기";
    case "AUTO_MATCHED":
      return "자동 매칭";
    case "APPROVED":
      return "승인 완료";
    case "REJECTED":
      return "반려";
    case "CANCELLED":
      return "취소";
    default:
      return status;
  }
}

function depositStatusTone(status: DepositRequestItem["status"]) {
  switch (status) {
    case "APPROVED":
      return "bg-[#eef8f1] text-[#1c6a42]";
    case "AUTO_MATCHED":
      return "bg-[#eef5ff] text-[#1f5fbf]";
    case "REJECTED":
      return "bg-[#fff1eb] text-[#b64822]";
    default:
      return "bg-[#f4efe8] text-[#5d493e]";
  }
}

export default function AdminDepositsPageClient() {
  const [items, setItems] = useState<DepositRequestItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [depositMemoById, setDepositMemoById] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"neutral" | "success" | "error">("neutral");
  const [isPending, startTransition] = useTransition();

  async function loadPage(page: number) {
    const response = await fetch(`/api/admin/deposits?page=${page}&limit=10`, {
      credentials: "include",
    });
    const data = (await readJson(response)) as {
      items: DepositRequestItem[];
      pagination: Pagination;
    };
    setItems(data.items);
    setPagination(data.pagination);
  }

  useEffect(() => {
    startTransition(async () => {
      try {
        await loadPage(1);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "입금 요청을 불러오지 못했습니다.");
        setTone("error");
      }
    });
  }, []);

  function movePage(page: number) {
    startTransition(async () => {
      try {
        await loadPage(page);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "입금 요청을 불러오지 못했습니다.");
        setTone("error");
      }
    });
  }

  function approveDepositRequest(id: string) {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/deposits/${id}/approve`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            memo: depositMemoById[id]?.trim() || undefined,
          }),
        });

        const data = (await readJson(response)) as { message: string };
        await loadPage(pagination.page);
        setMessage(data.message);
        setTone("success");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "입금 요청 승인에 실패했습니다.");
        setTone("error");
      }
    });
  }

  function rejectDepositRequest(id: string) {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/deposits/${id}/reject`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            memo: depositMemoById[id]?.trim() || "관리자 반려",
          }),
        });

        const data = (await readJson(response)) as { message: string };
        await loadPage(pagination.page);
        setMessage(data.message);
        setTone("success");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "입금 요청 반려에 실패했습니다.");
        setTone("error");
      }
    });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 sm:px-6">
      <div className="rounded-[1.8rem] border border-[var(--border)] bg-white/92 p-6 shadow-[0_18px_50px_rgba(90,55,30,0.1)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Admin Deposits
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-[#2d2018]">무통장 입금 요청 관리</h1>
            <p className="mt-3 text-sm leading-7 text-[#6b5648]">
              사용자 입금 요청을 확인하고 승인 또는 반려합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded-full border border-[var(--border)] bg-[#fffdf9] px-4 py-2 text-sm font-semibold text-[var(--accent)]"
            >
              관리자 메인
            </Link>
            <Link
              href="/"
              className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
            >
              메인으로 돌아가기
            </Link>
          </div>
        </div>

        {message ? (
          <div
            className={`mt-5 rounded-[1.2rem] border px-4 py-3 text-sm leading-7 ${
              tone === "success"
                ? "border-[#c9e8d4] bg-[#eef8f1] text-[#1c6a42]"
                : tone === "error"
                  ? "border-[#f0c3b4] bg-[#fff1eb] text-[#b64822]"
                  : "border-[var(--border)] bg-[#fffaf4] text-[#6b5648]"
            }`}
          >
            {message}
          </div>
        ) : null}

        <div className="mt-6 space-y-3">
          {items.length === 0 ? (
            <div className="rounded-[1rem] border border-dashed border-[var(--border)] bg-white px-4 py-4 text-sm leading-7 text-[#6b5648]">
              등록된 입금 요청이 없습니다.
            </div>
          ) : (
            items.map((request) => {
              const canAct =
                request.status !== "APPROVED" &&
                request.status !== "REJECTED" &&
                request.status !== "CANCELLED";

              return (
                <article
                  key={request.id}
                  className="rounded-[1rem] border border-[var(--border)] bg-white px-4 py-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-[#2d2018]">{request.email}</p>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${depositStatusTone(
                            request.status,
                          )}`}
                        >
                          {depositStatusLabel(request.status)}
                        </span>
                      </div>

                      <p className="mt-2 text-sm leading-7 text-[#5a4336]">
                        {formatCredits(request.requestedAmount)}원 · 유료크레딧{" "}
                        {formatCredits(request.requestedCredits)}
                      </p>
                      <p className="text-xs leading-6 text-[#8a7465]">
                        입금자명 {request.depositorName} · {request.bankName} · 계좌{" "}
                        {request.accountNumberSnapshot}
                      </p>
                      <p className="text-xs leading-6 text-[#8a7465]">
                        요청 시각 {formatDate(request.createdAt)}
                        {request.autoMatchedAt ? ` · 자동 매칭 ${formatDate(request.autoMatchedAt)}` : ""}
                      </p>
                      {request.memo ? (
                        <p className="mt-2 rounded-[0.8rem] bg-[#fffaf4] px-3 py-2 text-xs leading-6 text-[#6b5648]">
                          메모: {request.memo}
                        </p>
                      ) : null}
                    </div>

                    <div className="w-full max-w-sm space-y-3">
                      <textarea
                        value={depositMemoById[request.id] ?? ""}
                        onChange={(event) =>
                          setDepositMemoById((current) => ({
                            ...current,
                            [request.id]: event.target.value,
                          }))
                        }
                        placeholder="승인/반려 메모를 입력할 수 있습니다."
                        className="min-h-[90px] w-full rounded-[1rem] border border-[var(--border)] bg-[#fffdf9] px-4 py-3 text-sm outline-none disabled:opacity-60"
                        disabled={!canAct}
                      />

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => approveDepositRequest(request.id)}
                          disabled={!canAct || isPending}
                          className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        >
                          승인
                        </button>
                        <button
                          type="button"
                          onClick={() => rejectDepositRequest(request.id)}
                          disabled={!canAct || isPending}
                          className="rounded-full border border-[#f0c3b4] bg-[#fff1eb] px-4 py-2 text-sm font-semibold text-[#b64822] disabled:opacity-60"
                        >
                          반려
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-[#8a7465]">
            페이지 {pagination.page} / {pagination.totalPages} · 전체 {pagination.total}건
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => movePage(pagination.page - 1)}
              disabled={isPending || pagination.page <= 1}
              className="rounded-full border border-[var(--border)] bg-[#fffdf9] px-4 py-2 text-xs font-semibold text-[#5a4336] disabled:opacity-50"
            >
              이전
            </button>
            <button
              type="button"
              onClick={() => movePage(pagination.page + 1)}
              disabled={isPending || pagination.page >= pagination.totalPages}
              className="rounded-full border border-[var(--border)] bg-[#fffdf9] px-4 py-2 text-xs font-semibold text-[#5a4336] disabled:opacity-50"
            >
              다음
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
