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

export default function AdminPageClient() {
  const [currentUser, setCurrentUser] = useState<PublicUser | null>(null);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [userPagination, setUserPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [selectedUser, setSelectedUser] = useState<PublicUser | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [targetRole, setTargetRole] = useState<AdminRole>("USER");
  const [tier, setTier] = useState("");
  const [freeCredits, setFreeCredits] = useState("0");
  const [paidCredits, setPaidCredits] = useState("0");
  const [couponAmount, setCouponAmount] = useState("100");
  const [couponUses, setCouponUses] = useState("1");
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"neutral" | "success" | "error">("neutral");
  const [isPending, startTransition] = useTransition();

  const canManage = currentUser?.role === "ADMIN";

  async function loadCurrentUser() {
    const meResponse = await fetch("/api/me", { credentials: "include" });
    const meData = (await readJson(meResponse)) as { item: PublicUser };
    setCurrentUser(meData.item);
  }

  async function loadCoupons() {
    const response = await fetch("/api/admin/coupons", { credentials: "include" });
    const data = (await readJson(response)) as { items: CouponItem[] };
    setCoupons(data.items);
  }

  async function loadUsers(page: number, query: string) {
    const params = new URLSearchParams({
      page: String(page),
      limit: "10",
    });

    if (query.trim()) {
      params.set("query", query.trim());
    }

    const response = await fetch(`/api/admin/users?${params.toString()}`, {
      credentials: "include",
    });

    const data = (await readJson(response)) as {
      items: PublicUser[];
      pagination: Pagination;
    };

    setUsers(data.items);
    setUserPagination(data.pagination);

    if (selectedUser) {
      const updatedSelectedUser = data.items.find((item) => item.id === selectedUser.id);
      if (updatedSelectedUser) {
        setSelectedUser(updatedSelectedUser);
      }
    }
  }

  useEffect(() => {
    startTransition(async () => {
      try {
        await Promise.all([loadCurrentUser(), loadCoupons(), loadUsers(1, "")]);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "관리자 페이지를 불러오지 못했습니다.");
        setTone("error");
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedUser) {
      return;
    }

    setTargetRole(selectedUser.role);
    setTier(selectedUser.tier ?? "");
    setFreeCredits(String(selectedUser.freeCredits));
    setPaidCredits(String(selectedUser.paidCredits));
  }, [selectedUser]);

  function searchUsers(page = 1, query = searchInput) {
    startTransition(async () => {
      try {
        await loadUsers(page, query);
        setSearchQuery(query);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "사용자 검색에 실패했습니다.");
        setTone("error");
      }
    });
  }

  function selectUser(user: PublicUser) {
    setSelectedUser(user);
    setMessage(`${user.email} 계정을 수정 대상으로 선택했습니다.`);
    setTone("neutral");
  }

  function updateUser() {
    if (!selectedUser) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/users", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            userId: selectedUser.id,
            role: targetRole,
            tier: tier.trim() ? tier.trim() : null,
            freeCredits: Number(freeCredits) || 0,
            paidCredits: Number(paidCredits) || 0,
          }),
        });

        await readJson(response);
        await loadUsers(userPagination.page, searchQuery);
        setMessage("사용자 정보를 수정했습니다.");
        setTone("success");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "사용자 수정에 실패했습니다.");
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
        await loadCoupons();
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
              사용자 검색과 수정, 쿠폰 발급, 입금 요청 관리 화면으로 이동할 수 있습니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/deposits"
              className="rounded-full border border-[var(--border)] bg-[#fffdf9] px-4 py-2 text-sm font-semibold text-[var(--accent)]"
            >
              입금 요청 관리
            </Link>
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

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[1.4rem] border border-[var(--border)] bg-[#fffdf9] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[#2d2018]">사용자 관리</h2>
                <p className="mt-1 text-sm text-[#6b5648]">
                  이메일로 검색하고 선택된 사용자의 역할과 크레딧을 수정할 수 있습니다.
                </p>
              </div>
              <span className="rounded-full bg-[#f4efe8] px-3 py-1 text-xs font-semibold text-[#5d493e]">
                {userPagination.total.toLocaleString("ko-KR")}명
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="이메일로 검색"
                className="flex-1 rounded-[1rem] border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => searchUsers(1)}
                disabled={isPending}
                className="rounded-[1rem] bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                검색
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {users.length === 0 ? (
                <div className="rounded-[1rem] border border-dashed border-[var(--border)] bg-white px-4 py-4 text-sm text-[#6b5648]">
                  조건에 맞는 사용자가 없습니다.
                </div>
              ) : (
                users.map((user) => (
                  <div
                    key={user.id}
                    className="flex flex-col gap-3 rounded-[1rem] border border-[var(--border)] bg-white px-4 py-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#2d2018]">{user.email}</p>
                      <p className="mt-1 text-xs text-[#8a7465]">
                        {roleLabel(user.role)} · 무료 {formatCredits(user.freeCredits)} · 유료{" "}
                        {formatCredits(user.paidCredits)} · 음악 {user.musicCount ?? 0}건
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => selectUser(user)}
                      className="w-fit rounded-full border border-[var(--accent)] bg-[#fff1eb] px-4 py-2 text-sm font-semibold text-[var(--accent)]"
                    >
                      수정
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-[#8a7465]">
                페이지 {userPagination.page} / {userPagination.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => searchUsers(userPagination.page - 1, searchQuery)}
                  disabled={isPending || userPagination.page <= 1}
                  className="rounded-full border border-[var(--border)] bg-[#fffdf9] px-4 py-2 text-xs font-semibold text-[#5a4336] disabled:opacity-50"
                >
                  이전
                </button>
                <button
                  type="button"
                  onClick={() => searchUsers(userPagination.page + 1, searchQuery)}
                  disabled={isPending || userPagination.page >= userPagination.totalPages}
                  className="rounded-full border border-[var(--border)] bg-[#fffdf9] px-4 py-2 text-xs font-semibold text-[#5a4336] disabled:opacity-50"
                >
                  다음
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-[1.4rem] border border-[var(--border)] bg-[#fffdf9] p-5">
            <div>
              <h2 className="text-lg font-semibold text-[#2d2018]">선택된 사용자 수정</h2>
              <p className="mt-1 text-sm text-[#6b5648]">
                선택된 사용자의 역할, 티어, 무료/유료 크레딧을 직접 수정합니다.
              </p>
            </div>

            {selectedUser ? (
              <div className="mt-4 grid gap-3">
                <div className="rounded-[1rem] border border-[var(--border)] bg-[#fffaf4] px-4 py-3 text-sm text-[#5a4336]">
                  <p className="font-semibold text-[#2d2018]">{selectedUser.email}</p>
                  <p className="mt-1 text-xs text-[#8a7465]">
                    현재 무료 {formatCredits(selectedUser.freeCredits)} · 현재 유료{" "}
                    {formatCredits(selectedUser.paidCredits)}
                  </p>
                </div>

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

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium text-[#3b2a20]">
                    무료 크레딧
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
                    유료 크레딧
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
                  disabled={!canManage || isPending}
                  className="w-fit rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  사용자 정보 수정
                </button>
              </div>
            ) : (
              <div className="mt-4 rounded-[1rem] border border-dashed border-[var(--border)] bg-white px-4 py-4 text-sm text-[#6b5648]">
                왼쪽에서 사용자를 검색하고 수정 버튼을 눌러주세요.
              </div>
            )}
          </section>
        </div>

        <section className="mt-6 rounded-[1.4rem] border border-[var(--border)] bg-[#fffdf9] p-5">
          <div>
            <h2 className="text-lg font-semibold text-[#2d2018]">무료쿠폰 발급기</h2>
            <p className="mt-1 text-sm text-[#6b5648]">
              운영자는 금액과 사용 가능 횟수를 정해 무료쿠폰을 발급할 수 있습니다.
            </p>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[0.75fr_0.75fr_0.5fr]">
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

            <div className="flex items-end">
              <button
                type="button"
                onClick={createCoupon}
                disabled={!canManage || isPending}
                className="w-full rounded-[1rem] bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                무료쿠폰 발급
              </button>
            </div>
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
    </main>
  );
}
