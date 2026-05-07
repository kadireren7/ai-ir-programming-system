"use client";

import { useCallback, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  FileCode2,
  GitPullRequest,
  Loader2,
  Shield,
  XCircle,
  Clock,
  TrendingUp,
} from "lucide-react";
import { ExportPdfButton } from "@/components/export-pdf-button";
import { ShareScanButton } from "@/components/share-scan-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { ScanApiSuccess, ScanDecision, ScanFinding } from "@/lib/scan-engine";
import type { PolicyEvaluationResult, PolicyGateStatus } from "@/lib/policy-types";
import { buildScanRecommendations } from "@/lib/scan-report-recommendations";
import { cn } from "@/lib/utils";

/* ─── Types ─────────────────────────────────────────────────── */

export type ScanHistoryEntry = {
  id: string;
  created_at: string;
  status: string;
  riskScore: number;
};

export type GovernanceReportProps = {
  result: ScanApiSuccess;
  workflowName?: string;
  scanId: string;
  createdAt?: string;
  scanHistory?: ScanHistoryEntry[];
  supabaseConfigured?: boolean;
  pdfExportUrl?: string | null;
  pdfFilename?: string;
};

/* ─── Visual tokens ──────────────────────────────────────────── */

const DECISION_MAP: Record<ScanDecision, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  verdict: string;
  banner: string;
  badge: string;
}> = {
  "PASS": {
    label: "Approved",
    icon: CheckCircle2,
    verdict: "Workflow passed all governance checks.",
    banner: "border-emerald-500/30 bg-emerald-500/[0.06]",
    badge: "border-emerald-500/50 bg-emerald-500/10 text-emerald-300",
  },
  "NEEDS REVIEW": {
    label: "Review Required",
    icon: AlertTriangle,
    verdict: "Workflow requires review before approval.",
    banner: "border-amber-500/30 bg-amber-500/[0.06]",
    badge: "border-amber-500/50 bg-amber-500/10 text-amber-200",
  },
  "FAIL": {
    label: "Blocked",
    icon: XCircle,
    verdict: "Workflow failed governance policy and is blocked.",
    banner: "border-rose-500/30 bg-rose-500/[0.07]",
    badge: "border-rose-500/50 bg-rose-500/10 text-rose-200",
  },
};

function policyGateBadge(s: PolicyGateStatus): string {
  if (s === "PASS") return "border-emerald-500/50 bg-emerald-500/10 text-emerald-300";
  if (s === "WARN") return "border-amber-500/50 bg-amber-500/10 text-amber-200";
  return "border-rose-500/50 bg-rose-500/10 text-rose-200";
}

/* ─── Trust Score Gauge ──────────────────────────────────────── */

