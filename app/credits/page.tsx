"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

type RedeemResponse = {
  message: string;
};

async function readJson(response: Response) {
  const data = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Request failed");
  }

  return data;
}

export default function CreditsPage() {
  const [couponCode, setCouponCode] = useState("");
  const [message, setMessage] = useState("무료쿠폰 번호를 입력하면 즉시 무료크레딧을 충전할 수 있습니다.");
  const [tone, setTone] = useState<"neutral" | "success" | "error">("neutral");
  const [isPending, startTransition] = useTransition();

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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-8 sm:px-6">
      <div className="rounded-[1.8rem] border border-[var(--border)] bg-white/92 p-6 shadow-[0_18px_50px_rgba(90,55,30,0.1)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Credits
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[#2d2018]">크레딧 충전</h1>
        <p className="mt-4 text-sm leading-7 text-[#6b5648]">
          결제 연동은 다음 단계에서 붙일 예정입니다. 지금은 무료쿠폰 입력으로 무료크레딧을 충전할 수 있습니다.
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

        <div className="mt-6 rounded-[1.2rem] border border-[var(--border)] bg-[#fffaf4] p-4 text-sm leading-7 text-[#6b5648]">
          준비 예정 기능
          <br />- 충전 금액 선택
          <br />- 결제 연동
          <br />- 충전 내역 확인
        </div>

        <Link
          href="/"
          className="mt-6 inline-flex w-fit rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
        >
          메인으로 돌아가기
        </Link>
      </div>
    </main>
  );
}
