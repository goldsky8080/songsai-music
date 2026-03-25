"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

type AdminRole = "USER" | "DEVELOPER" | "ADMIN";

type PublicUser = {
  id: string;
  email: string;
  freeCredits: number;
  paidCredits: number;
  totalCredits: number;
  tier: string | null;
  role: AdminRole;
  musicCount?: number;
  transactionCount?: number;
};

type CouponItem = {
  id: string;
  code: string;
  amount: number;
  remainingUses: number;
  maxUses: number;
  isActive: boolean;
  usedCount: number;
  createdAt: string;
  createdBy: {
    id: string;
    email: string;
    role: AdminRole;
  };
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

function roleLabel(role: AdminRole) {
  switch (role) {
    case "ADMIN":
      return "운영자";
    case "DEVELOPER":
      return "개발자";
    default:
      return "일반유저";
  }
}

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<PublicUser | null>(null);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [targetRole, setTargetRole] = useState<AdminRole>("USER");
  const [tier, setTier] = useState("");
  const [freeCredits, setFreeCredits] = useState("0");
  const [paidCredits, setPaidCredits] = useState("0");
  const [couponAmount, setCouponAmount] = useState("100");
  const [couponUses, setCouponUses] = useState("1");
  const [message, setMessage] = useState("관리자 페이지입니다.");
  const [tone, setTone] = useState<"neutral" | "success" | "error">("neutral");
  const [isPending, startTransition] = useTransition();

  const canManage = currentUser?.role === "ADMIN";

  async function loadPageData() {
    const [meResponse, usersResponse, couponsResponse] = await Promise.all([
      fetch("/api/me", { credentials: "include" }),
      fetch("/api/admin/users", { credentials: "include" }),
      fetch("/api/admin/coupons", { credentials: "include" }),
    ]);

    const meData = (await readJson(meResponse)) as { item: PublicUser };
    const usersData = (await readJson(usersResponse)) as { items: PublicUser[] };
    const couponsData = (await readJson(couponsResponse)) as { items: CouponItem[] };

    setCurrentUser(meData.item);
    setUsers(usersData.items);
    setCoupons(couponsData.items);

    if (!selectedUserId && usersData.items.length > 0) {
      const firstUser = usersData.items[0];
      setSelectedUserId(firstUser.id);
      setTargetRole(firstUser.role);
      setTier(firstUser.tier ?? "");
    }
  }

  useEffect(() => {
    startTransition(async () => {
      try {
        await loadPageData();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "관리자 페이지를 불러오지 못했습니다.");
        setTone("error");
      }
    });
  }, []);

  useEffect(() => {
    const selectedUser = users.find((item) => item.id === selectedUserId);

    if (!selectedUser) {
      return;
    }

    setTargetRole(selectedUser.role);
    setTier(selectedUser.tier ?? "");
  }, [selectedUserId, users]);

  function updateUser() {
    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/users", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            userId: selectedUserId,
            role: targetRole,
            tier: tier.trim() ? tier.trim() : null,
            freeCredits: Number(freeCredits) || 0,
            paidCredits: Number(paidCredits) || 0,
          }),
        });

        await readJson(response);
        setFreeCredits("0");
        setPaidCredits("0");
        await loadPageData();
        setMessage("사용자 정보를 업데이트했습니다.");
        setTone("success");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "사용자 업데이트에 실패했습니다.");
        setTone("error");
      }
    });
  }

  function createCoupon() {
    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/coupons", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            amount: Number(couponAmount),
            maxUses: Number(couponUses),
          }),
        });

        const data = (await readJson(response)) as { item: CouponItem };
        setCouponAmount("100");
        setCouponUses("1");
        await loadPageData();
        setMessage(`무료쿠폰 ${data.item.code} 를 발급했습니다.`);
        setTone("success");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "쿠폰 발급에 실패했습니다.");
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
              Admin
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-[#2d2018]">관리자 페이지</h1>
            <p className="mt-3 text-sm leading-7 text-[#6b5648]">
              운영자와 개발자 전용 페이지입니다. 운영자는 사용자 등급 변경, 크레딧 지급, 무료쿠폰 발급까지 할 수 있습니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/credits"
              className="rounded-full border border-[var(--border)] bg-[#fffdf9] px-4 py-2 text-sm font-semibold text-[var(--accent)]"
            >
              충전 페이지
            </Link>
            <Link
              href="/"
              className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
            >
              메인으로 돌아가기
            </Link>
          </div>
        </div>

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

        {currentUser ? (
          <div className="mt-5 rounded-[1.2rem] border border-[var(--border)] bg-[#fffaf4] px-4 py-3 text-sm text-[#6b5648]">
            로그인 계정: {currentUser.email} · 권한: {roleLabel(currentUser.role)}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[1.4rem] border border-[var(--border)] bg-[#fffdf9] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[#2d2018]">사용자 관리</h2>
                <p className="mt-1 text-sm text-[#6b5648]">권한과 크레딧을 관리할 수 있습니다.</p>
              </div>
              <span className="rounded-full bg-[#f4efe8] px-3 py-1 text-xs font-semibold text-[#5d493e]">
                {users.length}명
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              <select
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                className="rounded-[1rem] border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
              >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.email} · {roleLabel(user.role)}
                  </option>
                ))}
              </select>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="grid gap-2 text-sm font-medium text-[#3b2a20]">
                  권한
                  <select
                    value={targetRole}
                    onChange={(event) => setTargetRole(event.target.value as AdminRole)}
                    disabled={!canManage}
                    className="rounded-[1rem] border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none disabled:opacity-60"
                  >
                    <option value="USER">일반유저</option>
                    <option value="DEVELOPER">개발자</option>
                    <option value="ADMIN">운영자</option>
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-medium text-[#3b2a20]">
                  티어
                  <input
                    type="text"
                    value={tier}
                    onChange={(event) => setTier(event.target.value)}
                    disabled={!canManage}
                    className="rounded-[1rem] border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none disabled:opacity-60"
                  />
                </label>

                <div className="rounded-[1rem] border border-[var(--border)] bg-[#fffaf4] px-4 py-3 text-xs leading-6 text-[#6b5648]">
                  선택한 사용자에게 운영자가 무료/유료 크레딧을 추가 지급할 수 있습니다.
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-[#3b2a20]">
                  추가 무료크레딧
                  <input
                    type="number"
                    min="0"
                    value={freeCredits}
                    onChange={(event) => setFreeCredits(event.target.value)}
                    disabled={!canManage}
                    className="rounded-[1rem] border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none disabled:opacity-60"
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-[#3b2a20]">
                  추가 유료크레딧
                  <input
                    type="number"
                    min="0"
                    value={paidCredits}
                    onChange={(event) => setPaidCredits(event.target.value)}
                    disabled={!canManage}
                    className="rounded-[1rem] border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none disabled:opacity-60"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={updateUser}
                disabled={!canManage || isPending || !selectedUserId}
                className="w-fit rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                사용자 정보 저장
              </button>
            </div>

            <div className="mt-5 space-y-2">
              {users.slice(0, 8).map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col gap-2 rounded-[1rem] border border-[var(--border)] bg-white px-4 py-3 text-sm text-[#5a4336] md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#2d2018]">{user.email}</p>
                    <p className="mt-1 text-xs text-[#8a7465]">
                      {roleLabel(user.role)} · 무료 {formatCredits(user.freeCredits)} · 유료{" "}
                      {formatCredits(user.paidCredits)} · 음악 {user.musicCount ?? 0}건
                    </p>
                  </div>
                  <span className="rounded-full bg-[#f4efe8] px-3 py-1 text-xs font-semibold text-[#5d493e]">
                    {user.tier || "티어 없음"}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[1.4rem] border border-[var(--border)] bg-[#fffdf9] p-5">
            <div>
              <h2 className="text-lg font-semibold text-[#2d2018]">무료쿠폰 발급기</h2>
              <p className="mt-1 text-sm text-[#6b5648]">
                운영자는 금액과 사용 가능 횟수를 넣고 6자리 쿠폰을 발급할 수 있습니다.
              </p>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-2 text-sm font-medium text-[#3b2a20]">
                쿠폰 금액
                <input
                  type="number"
                  min="1"
                  value={couponAmount}
                  onChange={(event) => setCouponAmount(event.target.value)}
                  disabled={!canManage}
                  className="rounded-[1rem] border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none disabled:opacity-60"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-[#3b2a20]">
                사용 가능 횟수
                <input
                  type="number"
                  min="1"
                  value={couponUses}
                  onChange={(event) => setCouponUses(event.target.value)}
                  disabled={!canManage}
                  className="rounded-[1rem] border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none disabled:opacity-60"
                />
              </label>
              <button
                type="button"
                onClick={createCoupon}
                disabled={!canManage || isPending}
                className="w-full rounded-[1rem] bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                무료쿠폰 발급하기
              </button>
            </div>

            <div className="mt-5 space-y-2">
              {coupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className="rounded-[1rem] border border-[var(--border)] bg-white px-4 py-3 text-sm text-[#5a4336]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-[#2d2018]">{coupon.code}</p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        coupon.isActive
                          ? "bg-[#eef8f1] text-[#1c6a42]"
                          : "bg-[#fff1eb] text-[#b64822]"
                      }`}
                    >
                      {coupon.isActive ? "사용 가능" : "소진"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-6 text-[#8a7465]">
                    {formatCredits(coupon.amount)} 무료크레딧 · 남은 횟수 {coupon.remainingUses} /{" "}
                    {coupon.maxUses} · 생성자 {coupon.createdBy.email}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
