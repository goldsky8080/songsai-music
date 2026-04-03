import { AuthPanel } from "@/components/auth-panel";

export default function HomePage() {
  return (
    <main className="relative isolate overflow-hidden">
      <div className="hero-orb hero-orb--gold left-[-8rem] top-[4rem] h-[20rem] w-[20rem]" />
      <div className="hero-orb hero-orb--ember right-[-6rem] top-[16rem] h-[18rem] w-[18rem]" />
      <div className="hero-orb hero-orb--gold bottom-[18rem] right-[8%] h-[14rem] w-[14rem]" />

      <section className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-8 pt-6 sm:px-6 lg:px-8">
        <div className="hero-panel studio-enter relative overflow-hidden rounded-[2rem] px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
          <div className="ambient-line absolute left-10 top-0 h-px w-40" />
          <div className="ambient-line absolute bottom-0 right-8 h-px w-52" />

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-end">
            <div className="max-w-3xl">
              <p className="hero-chip inline-flex rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
                AI Trot Studio
              </p>
              <h1 className="mt-5 max-w-4xl text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.03em] text-[#24170f] sm:text-[3.35rem] lg:text-[4.5rem]">
                음악 생성부터 자막 비디오까지,
                <span className="block text-[#b64822]">한 화면에서 흐름 있게.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--ink-soft)] sm:text-base">
                곡 생성, 숨은 추가곡, 크레딧, 자막 비디오까지 이어지는 현재 작업 흐름을 더 직관적으로
                다루는 AI music cockpit입니다. 오늘은 홈과 생성 경험부터 브랜드형 스튜디오 느낌으로
                끌어올립니다.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="hero-chip rounded-[1.4rem] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9b6b50]">
                  Create
                </p>
                <p className="mt-2 text-sm leading-6 text-[#47362c]">
                  직접 입력, AI가사, MR 생성까지 같은 콘솔 안에서 이어집니다.
                </p>
              </div>
              <div className="hero-chip rounded-[1.4rem] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9b6b50]">
                  Assets
                </p>
                <p className="mt-2 text-sm leading-6 text-[#47362c]">
                  mp3, 커버 이미지, 가사 타임라인을 자산으로 확보해 다음 단계에 재사용합니다.
                </p>
              </div>
              <div className="hero-chip rounded-[1.4rem] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9b6b50]">
                  Video
                </p>
                <p className="mt-2 text-sm leading-6 text-[#47362c]">
                  서버 부하를 줄이기 위해 브라우저 렌더 중심의 비디오 생성 방향을 실험 중입니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        <AuthPanel />
      </section>
    </main>
  );
}
