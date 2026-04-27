import dynamic from "next/dynamic";
import type { Metadata } from "next";
import { LandingFooter } from "@/components/marketing/landing-footer";
import { LandingMarketingStatic } from "@/components/marketing/landing-marketing-static";
import {
  LandingCtaSkeleton,
  LandingDemoSkeleton,
  LandingHeroSkeleton,
  LandingPipelineSkeleton,
} from "@/components/marketing/landing-motion-fallbacks";
import { LandingNavbar } from "@/components/marketing/landing-navbar";
import { SectionDivider } from "@/components/marketing/section-divider";

const MarketingHero = dynamic(
  () => import("@/components/marketing/marketing-hero").then((m) => ({ default: m.MarketingHero })),
  { loading: () => <LandingHeroSkeleton /> }
);

const MarketingGovernancePipeline = dynamic(
  () =>
    import("@/components/marketing/marketing-governance-pipeline").then((m) => ({
      default: m.MarketingGovernancePipeline,
    })),
  { loading: () => <LandingPipelineSkeleton /> }
);

const MarketingDemoStrip = dynamic(
  () => import("@/components/marketing/marketing-demo-strip").then((m) => ({ default: m.MarketingDemoStrip })),
  { loading: () => <LandingDemoSkeleton /> }
);

const MarketingSimpleCta = dynamic(
  () => import("@/components/marketing/marketing-simple-cta").then((m) => ({ default: m.MarketingSimpleCta })),
  { loading: () => <LandingCtaSkeleton /> }
);

export const metadata: Metadata = {
  title: "Continuous governance for automation workflows",
  description:
    "Connect tools like n8n, scan changes automatically, enforce policies, and alert your team before risky workflows reach production.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Torqa — Continuous governance for automation workflows",
    description:
      "Connect tools like n8n, scan changes automatically, enforce policies, and alert your team before risky workflows reach production.",
    url: "/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Torqa — Continuous governance for automation workflows",
    description:
      "Connect tools like n8n, scan changes automatically, enforce policies, and alert your team before risky workflows reach production.",
  },
};

/** Marketing: server shell + lazy motion chunks; static journey/platform are RSC. */
export default function MarketingLandingPage() {
  return (
    <>
      <LandingNavbar />
      <main id="main-content" className="bg-background text-foreground">
        <MarketingHero />

        <section id="product" className="scroll-mt-28">
          <div className="mx-auto max-w-6xl px-6 pt-8 sm:px-8 sm:pt-10">
            <p className="text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              From source to alert
            </p>
          </div>
          <MarketingGovernancePipeline />
        </section>

        <LandingMarketingStatic />

        <SectionDivider />

        <section id="demo" className="scroll-mt-28 mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:py-24">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">Live posture</h2>
          <p className="mx-auto mt-3 max-w-md text-center text-sm text-muted-foreground">
            One connected stack, continuously checked.
          </p>
          <div className="mt-12">
            <MarketingDemoStrip />
          </div>
        </section>

        <SectionDivider />

        <section className="mx-auto max-w-6xl px-6 pb-24 pt-8 sm:px-8 sm:pb-28">
          <MarketingSimpleCta />
        </section>
      </main>

      <LandingFooter />
    </>
  );
}
