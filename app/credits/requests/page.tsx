"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";

type DepositRequestItem = {
  id: string;
  requestedAmount: number;
  requestedCredits: number;
  depositorName: string;
  bankName: string;
  accountNumberSnapshot: string;
  status: "PENDING" | "AUTO_MATCHED" | "APPROVED" | "REJECTED" | "CANCELLED";
  memo: string | null;
  createdAt: string;
  updatedAt: string;
};

type DepositAccountInfo = {
  bankName: string;
  accountNumber: string;
};

type DepositsResponse = {
  account: DepositAccountInfo;
  items: DepositRequestItem[];
};

const PAGE_SIZE = 10;
const DISPLAY_ACCOUNT_NUMBER = "352-0718-7956-63";

async function readJson(response: Response) {
  const data = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Request failed");
  }

  return data;
}

function formatNumber(value: number) {
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

function getDeadline(createdAt: string) {
  return new Date(new Date(createdAt).getTime() + 30 * 60 * 1000);
}

function formatRemainingTime(targetAt: Date, now: number) {
  const diff = targetAt.getTime() - now;

  if (diff <= 0) {
    return "입금 가능 시간이 지났습니다.";
  }

  const totalSeconds = Math.floor(diff / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}분 ${seconds.toString().padStart(2, "0")}초 남음`;
}

function statusLabel(status: DepositRequestItem["status"]) {
  switch (status) {
    case "PENDING":
      return "입금 대기";
    case "AUTO_MATCHED":
      return "문자 매칭";
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

function statusTone(status: DepositRequestItem["status"]) {
  switch (status) {
    case "APPROVED":
      return "border-[#c9e8d4] bg-[#eef8f1] text-[#1c6a42]";
    case "AUTO_MATCHED":
      return "border-[#d6e3fb] bg-[#eef5ff] text-[#1f5fbf]";
    case "REJECTED":
      return "border-[#f0c3b4] bg-[#fff1eb] text-[#b64822]";
    default:
      return "border-[var(--border)] bg-[#fffaf4] text-[#6b5648]";
  }
}

function DepositRequestCard({ item, now }: { item: DepositRequestItem; now: number }) {
  const deadline = getDeadline(item.createdAt);

  return (
    <article className={`rounded-[1rem] border p-4 text-sm leading-7 ${statusTone(item.status)}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="font-semibold text-[#2d2018]">
            {formatNumber(item.requestedAmount)}원 → {formatNumber(item.requestedCredits)}크레딧
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-semibold text-[var(--accent)]">
              {item.depositorName}
            </span>
            <span className="text-xs text-[#8a7465]">{formatDate(item.createdAt)}</span>
          </div>
        </div>
        <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold">
          {statusLabel(item.status)}
        </span>
      </div>

      <div className="mt-3 rounded-[0.9rem] bg-white/70 px-4 py-3 text-xs leading-6 text-[#6b5648]">
        <p>
          입금 계좌: <span className="font-semibold text-[#2d2018]">{DISPLAY_ACCOUNT_NUMBER}</span>
        </p>
        <p>
          입금 마감: <span className="font-semibold text-[#2d2018]">{formatDate(deadline.toISOString())}</span>
        </p>
        {item.status === "PENDING" || item.status === "AUTO_MATCHED" ? (
          <p className="font-semibold text-[var(--accent)]">{formatRemainingTime(deadline, now)}</p>
        ) : null}
      </div>

      {item.memo ? <p className="mt-3 text-xs">{item.memo}</p> : null}
    </article>
  );
}

export default function CreditRequestsPage() {
  const [items, setItems] = useState<DepositRequestItem[]>([]);
  const [page, setPage] = useState(1);
  const [now, setNow] = useState(Date.now());
  const [, startTransition] = useTransition();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/deposits", {
          method: "GET",
          credentials: "include",
        });

        const data = (await readJson(response)) as DepositsResponse;
        setItems(data.items);
      } catch {
        setItems([]);
      }
    });
  }, []);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [items, safePage],
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-8 sm:px-6">
      <div className="mb-5 flex justify-start">
        <Link
          href="/credits"
          className="inline-flex rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
        >
          충전 페이지로 돌아가기
        </Link>
      </div>

      <div className="rounded-[1.8rem] border border-[var(--border)] bg-white/92 p-6 shadow-[0_18px_50px_rgba(90,55,30,0.1)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Deposit Requests
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[#2d2018]">내 입금 요청 전체보기</h1>
        <p className="mt-4 text-sm leading-7 text-[#6b5648]">
          최근 입금 요청을 10건씩 확인할 수 있습니다.
        </p>

        <div className="mt-6 space-y-3">
          {pageItems.length === 0 ? (
            <div className="rounded-[1rem] border border-dashed border-[var(--border)] bg-white p-4 text-sm leading-7 text-[#6b5648]">
              등록된 입금 요청이 없습니다.
            </div>
          ) : (
            pageItems.map((item) => <DepositRequestCard key={item.id} item={item} now={now} />)
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={safePage <= 1}
            className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[#6b5648] disabled:opacity-40"
          >
            이전
          </button>
          <div className="text-sm font-semibold text-[#6b5648]">
            페이지 {safePage} / {totalPages}
          </div>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={safePage >= totalPages}
            className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[#6b5648] disabled:opacity-40"
          >
            다음
          </button>
        </div>
      </div>
    </main>
  );
}