function TrustGauge({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  const r = 56;
  const c = 2 * Math.PI * r;
  const isHigh = pct >= 72;
  const isMid  = pct >= 45;
  const strokeColor = isHigh ? "#34d399" : isMid ? "#fbbf24" : "#f43f5e";

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-36 w-36">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 128 128" aria-hidden>
          <circle cx="64" cy="64" r={r} fill="none" stroke="currentColor" strokeWidth="9" className="text-muted/40" />
          <circle
            cx="64" cy="64" r={r} fill="none"
            stroke={strokeColor}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${c * (pct / 100)} ${c}`}
            style={{ transition: "stroke-dasharray 1s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Shield className="h-4 w-4 text-muted-foreground/70 mb-0.5" />
          <span className="text-3xl font-bold tabular-nums leading-none" style={{ color: strokeColor }}>{pct}</span>
          <span className="mt-0.5 text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">Trust</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Verdict Banner ─────────────────────────────────────────── */

function VerdictBanner({ result }: { result: ScanApiSuccess }) {
  const meta = DECISION_MAP[result.status] ?? DECISION_MAP["NEEDS REVIEW"];
  const Icon = meta.icon;

  return (
    <div className={cn("rounded-2xl border p-6 sm:p-8", meta.banner)}>
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-10">
        <TrustGauge score={result.riskScore} />
        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <Icon className={cn("h-6 w-6", result.status === "PASS" ? "text-emerald-400" : result.status === "FAIL" ? "text-rose-400" : "text-amber-400")} />
            <span className="text-2xl font-bold tracking-tight">{meta.label}</span>
            <Badge className={cn("text-xs font-bold", meta.badge)}>{result.status}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{meta.verdict}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground sm:justify-start">
            <span><span className="font-semibold text-foreground">{result.findings.length}</span> findings</span>
            {result.totals.high > 0 && <span><span className="font-semibold text-rose-400">{result.totals.high}</span> critical</span>}
            {result.totals.review > 0 && <span><span className="font-semibold text-amber-400">{result.totals.review}</span> review</span>}
            {result.totals.info > 0 && <span><span className="font-semibold text-muted-foreground">{result.totals.info}</span> info</span>}
            <span>Engine: <span className="font-mono text-foreground">{result.engine}</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Findings grouped by severity ──────────────────────────── */

type Group = { label: string; color: string; bar: string; findings: ScanFinding[] };

function buildGroups(findings: ScanFinding[]): Group[] {
  const critical = findings.filter((f) => f.severity === "critical" || f.severity === "high");
  const review   = findings.filter((f) => f.severity === "review");
  const info     = findings.filter((f) => f.severity === "info");
  return [
    { label: "Critical / High", color: "text-rose-400", bar: "bg-rose-500", findings: critical },
    { label: "Review",          color: "text-amber-400", bar: "bg-amber-500", findings: review },
    { label: "Info",            color: "text-slate-400",  bar: "bg-slate-500", findings: info },
  ].filter((g) => g.findings.length > 0);
}

function FindingRow({ f }: { f: ScanFinding }) {
  const isCritical = f.severity === "critical" || f.severity === "high";
  const isReview   = f.severity === "review";
  const barColor   = isCritical ? "bg-rose-500" : isReview ? "bg-amber-500" : "bg-slate-500";

  return (
    <details className="group rounded-lg border border-border/50 bg-card/60 [&_summary::-webkit-details-marker]:hidden">
      <summary className="cursor-pointer list-none select-none px-4 py-3">
        <div className="flex items-start gap-3">
          <div className={cn("mt-1.5 h-3 w-1 shrink-0 rounded-full", barColor)} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded bg-muted/70 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{f.rule_id}</code>
              <span className="text-sm font-medium leading-tight">{f.target}</span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{f.explanation}</p>
          </div>
          <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        </div>
      </summary>
      <div className="border-t border-border/40 bg-muted/[0.06] px-4 pb-4 pt-3">
        <p className="text-sm text-foreground/90">{f.explanation}</p>
        {f.suggested_fix && (
          <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.07] p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Fix</p>
            <p className="mt-1 text-sm text-emerald-50/90">{f.suggested_fix}</p>
          </div>
        )}
      </div>
    </details>
  );
}

function FindingsBySeverity({ findings }: { findings: ScanFinding[] }) {
  const groups = useMemo(() => buildGroups(findings), [findings]);

  if (findings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 py-12 text-center">
        <Shield className="mx-auto h-8 w-8 text-muted-foreground/40" />
        <p className="mt-3 text-sm font-medium">No findings</p>
        <p className="mt-1 text-xs text-muted-foreground">No issues flagged on this snapshot.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.label}>
          <div className="mb-3 flex items-center gap-2">
            <span className={cn("text-xs font-bold uppercase tracking-wider", g.color)}>{g.label}</span>
            <span className="rounded-full bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground">{g.findings.length}</span>
            <div className="h-px flex-1 bg-border/40" />
          </div>
          <div className="space-y-2">
            {g.findings.map((f, i) => <FindingRow key={`${f.rule_id}-${i}`} f={f} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Policy Pack Panel ──────────────────────────────────────── */

function PolicyPanel({ pe }: { pe: PolicyEvaluationResult }) {
  return (
    <div className="rounded-xl border border-teal-500/20 bg-teal-500/[0.05] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Policy Pack</p>
          <p className="mt-0.5 text-sm font-semibold">{pe.appliedPolicyName ?? "Custom policy"}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Thresholds evaluated on top of the scan gate.</p>
        </div>
        <Badge className={cn("shrink-0 font-bold", policyGateBadge(pe.policyStatus))}>{pe.policyStatus}</Badge>
      </div>
      {pe.violations.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Violations</p>
          {pe.violations.map((v, i) => (
            <div key={i} className={cn("rounded-lg border px-3 py-2 text-sm",
              v.severity === "error"
                ? "border-rose-500/30 bg-rose-500/5 text-rose-100"
                : "border-amber-500/25 bg-amber-500/5 text-amber-100"
            )}>
              <span className="font-mono text-[11px] text-muted-foreground">{v.code}</span>
              <span className="mx-2 text-muted-foreground/50">—</span>
              {v.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Scan History Timeline ──────────────────────────────────── */

function ScanTimeline({ entries, currentId }: { entries: ScanHistoryEntry[]; currentId: string }) {
  if (entries.length <= 1) return null;

  return (
    <div className="rounded-xl border border-border/50 p-5">
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-semibold">Scan history for this workflow</p>
        <span className="rounded-full bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground">{entries.length}</span>
      </div>
      <div className="space-y-2">
        {entries.map((e) => {
          const isCurrent = e.id === currentId;
          const isPass = e.status === "PASS";
          const isFail = e.status === "FAIL";
          const scoreColor = e.riskScore >= 72 ? "text-emerald-400" : e.riskScore >= 45 ? "text-amber-400" : "text-rose-400";

          return (
            <div
              key={e.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-2.5",
                isCurrent ? "border-primary/30 bg-primary/5" : "border-border/40 bg-card/40"
              )}
            >
              <div className={cn("h-2 w-2 shrink-0 rounded-full", isPass ? "bg-emerald-400" : isFail ? "bg-rose-400" : "bg-amber-400")} />
              <span className={cn("w-14 text-right font-mono text-sm font-semibold tabular-nums", scoreColor)}>{e.riskScore}</span>
              <span className="flex-1 text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
              <span className="text-[10px] text-muted-foreground">{e.status}</span>
              {isCurrent ? (
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">current</span>
              ) : (
                <a href={`/scan/${e.id}`} className="text-[10px] text-primary hover:underline">view</a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Export Toolbar ─────────────────────────────────────────── */

function buildPrMarkdown(result: ScanApiSuccess): string {
  const lines = [
    "## Torqa — remediation checklist",
    "",
    `- **Outcome:** ${result.status}`,
    `- **Trust index:** ${result.riskScore}/100`,
    `- **Engine:** ${result.engine}`,
    "",
    "### Findings",
    "",
  ];
  if (result.findings.length === 0) {
    lines.push("_No findings._");
  } else {
    for (const f of result.findings.slice(0, 40)) {
      lines.push(`- [ ] **${f.rule_id}** @ \`${f.target}\` — ${f.explanation}`);
      if (f.suggested_fix) lines.push(`  - Fix: ${f.suggested_fix}`);
    }
  }
  return lines.join("\n");
}

