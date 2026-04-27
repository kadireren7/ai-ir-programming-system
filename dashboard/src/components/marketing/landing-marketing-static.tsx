import Link from "next/link";
import { BarChart3, Bell, CalendarClock, Link2, Puzzle, ScrollText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionDivider } from "@/components/marketing/section-divider";

const journey = [
  {
    title: "Connect",
    copy: "Wire up n8n, your workflow library, and API sources so Torqa always sees what ships.",
    icon: Link2,
  },
  {
    title: "Monitor",
    copy: "Scheduled scans run on your cadence and flag risky changes before they reach production.",
    icon: CalendarClock,
  },
  {
    title: "Govern",
    copy: "Policy templates gate releases; Slack and in-app alerts notify the right owners on FAIL.",
    icon: ScrollText,
  },
] as const;

const platform = [
  { title: "Integrations", copy: "n8n, library, API", href: "/integrations", icon: Puzzle },
  { title: "Scheduled scans", copy: "Daily or custom cadence", href: "/schedules", icon: CalendarClock },
  { title: "Policy templates", copy: "Production-ready rulesets", href: "/policies", icon: ScrollText },
  { title: "Alerts", copy: "Slack, email, in-app", href: "/alerts", icon: Bell },
  { title: "Team insights", copy: "Scan history and posture", href: "/insights", icon: BarChart3 },
] as const;

/** Server-rendered marketing sections (no Framer Motion). */
export function LandingMarketingStatic() {
  return (
    <>
      <SectionDivider />

      <section id="journey" className="scroll-mt-28 mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:py-24">
        <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">Three steps</h2>
        <div className="mt-14 grid gap-6 md:grid-cols-3 md:gap-8">
          {journey.map((j) => {
            const Icon = j.icon;
            return (
              <div key={j.title} className="h-full transition-transform duration-200 ease-out motion-safe:hover:-translate-y-1">
                <Card className="h-full border-border/50 bg-card/40 shadow-lg shadow-black/20 ring-1 ring-white/[0.04] backdrop-blur-sm">
                  <CardContent className="flex flex-col gap-5 p-8">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <p className="text-lg font-semibold tracking-tight">{j.title}</p>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{j.copy}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </section>

      <SectionDivider />

      <section id="platform" className="scroll-mt-28 mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:py-24">
        <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">Platform</h2>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {platform.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="transition-transform duration-200 ease-out motion-safe:hover:-translate-y-0.5">
                <Link href={p.href} className="block h-full">
                  <Card className="h-full border-border/50 bg-card/35 transition-colors hover:border-primary/30 hover:bg-card/50">
                    <CardContent className="space-y-4 p-6">
                      <Icon className="h-5 w-5 text-primary" aria-hidden />
                      <div>
                        <p className="font-semibold tracking-tight">{p.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{p.copy}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
