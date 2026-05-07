"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Cable,
  CheckCircle2,
  Clock,
  GitBranch,
  Loader2,
  Plug,
  Puzzle,
  RefreshCw,
  Wand2,
  Webhook,
  Workflow,
  Zap,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type SparkPoint = {
  id: string;
  created_at: string;
  risk_score: number;
  decision: string;
};

type WorkflowDetail = {
  id: string;
  name: string;
  source: string;
  external_id: string | null;
  source_id: string | null;
  last_synced_at: string | null;
  risk_score: number | null;
  last_scan_decision: "approve" | "review" | "block" | null;
  last_scanned_at: string | null;
  created_at: string;
};

type Finding = {
  ruleId: string;
  severity: string;
  message: string;
  path?: string;
  fix_suggestion?: string;
  fix_type?: "safe_auto" | "structural" | "manual_required";
};

const SOURCE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  n8n: Workflow,
  github: GitBranch,
  webhook: Webhook,
  zapier: Zap,
  make: Puzzle,
  pipedream: Plug,
  "ai-agent": Bot,
  generic: Cable,
};

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function staleDays(iso: string | null): number | null {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.floor(diff / 86_400_000);
}

function DecisionBadge({ decision }: { decision: "approve" | "review" | "block" | null }) {
  if (!decision) return <span className="text-xs text-muted-foreground">Not scanned</span>;
  if (decision === "approve")
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-400">
        <CheckCircle2 className="h-3 w-3" /> Approved
      </span>
    );
  if (decision === "review")
    return (
      <span className="flex items-center gap-1 text-xs text-amber-400">
        <Clock className="h-3 w-3" /> Review
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-xs text-red-400">
      <AlertTriangle className="h-3 w-3" /> Blocked
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: "border-red-500/40 bg-red-500/10 text-red-400",
    high: "border-orange-500/40 bg-orange-500/10 text-orange-400",
    review: "border-amber-500/40 bg-amber-500/10 text-amber-400",
    info: "border-border/50 bg-muted/20 text-muted-foreground",
  };
  return (
    <Badge className={`border text-[10px] font-medium capitalize ${map[severity] ?? map.info}`}>
      {severity}
    </Badge>
  );
}

