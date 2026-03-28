"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";

type RedeemResponse = {
  message: string;
};

type DepositRequestItem = {
  id: string;
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

type DepositAccountInfo = {
  bankName: string;
  accountNumber: string;
};

type DepositsResponse = {
  account: DepositAccountInfo;
  items: DepositRequestItem[];
};

type CreateDepositResponse = {
  message: string;
  account: DepositAccountInfo;
  item: DepositRequestItem;
};

type DepositProduct = {
  amount: number;
  credits: number;
  label: string;
  bonus: string;
};

type GuideState = {
  bankName: string;
  accountNumber: string;
  createdAt: string;
};

const DISPLAY_BANK_NAME = "NH 농협";
const DISPLAY_ACCOUNT_NUMBER = "352-0718-7956-63";
const COPY_ACCOUNT_NUMBER = "3520718795663";
const DISPLAY_ACCOUNT_OWNER = "박O영";
const GUIDE_LIMIT_MINUTES = 30;

const DEPOSIT_PRODUCTS: DepositProduct[] = [
  { amount: 5000, credits: 5000, label: "5,000원", bonus: "기본 충전" },
  { amount: 10000, credits: 10500, label: "10,000원", bonus: "+500 보너스" },
  { amount: 30000, credits: 33000, label: "30,000원", bonus: "+3,000 보너스" },
];

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
  return new Date(new Date(createdAt).getTime() + GUIDE_LIMIT_MINUTES * 60 * 1000);
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

function DepositGuideModal({
  guide,
  now,
  copied,
  onCopy,
  onClose,
}: {
  guide: GuideState;
  now: number;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
}) {
  const expireAt = getDeadline(guide.createdAt);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(40,23,10,0.35)] px-4">
      <div className="w-full max-w-md rounded-[1.8rem] border border-[var(--border)] bg-white p-6 shadow-[0_24px_80px_rgba(61,33,15,0.22)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Deposit Guide
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[#2d2018]">입금 안내</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm font-semibold text-[#6b5648]"
          >
            닫기
          </button>
        </div>

        <div className="mt-5 rounded-[1.2rem] border border-[var(--border)] bg-[#fffaf4] px-4 py-4 text-sm leading-8 text-[#4f3e33]">
          <p>
            <span className="font-semibold text-[#2d2018]">{guide.bankName}</span> : {guide.accountNumber}
          </p>
          <p>
            <span className="font-semibold text-[#2d2018]">예금주</span> : {DISPLAY_ACCOUNT_OWNER}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-[1rem] border border-[var(--border)] bg-white px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8a7465]">Account Copy</p>
            <p className="mt-1 text-sm font-semibold text-[#2d2018]">{guide.accountNumber}</p>
          </div>
          <button
            type="button"
            onClick={onCopy}
            className="rounded-[0.9rem] border border-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent)]"
          >
            {copied ? "복사됨" : "계좌번호 복사"}
          </button>
        </div>

        <div className="mt-4 space-y-2 text-sm leading-7 text-[#6b5648]">
          <p>30분 안으로 입금해 주세요.</p>
          <p>입금 후 보통 10분 안에 크레딧이 충전됩니다.</p>
        </div>

        <div className="mt-4 rounded-[1rem] border border-[#f0c3b4] bg-[#fff1eb] px-4 py-3 text-sm font-semibold text-[#b64822]">
          {formatRemainingTime(expireAt, now)}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-[1rem] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white"
        >
          확인
        </button>
      </div>
    </div>
  );
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