function GithubIssueButton({ scanId }: { scanId: string }) {
  const [open, setOpen] = useState(false);
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ url: string; number: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = useCallback(async () => {
    if (!owner.trim() || !repo.trim()) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/fixes/github-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId, repoOwner: owner.trim(), repoName: repo.trim() }),
      });
      const data = await res.json() as { ok?: boolean; issueUrl?: string; issueNumber?: number; error?: string };
      if (!res.ok || !data.ok) {
        setErr(data.error ?? "Failed to create issue");
      } else {
        setResult({ url: data.issueUrl!, number: data.issueNumber! });
      }
    } catch {
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  }, [scanId, owner, repo]);

  if (!open) {
    return (
      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setOpen(true)}>
        <GitPullRequest className="h-3 w-3" />
        GitHub Issue
      </Button>
    );
  }

  if (result) {
    return (
      <a
        href={result.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20"
      >
        <GitPullRequest className="h-3 w-3" />
        Issue #{result.number} created ↗
      </a>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="text"
        placeholder="owner"
        value={owner}
        onChange={(e) => setOwner(e.target.value)}
        className="h-8 w-24 rounded-md border border-border/60 bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <span className="text-muted-foreground text-xs">/</span>
      <input
        type="text"
        placeholder="repo"
        value={repo}
        onChange={(e) => setRepo(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
        className="h-8 w-28 rounded-md border border-border/60 bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <Button size="sm" className="h-8 gap-1 text-xs" onClick={() => void submit()} disabled={loading || !owner || !repo}>
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <GitPullRequest className="h-3 w-3" />}
        {loading ? "Creating…" : "Open"}
      </Button>
      <button type="button" onClick={() => { setOpen(false); setErr(null); }} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
      {err && <span className="text-xs text-rose-400">{err}</span>}
    </div>
  );
}

function ExportToolbar({ result, scanId, pdfExportUrl, pdfFilename, supabaseConfigured }: {
  result: ScanApiSuccess;
  scanId: string;
  pdfExportUrl?: string | null;
  pdfFilename?: string;
  supabaseConfigured?: boolean;
}) {
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedPr, setCopiedPr]     = useState(false);

  const copyJson = useCallback(async () => {
    await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  }, [result]);

  const copyPr = useCallback(async () => {
    await navigator.clipboard.writeText(buildPrMarkdown(result));
    setCopiedPr(true);
    setTimeout(() => setCopiedPr(false), 2000);
  }, [result]);

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => void copyJson()}>
        <Copy className="h-3 w-3" />
        {copiedJson ? "Copied" : "Copy JSON"}
      </Button>
      <Button variant="default" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => void copyPr()}>
        <FileCode2 className="h-3 w-3" />
        {copiedPr ? "Copied PR template" : "PR template"}
      </Button>
      {pdfExportUrl ? (
        <ExportPdfButton url={pdfExportUrl} filename={pdfFilename ?? "torqa-governance-report.pdf"} />
      ) : (
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground" disabled>
          <Download className="h-3 w-3" />
          Export PDF
        </Button>
      )}
      {supabaseConfigured && <GithubIssueButton scanId={scanId} />}
      {supabaseConfigured && (
        <ShareScanButton scanId={scanId} />
      )}
    </div>
  );
}

