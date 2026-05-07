import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  FileStack,
  Gauge,
  HelpCircle,
  Scale,
  Shield,
  Sparkles,
  Zap,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

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

type GovernanceDecisionRow = {
  id: string;
  decision_type: string;
  finding_signature: string | null;
  rationale: string | null;
  mode: string | null;
  created_at: string;
};

async function getRecentDecisions(): Promise<GovernanceDecisionRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("governance_decisions")
    .select("id, decision_type, finding_signature, rationale, mode, created_at")
    .order("created_at", { ascending: false })
    .limit(10);
  return (data ?? []) as GovernanceDecisionRow[];
}

function decisionLabel(type: string): { label: string; tone: string } {
  const map: Record<string, { label: string; tone: string }> = {
    apply_fix: { label: "Fix applied", tone: "text-emerald-400" },
    accept_risk: { label: "Risk accepted", tone: "text-amber-400" },
    revoke_risk: { label: "Risk revoked", tone: "text-muted-foreground" },
    approve_fix: { label: "Fix approved", tone: "text-emerald-400" },
    reject_fix: { label: "Fix rejected", tone: "text-red-400" },
    mode_change: { label: "Mode changed", tone: "text-cyan-400" },
    interactive_response: { label: "Response recorded", tone: "text-muted-foreground" },
  };
  return map[type] ?? { label: type, tone: "text-muted-foreground" };
}

function timeAgoShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default async function DashboardOverviewPage() {
  const [home, recentDecisions] = await Promise.all([
    getHomeDashboardData(),
    getRecentDecisions(),
  ]);
  const totalOutcomes = home.passCount + home.failCount + home.reviewCount;
  const passRatePct =
    totalOutcomes > 0 ? Math.round((home.passCount / totalOutcomes) * 100) : null;

  return (
    <div className="space-y-10">
      <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card to-primary/[0.07] p-6 shadow-lg ring-1 ring-black/[0.06] dark:ring-white/[0.06] sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/[0.12] blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-chart-3/15 blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className={cn(
                  "border font-semibold tracking-wide",
                  home.mode === "supabase"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "border-border/80 bg-muted/60 text-muted-foreground"
                )}
              >
                {home.mode === "supabase" ? (
                  <>
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                    Live metrics
                  </>
                ) : (
                  <>
                    <BarChart3 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                    Demo data
                  </>
                )}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {home.mode === "supabase"
                  ? "Pulled from your saved workflow scans."
                  : "Connect Supabase to replace with your workspace."}
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Workflow governance, automated.</h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Connect your automation sources, select workflows, enforce policies, and get notified on every change — continuously.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" className="gap-2 shadow-md">
                <Link href="/sources">
                  Connect a source
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="secondary" asChild size="sm">
                <Link href="/runs">View runs</Link>
              </Button>
              <Button variant="outline" asChild size="sm" className="border-border/80 bg-background/50">
                <Link href="/reports">Reports</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Prefer manual?{" "}
              <Link href="/advanced/manual-scan" className="text-primary hover:underline">Advanced: manual scan</Link>
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col lg:items-end">
            <Button asChild className="gap-2 shadow-md">
              <Link href="/sources">
                Connect a source
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild className="border-border/80 bg-background/50 backdrop-blur">
              <Link href="/automations">Automations</Link>
            </Button>
            <Button variant="outline" asChild className="border-border/80 bg-background/50 backdrop-blur">
              <Link href="/policies">Policies</Link>
            </Button>
            <Button variant="outline" asChild className="border-border/80 bg-background/50 backdrop-blur">
              <Link href="/runs">Runs</Link>
            </Button>
          </div>
        </div>
      </div>

      <OverviewFirstRun
        mode={home.mode}
        savedReportsAllTime={home.savedReportsAllTime}
        onboarding={home.onboarding}
      />

      <Card className="border-border/70 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick glossary</CardTitle>
          <CardDescription>Hover to see key governance terms used in Torqa.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <TooltipProvider delayDuration={120}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  Policies
                  <HelpCircle className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Rules that define pass/fail and review thresholds for scans.</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  Risk score
                  <HelpCircle className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Deterministic 0-100 score indicating workflow risk posture.</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  Trust signals
                  <HelpCircle className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Structured reasons behind pass, fail, or needs-review decisions.</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<Activity className="h-4 w-4" />}
          label="Total scans"
          hint="Last 30 days"
          value={home.totalScans30d}
        />
        <MetricCard
          icon={<Activity className="h-4 w-4" />}
          label="Scans this week"
          hint="Last 7 days"
          value={home.scansThisWeek}
        />
        <MetricCard
          icon={<FileStack className="h-4 w-4" />}
          label="Saved reports"
          hint="All time in your library"
          value={home.savedReportsAllTime}
        />
        <MetricCard
          icon={<Gauge className="h-4 w-4" />}
          label="Avg trust score"
          hint="Mean risk score (0–100)"
          value={home.avgTrustScore === null ? "—" : home.avgTrustScore}
          valueClassName="text-primary"
        />
        <MetricCard
          icon={<Shield className="h-4 w-4" />}
          label="Policy failures"
          hint="Last 30 days"
          value={home.policyFailures30d}
          valueClassName={home.policyFailures30d > 0 ? "text-rose-500" : undefined}
        />
        <MetricCard
          icon={<Gauge className="h-4 w-4" />}
          label="High-risk scans"
          hint="Fail or trust<60 (30d)"
          value={home.highRiskScans30d}
          valueClassName={home.highRiskScans30d > 0 ? "text-amber-500" : undefined}
        />
        <MetricCard
          icon={<BarChart3 className="h-4 w-4" />}
          label="Schedule success"
          hint="Completed run rate (30d)"
          value={home.scheduleSuccessRate30d === null ? "—" : `${home.scheduleSuccessRate30d}%`}
        />
        <Card className="relative overflow-hidden border-border/80 bg-card/60 shadow-sm ring-1 ring-black/[0.05] dark:ring-white/[0.06]">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardDescription className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <Scale className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                Pass / fail
              </CardDescription>
              <CardTitle className="text-3xl font-semibold tabular-nums tracking-tight">
                {formatRatio(home.passCount, home.failCount)}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 text-xs text-muted-foreground">
            <p>
              Pass rate{" "}
              <span className="font-semibold text-foreground">
                {passRatePct === null ? "—" : `${passRatePct}%`}
              </span>
              {totalOutcomes > 0 ? (
                <>
                  {" "}
                  · {home.reviewCount} needs review
                </>
              ) : null}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-border/80 bg-card/40 shadow-md ring-1 ring-black/[0.06] dark:ring-white/[0.06]">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Shield className="h-5 w-5 text-primary" aria-hidden />
              Scan outcome trend
            </CardTitle>
            <CardDescription className="max-w-xl">Last 14 days for workflow governance outcomes.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <RiskTrendChart
            data={home.outcomeTrend}
            seriesLabels={{ safe: "Pass", needsReview: "Needs review", blocked: "Fail" }}
          />
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card/40 shadow-md ring-1 ring-black/[0.06] dark:ring-white/[0.06]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Top finding types</CardTitle>
          <CardDescription>Most common deterministic rule hits in recent scans.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {home.topFindingRules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No findings yet. Run a scan to populate this section.</p>
          ) : (
            home.topFindingRules.map((rule) => (
              <div key={rule.ruleId} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm">
                <code className="font-mono text-xs text-muted-foreground">{rule.ruleId}</code>
                <Badge variant="secondary" className="tabular-nums">
                  {rule.count}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Governance Activity Feed */}
      {recentDecisions.length > 0 && (
        <Card className="border-border/80 bg-card/40 shadow-md ring-1 ring-black/[0.06] dark:ring-white/[0.06]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Zap className="h-4 w-4 text-cyan-400" aria-hidden />
                Governance Activity
              </CardTitle>
              <CardDescription>Last 10 governance decisions across your workspace.</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild className="border-border/80">
              <Link href="/audit">Full audit log</Link>
            </Button>
          </CardHeader>
          <CardContent className="px-0 pb-2 pt-0">
            <div className="divide-y divide-border/40">
              {recentDecisions.map((d) => {
                const { label, tone } = decisionLabel(d.decision_type);
                return (
                  <div key={d.id} className="flex items-start justify-between gap-4 px-6 py-2.5">
                    <div className="min-w-0 flex-1">
                      <span className={`text-xs font-medium ${tone}`}>{label}</span>
                      {d.finding_signature && (
                        <code className="ml-2 font-mono text-[10px] text-muted-foreground">
                          {d.finding_signature.length > 40
                            ? `${d.finding_signature.slice(0, 40)}…`
                            : d.finding_signature}
                        </code>
                      )}
                      {d.rationale && (
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{d.rationale}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-[10px] text-muted-foreground">
                      {d.mode && (
                        <span className="rounded-full border border-border/40 bg-muted/20 px-1.5 py-0.5 capitalize">
                          {d.mode}
                        </span>
                      )}
                      <span>{timeAgoShort(d.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/80 bg-card/40 shadow-md ring-1 ring-black/[0.06] dark:ring-white/[0.06]">
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
                      <p className="text-sm text-muted-foreground">No saved scans yet.</p>
                      <Button asChild size="sm" className="gap-1.5">
                        <Link href="/scan">
                          Run first scan
                          <ArrowUpRight className="h-3.5 w-3.5" />
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
                          className="line-clamp-1 max-w-[220px] text-sm font-medium text-foreground hover:text-primary hover:underline"
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
                    <TableCell className="tabular-nums text-sm text-muted-foreground">{s.riskScore}</TableCell>
                    <TableCell>
                      <ScanOutcomeBadge status={s.status} />
                    </TableCell>
                    <TableCell className="pr-6 text-right text-xs text-muted-foreground">
                      {new Date(s.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
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
    <Card className="relative overflow-hidden border-border/80 bg-card/60 shadow-sm ring-1 ring-black/[0.05] dark:ring-white/[0.06]">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardDescription className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {icon}
            {label}
          </CardDescription>
          <CardTitle className={cn("text-3xl font-semibold tabular-nums tracking-tight", valueClassName)}>
            {value}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{hint}</CardContent>
    </Card>
  );
}
