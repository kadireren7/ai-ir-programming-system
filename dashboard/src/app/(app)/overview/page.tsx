import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Cable,
  FileStack,
  Gauge,
  GitBranch,
  Scale,
  Shield,
  Sparkles,
  Workflow,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskTrendChart } from "@/components/risk-trend-chart";
import { ScanOutcomeBadge } from "@/components/scan-outcome-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getHomeDashboardData } from "@/data/home-metrics";
import { cn } from "@/lib/utils";
import { OverviewFirstRun } from "@/components/onboarding/overview-first-run";
import { FadeUp } from "@/components/motion/fade-up";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Home",
  description: "Connect sources, monitor workflows, enforce policies continuously.",
};

function formatRatio(pass: number, fail: number): string {
  if (pass === 0 && fail === 0) return "—";
  if (fail === 0) return `${pass} : 0`;
  const g = (a: number, b: number): number => (b === 0 ? a : g(b, a % b));
  const d = g(pass, fail);
  return `${Math.round(pass / d)} : ${Math.round(fail / d)}`;
}

const CONNECTOR_CARDS = [
  { id: "n8n", label: "n8n", Icon: Workflow },
  { id: "github", label: "GitHub", Icon: GitBranch },
  { id: "webhook", label: "Webhook", Icon: Cable },
] as const;