/* ─── Recommendations ────────────────────────────────────────── */

function RecommendationsPanel({ result }: { result: ScanApiSuccess }) {
  const items = useMemo(() => buildScanRecommendations(result), [result]);
  return (
    <div className="rounded-xl border border-border/50 bg-card p-5">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Recommendations</p>
      <ol className="space-y-3">
        {items.map((text, i) => (
          <li key={i}>
            {i > 0 && <Separator className="mb-3 bg-border/40" />}
            <div className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/15 text-[10px] font-bold text-primary">{i + 1}</span>
              <p className="text-sm leading-relaxed text-foreground/90">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ─── GovernanceReport (main export) ────────────────────────── */

export function GovernanceReport({
  result,
  workflowName,
  scanId,
  createdAt,
  scanHistory = [],
  supabaseConfigured,
  pdfExportUrl,
  pdfFilename,
}: GovernanceReportProps) {
  return (
    <div className="space-y-8">
      {/* Verdict banner */}
      <VerdictBanner result={result} />

      {/* Meta row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {workflowName && <span className="font-medium text-foreground">{workflowName}</span>}
          <Badge variant="secondary" className="capitalize">{result.source}</Badge>
          {createdAt && <span><Clock className="mr-1 inline h-3 w-3" />{new Date(createdAt).toLocaleString()}</span>}
          <span className="font-mono text-[10px]">{scanId}</span>
        </div>
        <ExportToolbar
          result={result}
          scanId={scanId}
          pdfExportUrl={pdfExportUrl}
          pdfFilename={pdfFilename}
          supabaseConfigured={supabaseConfigured}
        />
      </div>

      {/* Policy pack */}
      {result.policyEvaluation && <PolicyPanel pe={result.policyEvaluation} />}

      {/* Main content + sidebar */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="space-y-6">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <p className="text-sm font-semibold">Security findings</p>
              <span className="text-xs text-muted-foreground">{result.findings.length} total</span>
            </div>
            <FindingsBySeverity findings={result.findings} />
          </div>

          <ScanTimeline entries={scanHistory} currentId={scanId} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <RecommendationsPanel result={result} />
        </aside>
      </div>
    </div>
  );
}
