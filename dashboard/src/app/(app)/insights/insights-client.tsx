"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Gauge,
  Loader2,
  Shield,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { RiskTrendChart } from "@/components/risk-trend-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InsightsPayload, InsightsScope } from "@/lib/insights-types";
import { cn } from "@/lib/utils";

function directionLabel(d: InsightsPayload["totals"]["riskTrendDirection"]): { text: string; Icon: typeof TrendingUp } {
  if (d === "improving") return { text: "Trust rising in this window", Icon: TrendingUp };
  if (d === "worsening") return { text: "Trust slipping — review recent changes", Icon: TrendingDown };
  return { text: "Stable posture vs earlier in window", Icon: ArrowRight };
}

export function InsightsPageClient() {
  const [scope, setScope] = useState<InsightsScope>("workspace");
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [status, setStatus] = useState<InsightsPayload["status"]>("all");
  const [policyGate, setPolicyGate] = useState<InsightsPayload["policyGate"]>("all");
  const [policyName, setPolicyName] = useState<string>("all");
  const [data, setData] = useState<InsightsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("scope", scope);
    p.set("days", String(days));
    p.set("status", status);
    p.set("policyGate", policyGate);
    if (policyName !== "all") p.set("policyName", policyName);
    return p.toString();
  }, [scope, days, status, policyGate, policyName]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/insights?${qs}`, { credentials: "include" });
      const j = (await res.json()) as InsightsPayload & { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Could not load insights");
        setData(null);
        return;
      }
      setData(j as InsightsPayload);
    } catch {
      setError("Network error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => {
    void load();
  }, [load]);

  const trendDir = data ? directionLabel(data.totals.riskTrendDirection) : null;
  const isDemo = data?.mode === "demo";

  useEffect(() => {
    if (!data || policyName === "all") return;
    if (!data.policyNameOptions.includes(policyName)) {
      setPolicyName("all");
    }
  }, [data, policyName]);

  return (
    <div className="space-y-10 pb-10">
      <div className="border-b border-border/60 pb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Team governance</p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Insights & ROI</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Measurable automation risk from saved scans — critical-class findings, policy gates, and ownership. Metrics
              aggregate <code className="rounded bg-muted px-1 font-mono text-xs">scan_history.result</code> including{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">policyEvaluation</code> when present.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button asChild size="sm" variant="outline">
                <Link href="/scan">Run scan</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/scan/history">Scan history</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/policies">Policies</Link>
              </Button>
            </div>
          </div>
          {data ? (
            <Badge
              variant="secondary"
              className={cn(
                "h-fit shrink-0 border font-semibold",
                isDemo
                  ? "border-border/80 bg-muted/60 text-muted-foreground"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              )}
            >
              {isDemo ? (
                <>
                  <BarChart3 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  Demo mode
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  Live data
                </>
              )}
            </Badge>
          ) : null}
        </div>
        {isDemo ? (
          <p className="mt-3 max-w-2xl rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-950 dark:text-amber-100/95">
            <span className="font-semibold">Demo mode:</span> Connect Supabase and sign in to replace this view with your
            workspace scan history. Filters still work on synthetic data so you can preview the experience.
          </p>
        ) : null}
        {data?.workspaceRequired ? (
          <p className="mt-3 max-w-2xl rounded-lg border border-sky-500/25 bg-sky-500/[0.06] px-3 py-2 text-xs text-sky-950 dark:text-sky-100/95">
            <span className="font-semibold">Workspace scope</span> requires an active workspace. Choose one under{" "}
            <Link href="/workspace" className="font-medium underline underline-offset-2">
              Workspace
            </Link>{" "}
            or switch to <strong className="font-medium">Personal</strong> filters.
          </p>
        ) : null}
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>Scope and time window match how scans are stored; policy filters require saved evaluations.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <Label>Scope</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={scope}
              onChange={(e) => setScope(e.target.value as InsightsScope)}
            >
              <option value="workspace">Active workspace</option>
              <option value="personal">Personal</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Time range</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={days}
              onChange={(e) => setDays(Number(e.target.value) as 7 | 30 | 90)}
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Engine status</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as InsightsPayload["status"])}
            >
              <option value="all">All</option>
              <option value="PASS">PASS</option>
              <option value="NEEDS REVIEW">NEEDS REVIEW</option>
              <option value="FAIL">FAIL</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Policy gate</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={policyGate}
              onChange={(e) => setPolicyGate(e.target.value as InsightsPayload["policyGate"])}
            >
              <option value="all">All (ignore policy gate)</option>
              <option value="PASS">Policy PASS</option>
              <option value="WARN">Policy WARN</option>
              <option value="FAIL">Policy FAIL</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Applied policy</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={policyName}
              onChange={(e) => setPolicyName(e.target.value)}
            >
              <option value="all">All policies</option>
              {(data?.policyNameOptions ?? []).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {loading && !data ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading insights…
        </p>
      ) : null}

      {data ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <RoiCallout
              icon={<Target className="h-4 w-4" />}
              title="Issues caught before production"
              body="Critical- and high-severity findings surfaced in Torqa scans — visibility before changes hit prod traffic."
            />
            <RoiCallout
              icon={<Shield className="h-4 w-4" />}
              title="Critical risks blocked"
              body="Policy FAIL counts show governance gates that would block a release under your chosen standards."
            />
            <RoiCallout
              icon={<Activity className="h-4 w-4" />}
              title="Governance drift reduced"
              body="Trend and policy tables show whether trust and policy posture are moving in the right direction."
            />
            <RoiCallout
              icon={<Users className="h-4 w-4" />}
              title="Team automation posture"
              body="Member contribution highlights who is scanning most and where critical findings concentrate."
            />
          </section>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricTile
              label={`Total scans (${days}d)`}
              value={data.totals.totalScans}
              hint="Saved scan_history rows in range after filters"
            />
            <MetricTile
              label="Critical-class findings"
              value={data.totals.criticalFindingsCaught}
              hint="High + critical severities across scans"
            />
            <MetricTile
              label="Policy FAIL (governance)"
              value={data.totals.governanceFailures}
              hint="Scans where policyEvaluation.status is FAIL"
            />
            <MetricTile
              label="Average trust score"
              value={data.totals.avgTrustScore ?? "—"}
              hint="Mean engine riskScore (higher = safer)"
            />
            <MetricTile
              label="Policy failure rate"
              value={data.totals.policyFailureRate === null ? "—" : `${data.totals.policyFailureRate}%`}
              hint="Among scans with a policy evaluation"
            />
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Gauge className="h-4 w-4" />
                  Risk trend direction
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trendDir ? (
                  <div className="flex items-center gap-2">
                    {(() => {
                      const Icon = trendDir.Icon;
                      return <Icon className="h-5 w-5 text-primary" aria-hidden />;
                    })()}
                    <p className="text-sm font-medium leading-snug">{trendDir.text}</p>
                  </div>
                ) : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  Compares average trust in the first vs second half of the selected window.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Risk trend</CardTitle>
              <CardDescription>
                Daily scan outcomes (PASS / NEEDS REVIEW / FAIL). Chart shows up to the last 30 UTC days of the selected
                range (wider windows still drive the KPI totals above).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RiskTrendChart
                data={data.trend}
                seriesLabels={{ safe: "PASS", needsReview: "NEEDS REVIEW", blocked: "FAIL" }}
              />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Top failing rules</CardTitle>
                <CardDescription>Critical-class findings by rule_id</CardDescription>
              </CardHeader>
              <CardContent>
                {data.topRules.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No critical-class findings in this slice.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rule</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.topRules.map((r) => (
                        <TableRow key={r.ruleId}>
                          <TableCell className="font-mono text-xs">{r.ruleId}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Top risky workflows</CardTitle>
                <CardDescription>By lowest average trust, then engine FAIL rate</CardDescription>
              </CardHeader>
              <CardContent>
                {data.topWorkflows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No workflows in this slice.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Workflow</TableHead>
                        <TableHead className="text-right">Scans</TableHead>
                        <TableHead className="text-right">Avg trust</TableHead>
                        <TableHead className="text-right">FAIL %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.topWorkflows.map((w) => (
                        <TableRow key={w.name}>
                          <TableCell className="max-w-[200px] truncate text-sm">{w.name}</TableCell>
                          <TableCell className="text-right tabular-nums">{w.scanCount}</TableCell>
                          <TableCell className="text-right tabular-nums">{w.avgTrust}</TableCell>
                          <TableCell className="text-right tabular-nums">{w.engineFailRate}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Policy outcomes</CardTitle>
              <CardDescription>Where policyEvaluation exists — which named policies PASS / WARN / FAIL</CardDescription>
            </CardHeader>
            <CardContent>
              {data.policyOutcomes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No policy evaluations in this slice. Run scans with a policy from{" "}
                  <Link href="/scan" className="text-primary underline-offset-2 hover:underline">
                    /scan
                  </Link>{" "}
                  or schedules.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Policy</TableHead>
                      <TableHead className="text-right">PASS</TableHead>
                      <TableHead className="text-right">WARN</TableHead>
                      <TableHead className="text-right">FAIL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.policyOutcomes.map((p) => (
                      <TableRow key={p.policyName}>
                        <TableCell className="font-medium">{p.policyName}</TableCell>
                        <TableCell className="text-right tabular-nums">{p.pass}</TableCell>
                        <TableCell className="text-right tabular-nums">{p.warn}</TableCell>
                        <TableCell className="text-right tabular-nums">{p.fail}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Member contribution</CardTitle>
              <CardDescription>
                {scope === "workspace"
                  ? "Scans attributed to user_id in shared workspace history (emails from workspace directory)."
                  : "Your personal scans only."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.memberStats.length === 0 ? (
                <p className="text-sm text-muted-foreground">No member rows in this slice.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead className="text-right">Scans</TableHead>
                      <TableHead className="text-right">Critical-class</TableHead>
                      <TableHead className="text-right">Policy FAIL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.memberStats.map((m) => (
                      <TableRow key={m.userId}>
                        <TableCell>
                          <span className="text-sm font-medium">{m.email ?? m.userId.slice(0, 8) + "…"}</span>
                          <p className="font-mono text-[10px] text-muted-foreground">{m.userId}</p>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{m.scanCount}</TableCell>
                        <TableCell className="text-right tabular-nums">{m.criticalFindings}</TableCell>
                        <TableCell className="text-right tabular-nums">{m.governanceFails}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function RoiCallout({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <Card className="border-border/80 bg-muted/[0.15] shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <span className="text-primary">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs leading-relaxed text-muted-foreground">{body}</CardContent>
    </Card>
  );
}

function MetricTile({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
        <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