export default async function DashboardOverviewPage() {
  const home = await getHomeDashboardData();
  const totalOutcomes = home.passCount + home.failCount + home.reviewCount;
  const passRatePct =
    totalOutcomes > 0 ? Math.round((home.passCount / totalOutcomes) * 100) : null;
  const lastRun = home.recentScans[0] ?? null;

  return (
    <div className="space-y-10">

      {/* ── HERO ───────────────────────────────────────────────── */}
      <FadeUp>
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card to-primary/[0.06] p-7 shadow-lg ring-1 ring-white/[0.06] sm:p-10">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/[0.10] blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-chart-3/10 blur-3xl" aria-hidden="true" />

          <div className="relative max-w-2xl space-y-5">
            <Badge
              variant="secondary"
              className={cn(
                "border font-semibold tracking-wide",
                home.mode === "supabase"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400"
                  : "border-border/80 bg-muted/60 text-foreground/60"
              )}
            >
              {home.mode === "supabase" ? (
                <>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Live metrics
                </>
              ) : (
                <>
                  <BarChart3 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Demo data
                </>
              )}
            </Badge>

            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Workflow governance, automated.
            </h1>

            <p className="max-w-lg text-base leading-relaxed text-foreground/65 sm:text-lg">
              Torqa continuously validates your workflows in the background — connect a source and
              enforcement starts on every run.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button asChild size="lg" className="gap-2 shadow-md hover:-translate-y-0.5 transition-transform">
                <Link href="/sources">
                  Connect a source
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button variant="outline" asChild size="lg" className="border-border/80 hover:-translate-y-0.5 transition-transform">
                <Link href="/reports">View reports</Link>
              </Button>
            </div>

            <p className="text-sm text-foreground/50">
              Prefer manual?{" "}
              <Link
                href="/advanced/manual-scan"
                className="font-medium text-foreground/70 underline underline-offset-4 hover:text-foreground"
              >
                Advanced: manual scan
              </Link>
            </p>
          </div>
        </div>
      </FadeUp>

      {/* ── ACTIVE SOURCES ────────────────────────────────────── */}
      <FadeUp delay={0.08}>
        <section aria-label="Active sources">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-foreground/50">
            Sources
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {CONNECTOR_CARDS.map(({ id, label, Icon }) => (
              <Link
                key={id}
                href="/sources"
                className="group flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 px-4 py-3.5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                </span>
                <span className="flex-1 text-sm font-medium">{label}</span>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {home.mode === "supabase" ? "Active" : "Connect"}
                </Badge>
              </Link>
            ))}
          </div>
        </section>
      </FadeUp>

      {/* ── LAST RUN + RISK + PASS RATE ────────────────────────── */}
      <FadeUp delay={0.14}>
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Last run */}
          <Card className="border-border/70 bg-card/60 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                <Activity className="h-3.5 w-3.5" aria-hidden="true" />
                Last run
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {lastRun ? (
                <>
                  <ScanOutcomeBadge status={lastRun.status} />
                  <p className="text-xs text-foreground/60">{new Date(lastRun.createdAt).toLocaleString()}</p>
                </>
              ) : (
                <p className="text-sm text-foreground/50">No runs yet</p>
              )}
            </CardContent>
          </Card>

          {/* Risk score */}
          <Card className="border-border/70 bg-card/60 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
                Avg risk score
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums text-primary">
                {home.avgTrustScore === null ? "—" : home.avgTrustScore}
              </p>
              <p className="text-xs text-foreground/50">0–100 scale</p>
            </CardContent>
          </Card>

          {/* Pass / fail */}
          <Card className="border-border/70 bg-card/60 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
                <Scale className="h-3.5 w-3.5" aria-hidden="true" />
                Pass / fail
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums">
                {formatRatio(home.passCount, home.failCount)}
              </p>
              <p className="text-xs text-foreground/50">
                {passRatePct === null ? "No data yet" : `${passRatePct}% pass rate`}
              </p>
            </CardContent>
          </Card>
        </div>
      </FadeUp>

      {/* ── ONBOARDING ─────────────────────────────────────────── */}
      <FadeUp delay={0.18}>
        <OverviewFirstRun
          mode={home.mode}
          savedReportsAllTime={home.savedReportsAllTime}
          onboarding={home.onboarding}
        />
      </FadeUp>

      {/* ── METRICS ────────────────────────────────────────────── */}
      <FadeUp delay={0.22}>
        <section aria-label="Scan metrics">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-foreground/50">
            30-day metrics
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={<Activity className="h-4 w-4" aria-hidden="true" />}
              label="Total scans"
              hint="Last 30 days"
              value={home.totalScans30d}
            />
            <MetricCard
              icon={<FileStack className="h-4 w-4" aria-hidden="true" />}
              label="Saved reports"
              hint="All time"
              value={home.savedReportsAllTime}
            />
            <MetricCard
              icon={<Shield className="h-4 w-4" aria-hidden="true" />}
              label="Policy failures"
              hint="Last 30 days"
              value={home.policyFailures30d}
              valueClassName={home.policyFailures30d > 0 ? "text-rose-600 dark:text-rose-400" : undefined}
            />
            <MetricCard
              icon={<BarChart3 className="h-4 w-4" aria-hidden="true" />}
              label="Schedule success"
              hint="Completed run rate"
              value={home.scheduleSuccessRate30d === null ? "—" : `${home.scheduleSuccessRate30d}%`}
            />
          </div>
        </section>
      </FadeUp>

      {/* ── TREND CHART ────────────────────────────────────────── */}
      <FadeUp delay={0.26}>
        <Card className="overflow-hidden border-border/80 bg-card/40 shadow-md ring-1 ring-white/[0.05]">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
                Scan outcome trend
              </CardTitle>
              <CardDescription>Last 14 days</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <RiskTrendChart
              data={home.outcomeTrend}
              seriesLabels={{ safe: "Pass", needsReview: "Needs review", blocked: "Fail" }}
            />
          </CardContent>
        </Card>
      </FadeUp>

      {/* ── RECENT SCANS ───────────────────────────────────────── */}
      <FadeUp delay={0.30}>
        <Card className="border-border/80 bg-card/40 shadow-md ring-1 ring-white/[0.05]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-lg font-semibold">Recent scans</CardTitle>
              <CardDescription>Latest saved analyses</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild className="border-border/80">
              <Link href="/scan/history">Full history</Link>
            </Button>
          </CardHeader>
          <CardContent className="px-0 pb-2 pt-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="pl-6">Workflow</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Trust</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead className="pr-6 text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {home.recentScans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="px-6 py-10">
                      <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-center">
                        <p className="text-sm text-foreground/50">No saved scans yet.</p>
                        <Button asChild size="sm" className="gap-1.5">
                          <Link href="/scan">
                            Run first scan
                            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  home.recentScans.map((s) => (
                    <TableRow key={s.id} className="border-border/60">
                      <TableCell className="pl-6">
                        {home.mode === "mock" ? (
                          <span className="line-clamp-1 max-w-[220px] text-sm font-medium text-foreground">
                            {s.workflowName ?? "Untitled workflow"}
                          </span>
                        ) : (
                          <Link
                            href={`/scan/${s.id}`}
                            className="line-clamp-1 max-w-[220px] text-sm font-medium text-foreground underline-offset-4 hover:underline"
                          >
                            {s.workflowName ?? "Untitled workflow"}
                          </Link>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal capitalize">
                          {s.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums text-sm text-foreground/60">{s.riskScore}</TableCell>
                      <TableCell>
                        <ScanOutcomeBadge status={s.status} />
                      </TableCell>
                      <TableCell className="pr-6 text-right text-xs text-foreground/50">
                        {new Date(s.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </FadeUp>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  hint,
  value,
  valueClassName,
}: {
  icon: ReactNode;
  label: string;
  hint: string;
  value: number | string;
  valueClassName?: string;
}) {
  return (
    <Card className="relative overflow-hidden border-border/80 bg-card/60 shadow-sm ring-1 ring-white/[0.04] transition-all hover:shadow-md hover:-translate-y-0.5">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardDescription className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
            {icon}
            {label}
          </CardDescription>
          <CardTitle className={cn("text-3xl font-bold tabular-nums tracking-tight", valueClassName)}>
            {value}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="text-xs text-foreground/50">{hint}</CardContent>
    </Card>
  );
}
