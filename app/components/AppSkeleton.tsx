function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-[8px] bg-[#eef1f7] ${className}`} />;
}

function SkeletonNavItem({ active = false }: { active?: boolean }) {
  return (
    <div className={`flex h-[46px] items-center gap-3 rounded-[9px] px-3.5 ${active ? "bg-[#f0edff]" : ""}`}>
      <SkeletonBlock className={`h-5 w-5 ${active ? "bg-[#dcd7ff]" : ""}`} />
      <SkeletonBlock className="h-3 w-24" />
    </div>
  );
}

export default function AppSkeleton() {
  return (
    <main className="flex h-dvh w-full overflow-hidden bg-[#fdfdff] font-sans text-black">
      <aside className="hidden h-screen w-[228px] shrink-0 flex-col border-r border-[#e7eaf2] bg-white px-[18px] py-6 lg:flex">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-8 w-8 rounded-[9px]" />
          <SkeletonBlock className="h-5 w-28" />
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-2.5">
          <SkeletonNavItem />
          <SkeletonNavItem active />
          <SkeletonNavItem />
          <SkeletonNavItem />
          <SkeletonNavItem />
          <SkeletonNavItem />
          <div className="mt-2 border-t border-[#d7dbe6] pt-4">
            <SkeletonNavItem />
          </div>
          <SkeletonNavItem />
        </nav>

        <div className="space-y-3 pb-1 pt-4">
          <div className="flex min-h-[68px] items-center gap-3 rounded-[10px] border border-[#e6e9f1] bg-white px-3">
            <SkeletonBlock className="h-12 w-12 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonBlock className="h-3 w-24" />
              <SkeletonBlock className="h-3 w-16" />
            </div>
          </div>
          <SkeletonBlock className="h-10 w-full" />
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white lg:bg-[#fdfdff]">
        <header className="flex h-[58px] shrink-0 items-center justify-between border-b border-[#e7eaf2] bg-white px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <SkeletonBlock className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <SkeletonBlock className="h-4 w-36" />
              <SkeletonBlock className="h-3 w-28" />
            </div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <SkeletonBlock className="h-9 w-28" />
            <SkeletonBlock className="h-9 w-24" />
            <SkeletonBlock className="h-9 w-9" />
          </div>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="min-w-0 overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-3">
                <SkeletonBlock className="h-8 w-48" />
                <SkeletonBlock className="h-4 w-72 max-w-[70vw]" />
              </div>
              <SkeletonBlock className="h-10 w-32" />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-[10px] border border-[#e5e8f0] bg-white p-4 shadow-[0_18px_44px_rgba(20,28,53,0.025)]">
                  <SkeletonBlock className="h-8 w-8" />
                  <SkeletonBlock className="mt-5 h-7 w-24" />
                  <SkeletonBlock className="mt-3 h-3 w-full" />
                  <SkeletonBlock className="mt-2 h-3 w-3/4" />
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[12px] border border-[#e5e8f0] bg-white p-4 shadow-[0_22px_60px_rgba(20,28,53,0.025)]">
              <div className="mb-5 flex items-center justify-between">
                <SkeletonBlock className="h-5 w-36" />
                <SkeletonBlock className="h-8 w-24" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="grid grid-cols-[44px_minmax(0,1fr)_80px] items-center gap-3 rounded-[9px] border border-[#edf0f6] p-3">
                    <SkeletonBlock className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <SkeletonBlock className="h-3 w-40 max-w-full" />
                      <SkeletonBlock className="h-3 w-64 max-w-full" />
                    </div>
                    <SkeletonBlock className="h-7 w-20" />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="hidden min-h-0 border-l border-[#e7eaf2] bg-white p-4 lg:block">
            <SkeletonBlock className="h-5 w-40" />
            <div className="mt-5 space-y-4">
              <div className="rounded-[12px] border border-[#e5e8f0] p-4">
                <SkeletonBlock className="h-4 w-32" />
                <SkeletonBlock className="mt-4 h-24 w-full" />
                <SkeletonBlock className="mt-4 h-9 w-full" />
              </div>
              <div className="rounded-[12px] border border-[#e5e8f0] p-4">
                <SkeletonBlock className="h-4 w-28" />
                <SkeletonBlock className="mt-4 h-32 w-full" />
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
