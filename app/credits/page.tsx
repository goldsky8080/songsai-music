import Link from "next/link";

export default function CreditsPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-8 sm:px-6">
      <div className="rounded-[1.8rem] border border-[var(--border)] bg-white/92 p-6 shadow-[0_18px_50px_rgba(90,55,30,0.1)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Credits
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[#2d2018]">크레딧 충전</h1>
        <p className="mt-4 text-sm leading-7 text-[#6b5648]">
          결제 기능은 다음 단계에서 붙일 예정입니다. 지금은 크레딧 충전 페이지 진입 동선만 먼저
          준비해둔 상태입니다.
        </p>
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
