import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  FileStack,
  Gauge,
  Shield,
  Zap,
} from "lucide-react";
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
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Home",
  description: "Connect sources, monitor workflows, enforce policies continuously.",
};

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
    .limit(8);
  return (data ?? []) as GovernanceDecisionRow[];
}

const DECISION_META: Record<string, { label: string; dot: string }> = {
  apply_fix: { label: "Fix applied", dot: "#10b981" },
  accept_risk: { label: "Risk accepted", dot: "#f59e0b" },
  revoke_risk: { label: "Risk revoked", dot: "#6b7280" },
  approve_fix: { label: "Fix approved", dot: "#10b981" },
  reject_fix: { label: "Fix rejected", dot: "#f43f5e" },
  mode_change: { label: "Mode changed", dot: "#22d3ee" },
  interactive_response: { label: "Response recorded", dot: "#8b8b9a" },
};

function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function DashboardOverviewPage() {
  const [home, decisions] = await Promise.all([
    getHomeDashboardData(),
    getRecentDecisions(),
  ]);

  const totalOutcomes = home.passCount + home.failCount + home.reviewCount;
  const passRate = totalOutcomes > 0 ? Math.round((home.passCount / totalOutcomes) * 100) : null;

  return (
    <div className="space-y-8 animate-fade-in-up">

      {/* ── Hero row ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--fg-3)]">
            Overview
          </p>
          <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">
            Governance control
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/sources"
            className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium text-[var(--fg-2)] transition-all hover:text-[var(--fg-1)]"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--line-2)" }}
          >
            Connect source
            <ArrowUpRight className="h-3 w-3" />
          </Link>
          <Link
            href="/scan"
            className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium text-[var(--void)] transition-all"
            style={{ background: "var(--accent)", border: "1px solid var(--accent)" }}
          >
            <Shield className="h-3 w-3" />
            Scan now
          </Link>
        </div>
      </div>

      <OverviewFirstRun
        mode={home.mode}
        savedReportsAllTime={home.savedReportsAllTime}
        onboarding={home.onboarding}
      />

      {/* ── Metric grid ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile
          label="Scans (30d)"
          value={home.totalScans30d}
          icon={<Activity className="h-3.5 w-3.5" />}
          sub="Total scans last month"
        />
        <MetricTile
          label="Avg trust score"
          value={home.avgTrustScore ?? "—"}
          icon={<Gauge className="h-3.5 w-3.5" />}
          sub="Mean risk posture 0–100"
          accent={
            typeof home.avgTrustScore === "number"
              ? home.avgTrustScore >= 70
                ? "var(--emerald)"
                : home.avgTrustScore >= 45
                ? "var(--amber)"
                : "var(--rose)"
              : undefined
          }
        />
        <MetricTile
          label="Policy failures"
          value={home.policyFailures30d}
          icon={<Shield className="h-3.5 w-3.5" />}
          sub="Failed governance checks (30d)"
          accent={home.policyFailures30d > 0 ? "var(--rose)" : undefined}
        />
        <MetricTile
          label="Pass rate"
          value={passRate === null ? "—" : `${passRate}%`}
          icon={<BarChart3 className="h-3.5 w-3.5" />}
          sub={`${home.passCount} pass · ${home.failCount} fail · ${home.reviewCount} review`}
          accent={
            passRate !== null
              ? passRate >= 75
                ? "var(--emerald)"
                : passRate >= 50
                ? "var(--amber)"
                : "var(--rose)"
              : undefined
          }
        />
        <MetricTile
          label="Scans this week"
          value={home.scansThisWeek}
          icon={<Activity className="h-3.5 w-3.5" />}
          sub="Last 7 days"
        />
        <MetricTile
          label="Saved reports"
          value={home.savedReportsAllTime}
          icon={<FileStack className="h-3.5 w-3.5" />}
          sub="All time in library"
        />
        <MetricTile
          label="High-risk scans"
          value={home.highRiskScans30d}
          icon={<Zap className="h-3.5 w-3.5" />}
          sub="Trust < 60 or FAIL (30d)"
          accent={home.highRiskScans30d > 0 ? "var(--amber)" : undefined}
        />
        <MetricTile
          label="Schedule success"
          value={home.scheduleSuccessRate30d === null ? "—" : `${home.scheduleSuccessRate30d}%`}
          icon={<BarChart3 className="h-3.5 w-3.5" />}
          sub="Completed run rate (30d)"
        />
      </div>

      {/* ── Trend chart ── */}
      <SectionCard
        title="Scan outcome trend"
        sub="Last 14 days"
        action={{ href: "/reports", label: "Reports" }}
      >
        <div className="pt-2">
          <RiskTrendChart
            data={home.outcomeTrend}
            seriesLabels={{ safe: "Pass", needsReview: "Review", blocked: "Fail" }}
          />
        </div>
      </SectionCard>

      {/* ── Bottom two-col ── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Top finding types */}
        <SectionCard
          title="Top findings"
          sub="Most frequent rule hits"
        >
          {home.topFindingRules.length === 0 ? (
            <EmptyState text="No findings yet. Run a scan to populate this section." />
          ) : (
            <div className="space-y-1.5 pt-2">
              {home.topFindingRules.map((rule) => (
                <div
                  key={rule.ruleId}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5"
                  style={{ border: "1px solid var(--line)", background: "rgba(255,255,255,0.02)" }}
                >
                  <code className="font-mono text-[11px] text-[var(--fg-2)]">{rule.ruleId}</code>
                  <span
                    className="rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums"
                    style={{ background: "rgba(255,255,255,0.05)", color: "var(--fg-2)" }}
                  >
                    {rule.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Governance activity */}
        <SectionCard
          title="Activity"
          sub="Recent governance decisions"
          action={{ href: "/audit", label: "Full log" }}
        >
          {decisions.length === 0 ? (
            <EmptyState text="No governance decisions yet." />
          ) : (
            <div className="pt-2 space-y-[1px]">
              {decisions.map((d) => {
                const meta = DECISION_META[d.decision_type] ?? { label: d.decision_type, dot: "#6b7280" };
                return (
                  <div
                    key={d.id}
                    className="flex items-start justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-white/[0.02]"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: meta.dot }}
                      />
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-[var(--fg-2)]">{meta.label}</p>
                        {d.rationale && (
                          <p className="mt-0.5 truncate text-[11px] text-[var(--fg-3)]">{d.rationale}</p>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] text-[var(--fg-4)] tabular-nums">
                      {timeAgo(d.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Recent scans ── */}
      <SectionCard
        title="Recent scans"
        sub="Latest governance analyses"
        action={{ href: "/scan/history", label: "View history" }}
      >
        <div className="pt-2">
          {home.recentScans.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Shield className="h-8 w-8 text-[var(--fg-4)]" />
              <p className="text-[13px] text-[var(--fg-3)]">No scans yet</p>
              <Link
                href="/scan"
                className="flex h-7 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium"
                style={{ background: "var(--cyan)", color: "var(--void)" }}
              >
                Run first scan <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow style={{ borderColor: "var(--line)" }} className="hover:bg-transparent">
                  <TableHead className="text-[11px] uppercase tracking-wide text-[var(--fg-3)]">Workflow</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide text-[var(--fg-3)]">Source</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide text-[var(--fg-3)]">Trust</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wide text-[var(--fg-3)]">Outcome</TableHead>
                  <TableHead className="text-right text-[11px] uppercase tracking-wide text-[var(--fg-3)]">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {home.recentScans.map((s) => (
                  <TableRow key={s.id} style={{ borderColor: "var(--line)" }} className="hover:bg-white/[0.02]">
                    <TableCell>
                      {home.mode === "mock" ? (
                        <span className="line-clamp-1 max-w-[200px] text-[13px] font-medium text-[var(--fg-1)]">
                          {s.workflowName ?? "Untitled"}
                        </span>
                      ) : (
                        <Link
                          href={`/scan/${s.id}`}
                          className="line-clamp-1 max-w-[200px] text-[13px] font-medium text-[var(--fg-1)] transition-colors hover:text-[var(--cyan)]"
                        >
                          {s.workflowName ?? "Untitled"}
                        </Link>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className="rounded-md px-1.5 py-0.5 text-[11px] capitalize"
                        style={{ background: "rgba(255,255,255,0.05)", color: "var(--fg-2)" }}
                      >
                        {s.source}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums text-[13px] text-[var(--fg-2)]">{s.riskScore}</TableCell>
                    <TableCell><ScanOutcomeBadge status={s.status} /></TableCell>
                    <TableCell className="text-right text-[11px] text-[var(--fg-3)]">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </SectionCard>

    </div>
  );
}

/* ── Sub-components ── */

function MetricTile({
  label,
  value,
  icon,
  sub,
  accent,
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
  sub: string;
  accent?: string;
}) {
  return (
    <div
      className="group rounded-xl p-4 transition-all hover:border-white/10"
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--line)",
      }}
    >
      <div className="mb-3 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--fg-3)]">
        <span style={{ color: "var(--fg-4)" }}>{icon}</span>
        {label}
      </div>
      <div
        className={cn("text-[28px] font-semibold tabular-nums tracking-tight leading-none")}
        style={{ color: accent ?? "var(--fg-1)" }}
      >
        {value}
      </div>
      <p className="mt-1.5 text-[11px] text-[var(--fg-3)] leading-snug">{sub}</p>
    </div>
  );
}

function SectionCard({
  title,
  sub,
  action,
  children,
}: {
  title: string;
  sub: string;
  action?: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <div
      className="rounded-xl"
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--line)",
      }}
    >
      <div
        className="flex items-center justify-between px-5 pt-5 pb-0"
      >
        <div>
          <p className="text-[14px] font-semibold text-[var(--fg-1)]">{title}</p>
          <p className="mt-0.5 text-[12px] text-[var(--fg-3)]">{sub}</p>
        </div>
        {action && (
          <Link
            href={action.href}
            className="flex items-center gap-1 text-[12px] text-[var(--fg-3)] transition-colors hover:text-[var(--fg-2)]"
          >
            {action.label}
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-8 text-center">
      <p className="text-[13px] text-[var(--fg-3)]">{text}</p>
    </div>
  );
}