export default function CreditsPage() {
  const [couponCode, setCouponCode] = useState("");
  const [message, setMessage] = useState("무료쿠폰 또는 무통장입금으로 크레딧을 충전할 수 있습니다.");
  const [tone, setTone] = useState<"neutral" | "success" | "error">("neutral");
  const [selectedProduct, setSelectedProduct] = useState<DepositProduct>(DEPOSIT_PRODUCTS[0]);
  const [depositorName, setDepositorName] = useState("");
  const [depositItems, setDepositItems] = useState<DepositRequestItem[]>([]);
  const [guide, setGuide] = useState<GuideState | null>(null);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function loadDeposits() {
    const response = await fetch("/api/deposits", {
      method: "GET",
      credentials: "include",
    });

    const data = (await readJson(response)) as DepositsResponse;
    setDepositItems(data.items);
  }

  useEffect(() => {
    startTransition(async () => {
      try {
        await loadDeposits();
      } catch {
        // ignore on first paint
      }
    });
  }, []);

  async function handleCopyAccount() {
    try {
      await navigator.clipboard.writeText(COPY_ACCOUNT_NUMBER);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function redeemCoupon() {
    startTransition(async () => {
      try {
        const response = await fetch("/api/credits/redeem-coupon", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            code: couponCode,
          }),
        });

        const data = (await readJson(response)) as RedeemResponse;
        setCouponCode("");
        setMessage(data.message);
        setTone("success");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "쿠폰을 사용할 수 없습니다.");
        setTone("error");
      }
    });
  }

  function createDepositRequest() {
    startTransition(async () => {
      try {
        const response = await fetch("/api/deposits", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            requestedAmount: selectedProduct.amount,
            requestedCredits: selectedProduct.credits,
            depositorName,
          }),
        });

        const data = (await readJson(response)) as CreateDepositResponse;
        setDepositItems((current) => [data.item, ...current]);
        setDepositorName("");
        setMessage(data.message);
        setTone("success");
        setCopied(false);
        setGuide({
          bankName: DISPLAY_BANK_NAME,
          accountNumber: DISPLAY_ACCOUNT_NUMBER,
          createdAt: data.item.createdAt,
        });
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "입금 요청을 등록할 수 없습니다.");
        setTone("error");
      }
    });
  }

  const activeGuide = useMemo(() => guide, [guide]);
  const previewItems = depositItems.slice(0, 3);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-8 sm:px-6">
      {activeGuide ? (
        <DepositGuideModal
          guide={activeGuide}
          now={now}
          copied={copied}
          onCopy={handleCopyAccount}
          onClose={() => setGuide(null)}
        />
      ) : null}

      <div className="mb-5 flex justify-start">
        <Link
          href="/"
          className="inline-flex rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
        >
          메인으로 돌아가기
        </Link>
      </div>

      <div className="rounded-[1.8rem] border border-[var(--border)] bg-white/92 p-6 shadow-[0_18px_50px_rgba(90,55,30,0.1)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Credits
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[#2d2018]">크레딧 충전</h1>
        <p className="mt-4 text-sm leading-7 text-[#6b5648]">
          무통장입금은 먼저 요청을 등록한 뒤, 안내된 계좌로 입금하는 방식입니다.
          입금 요청이 먼저 있어야 문자 자동 매칭이 더 정확하게 동작합니다.
        </p>

        <div className="mt-6 rounded-[1.2rem] border border-[var(--border)] bg-[#fffaf4] p-4">
          <p className="text-sm font-semibold text-[#3b2a20]">무료쿠폰 입력</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
              placeholder="예: A1B2C3"
              className="flex-1 rounded-[1rem] border border-[var(--border)] bg-white px-4 py-3 text-base uppercase outline-none transition focus:border-[var(--accent)]"
            />
            <button
              type="button"
              onClick={redeemCoupon}
              disabled={isPending || couponCode.trim().length < 6}
              className="rounded-[1rem] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isPending ? "확인 중..." : "쿠폰 사용하기"}
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-[1.2rem] border border-[var(--border)] bg-[#fffaf4] p-4">
          <p className="text-sm font-semibold text-[#3b2a20]">무통장입금 충전</p>
          <p className="mt-2 text-sm leading-7 text-[#6b5648]">
            아래 상품을 선택하고 입금자명을 입력한 뒤 요청을 등록해 주세요.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {DEPOSIT_PRODUCTS.map((product) => {
              const active = selectedProduct.amount === product.amount;

              return (
                <button
                  key={product.amount}
                  type="button"
                  onClick={() => setSelectedProduct(product)}
                  className={`rounded-[1.2rem] border px-4 py-4 text-left transition ${
                    active
                      ? "border-[var(--accent)] bg-[#fff1eb] shadow-[0_12px_30px_rgba(182,72,34,0.12)]"
                      : "border-[var(--border)] bg-white"
                  }`}
                >
                  <p className="text-sm font-semibold text-[#2d2018]">{product.label}</p>
                  <p className="mt-2 text-base font-semibold text-[var(--accent)]">
                    {formatNumber(product.credits)} 크레딧
                  </p>
                  <p className="mt-1 text-xs text-[#8a7465]">{product.bonus}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-[1rem] border border-dashed border-[var(--border)] bg-white px-4 py-4 text-sm leading-7 text-[#6b5648]">
            입금 요청이 등록되면 계좌번호와 예금주가 팝업으로 안내됩니다.
          </div>

          <div className="mt-4 grid gap-3">
            <label className="grid gap-2 text-sm font-medium text-[#3b2a20]">
              입금자명
              <input
                type="text"
                value={depositorName}
                onChange={(event) => setDepositorName(event.target.value)}
                placeholder="실제 입금할 이름을 입력해 주세요"
                className="rounded-[1rem] border border-[var(--border)] bg-white px-4 py-3 text-base outline-none transition focus:border-[var(--accent)]"
              />
            </label>

            <button
              type="button"
              onClick={createDepositRequest}
              disabled={isPending || depositorName.trim().length < 2}
              className="rounded-[1rem] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isPending
                ? "등록 중..."
                : `${selectedProduct.label} / ${formatNumber(selectedProduct.credits)}크레딧 입금 요청`}
            </button>
          </div>
        </div>

        <div
          className={`mt-5 rounded-[1.2rem] border p-4 text-sm leading-7 ${
            tone === "success"
              ? "border-[#c9e8d4] bg-[#eef8f1] text-[#1c6a42]"
              : tone === "error"
                ? "border-[#f0c3b4] bg-[#fff1eb] text-[#b64822]"
                : "border-[var(--border)] bg-[#fffaf4] text-[#6b5648]"
          }`}
        >
          {message}
        </div>

        <div className="mt-6 rounded-[1.2rem] border border-[var(--border)] bg-[#fffaf4] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[#3b2a20]">내 입금 요청</p>
            <Link
              href="/credits/requests"
              className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[#6b5648]"
            >
              모두보기
            </Link>
          </div>
          <div className="mt-3 space-y-3">
            {previewItems.length === 0 ? (
              <div className="rounded-[1rem] border border-dashed border-[var(--border)] bg-white p-4 text-sm leading-7 text-[#6b5648]">
                아직 등록된 입금 요청이 없습니다.
              </div>
            ) : (
              previewItems.map((item) => <DepositRequestCard key={item.id} item={item} now={now} />)
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
