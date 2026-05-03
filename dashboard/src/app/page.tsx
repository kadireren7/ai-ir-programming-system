import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { LandingNavbar } from "@/components/marketing/landing-navbar";
import { createClient } from "@/lib/supabase/server";
import { LandingFooter } from "@/components/marketing/landing-footer";
import { LandingPillars } from "@/components/marketing/landing-pillars";
import { LandingFlow } from "@/components/marketing/landing-flow";
import { LandingMetricsBand } from "@/components/marketing/landing-metrics-band";
import { LandingHeroSkeleton } from "@/components/marketing/landing-motion-fallbacks";

const MarketingHero = dynamic(
  () => import("@/components/marketing/marketing-hero").then(m => ({ default: m.MarketingHero })),
  { loading: () => <LandingHeroSkeleton /> }
);




export const metadata: Metadata = {
  title: "The control layer for every automation",
  description:
    "Torqa inspects, governs, and approves workflows across n8n, GitHub, agents, and webhooks. One gate. Deterministic decisions.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Torqa — The control layer for every automation",
    description: "Torqa inspects, governs, and approves workflows. One gate. Deterministic decisions.",
    url: "/",
    type: "website",
  },
};

export default async function MarketingLandingPage() {
  const supabase = await createClient();
  let navUser: { email: string; displayName: string | null } | null = null;
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email) {
      const meta = user.user_metadata as Record<string, unknown> | undefined;
      const dn =
        (typeof meta?.full_name === "string" && meta.full_name) ||
        (typeof meta?.name === "string" && meta.name) ||
        null;
      navUser = { email: user.email, displayName: dn };
    }
  }

  return (
    <div className="bg-[#06080b] text-[#f0f3f7]">
      <LandingNavbar user={navUser} />

      <main id="main-content">
        <MarketingHero />
        <LandingPillars />
        <LandingFlow />
        <LandingMetricsBand />

        {/* CTA */}
        <section className="relative overflow-hidden bg-[#06080b] px-5 py-20 text-center sm:px-10 sm:py-[140px]">
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[600px] w-[1000px] -translate-x-1/2 -translate-y-1/2 blur-[60px]"
            style={{ background: "radial-gradient(ellipse, rgba(34,211,238,0.08), transparent 60%)" }}
            aria-hidden
          />
          <div className="relative mx-auto max-w-[800px]">
            <h2
              className="mb-5 text-[clamp(40px,6vw,72px)] font-bold leading-[1.05] tracking-[-0.04em]"
              style={{
                background: "linear-gradient(180deg,#fff 60%,#67e8f9)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              A control surface,
              <br />
              not another dashboard.
            </h2>
            <p className="mb-9 text-[17px] text-[#a8b1bd]">
              Private beta is open for teams running automation in production.
            </p>
            <div className="flex justify-center gap-3">
              <a
                href="/login"
                className="flex items-center gap-1.5 rounded-md bg-[#22d3ee] px-6 py-3.5 text-[14px] font-semibold text-[#06080b] transition-[box-shadow,transform] hover:-translate-y-px hover:shadow-[0_0_24px_rgba(34,211,238,0.4)]"
              >
                Get started
              </a>
              <a
                href="/demo/report"
                className="flex items-center rounded-md border border-[#1f2630] px-6 py-3.5 text-[14px] font-medium text-[#f0f3f7] transition-colors hover:border-[#5a6470]"
              >
                View demo
              </a>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