export default function WorkflowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [workflow, setWorkflow] = useState<WorkflowDetail | null>(null);
  const [sparkline, setSparkline] = useState<SparkPoint[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [latestScanId, setLatestScanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/workflows/${id}`, { credentials: "include" });
      const j = (await res.json()) as {
        workflow?: WorkflowDetail;
        sparkline?: SparkPoint[];
        latestFindings?: Finding[];
        latestScanId?: string | null;
        error?: string;
      };
      if (!res.ok) { setError(j.error ?? "Failed to load"); return; }
      setWorkflow(j.workflow ?? null);
      setSparkline(j.sparkline ?? []);
      setFindings(j.latestFindings ?? []);
      setLatestScanId(j.latestScanId ?? null);
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const autoFixableFindings = findings.filter((f) => f.fix_type === "safe_auto" && f.fix_suggestion);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading workflow…
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="space-y-4 py-8">
        <p className="text-sm text-destructive">{error ?? "Workflow not found."}</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/workflows"><ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back</Link>
        </Button>
      </div>
    );
  }

  const Icon = SOURCE_ICONS[workflow.source] ?? Cable;
  const daysStale = staleDays(workflow.last_scanned_at);
  const isStale = daysStale !== null && daysStale > 7;
  const latestScore = sparkline.length > 0 ? sparkline[sparkline.length - 1].risk_score : workflow.risk_score;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <Link
            href="/workflows"
            className="mb-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Workflows
          </Link>
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{workflow.name}</h1>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <Badge className="border-border/50 bg-muted/30 text-muted-foreground text-[10px] capitalize">
              {workflow.source}
            </Badge>
            {workflow.external_id && (
              <code className="font-mono">{workflow.external_id}</code>
            )}
            <span>Added {timeAgo(workflow.created_at)}</span>
            {isStale && (
              <span className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-400">
                <AlertTriangle className="h-3 w-3" />
                Stale — last scanned {daysStale}d ago
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <DecisionBadge decision={workflow.last_scan_decision} />
          {autoFixableFindings.length > 0 && latestScanId && (
            <Button asChild size="sm" variant="outline" className="h-7 gap-1.5 text-xs border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10">
              <Link href={`/scan/${latestScanId}`}>
                <Wand2 className="h-3 w-3" />
                Fix all auto-fixable ({autoFixableFindings.length})
              </Link>
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={() => void load()}>
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
        </div>
      </div>

      {/* Trust score sparkline */}
      {sparkline.length > 1 && (
        <Card className="border-border/70 bg-card/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Trust Score History</CardTitle>
              {latestScore !== null && (
                <span
                  className={`text-2xl font-semibold tabular-nums ${
                    latestScore >= 80
                      ? "text-emerald-400"
                      : latestScore >= 50
                      ? "text-amber-400"
                      : "text-red-400"
                  }`}
                >
                  {latestScore}
                </span>
              )}
            </div>
            <CardDescription className="text-xs">Last {sparkline.length} scans</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={80}>
              <AreaChart data={sparkline} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="trustGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="created_at" hide />
                <YAxis domain={[0, 100]} hide />
                <ChartTooltip
                  content={({ payload }) => {
                    const p = payload?.[0]?.payload as SparkPoint | undefined;
                    if (!p) return null;
                    return (
                      <div className="rounded-md border border-border/60 bg-card px-2.5 py-1.5 text-xs shadow">
                        <p className="font-semibold">{p.risk_score}</p>
                        <p className="text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="risk_score"
                  stroke="#22d3ee"
                  strokeWidth={1.5}
                  fill="url(#trustGrad)"
                  dot={false}
                  activeDot={{ r: 3, fill: "#22d3ee" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Last scan", value: timeAgo(workflow.last_scanned_at) },
          { label: "Last synced", value: timeAgo(workflow.last_synced_at) },
          { label: "Findings", value: findings.length },
          { label: "Auto-fixable", value: autoFixableFindings.length },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-border/50 bg-card/50 px-4 py-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* Findings */}
      {findings.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Findings</h2>
            <span className="text-xs text-muted-foreground">{findings.length} total</span>
          </div>
          <div className="overflow-hidden rounded-xl border border-border/50">
            {findings.map((f, i) => (
              <div
                key={`${f.ruleId}-${i}`}
                className={`flex flex-wrap items-start justify-between gap-3 bg-card px-4 py-3 ${
                  i !== findings.length - 1 ? "border-b border-border/40" : ""
                }`}
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={f.severity} />
                    <code className="font-mono text-[11px] text-muted-foreground">{f.ruleId}</code>
                  </div>
                  <p className="text-sm">{f.message}</p>
                  {f.path && (
                    <p className="font-mono text-[11px] text-muted-foreground">{f.path}</p>
                  )}
                  {f.fix_suggestion && (
                    <p className="text-[11px] text-cyan-400/80">{f.fix_suggestion}</p>
                  )}
                </div>
                {f.fix_suggestion && latestScanId && (
                  <Button asChild size="sm" variant="outline" className="h-6 gap-1 text-[11px] border-border/50">
                    <Link href={`/scan/${latestScanId}`}>
                      <Wand2 className="h-3 w-3" /> Fix
                    </Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {findings.length === 0 && !loading && (
        <div className="rounded-xl border border-border/30 bg-muted/5 px-6 py-10 text-center">
          <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-400/60" />
          <p className="mt-2 text-sm text-muted-foreground">No findings in the latest scan.</p>
        </div>
      )}

      {/* Governance Timeline link */}
      <Separator className="opacity-40" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Governance Timeline</p>
          <p className="text-xs text-muted-foreground">
            Full decision history for this workflow in the audit log.
          </p>
        </div>
        <Button asChild size="sm" variant="outline" className="h-7 text-xs">
          <Link href={`/audit?q=${encodeURIComponent(workflow.name)}`}>Open in Audit Log</Link>
        </Button>
      </div>

    </div>
  );
}
