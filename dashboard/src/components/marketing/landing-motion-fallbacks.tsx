/** Lightweight placeholders while motion-heavy chunks load (no client JS). */
export function LandingHeroSkeleton() {
  return (
    <section
      className="relative min-h-[min(88vh,820px)] overflow-hidden border-b border-border/40"
      aria-hidden
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,hsl(var(--primary)/0.15),transparent_55%)]" />
      <div className="relative mx-auto max-w-4xl px-6 pb-24 pt-32 sm:px-8 sm:pt-36">
        <div className="h-6 w-40 animate-pulse rounded-full bg-muted/50" />
        <div className="mt-10 h-12 w-full max-w-2xl animate-pulse rounded-lg bg-muted/40 sm:h-14" />
        <div className="mt-6 h-20 max-w-xl animate-pulse rounded-lg bg-muted/30" />
        <div className="mt-12 flex gap-3">
          <div className="h-11 w-48 animate-pulse rounded-md bg-muted/45" />
          <div className="h-11 w-32 animate-pulse rounded-md bg-muted/35" />
        </div>
      </div>
    </section>
  );
}

export function LandingPipelineSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12 sm:px-8 sm:py-16 lg:py-20" aria-hidden>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-2xl bg-muted/25 ring-1 ring-white/[0.04]" />
        ))}
      </div>
    </div>
  );
}

export function LandingDemoSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-6 sm:px-8" aria-hidden>
      <div className="h-52 animate-pulse rounded-2xl bg-muted/25 ring-1 ring-white/[0.04]" />
    </div>
  );
}

export function LandingCtaSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-6 sm:px-8" aria-hidden>
      <div className="h-56 animate-pulse rounded-3xl bg-muted/20 ring-1 ring-white/[0.05]" />
    </div>
  );
}
