"use client";

import { useCallback, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  FileCode2,
  Layers,
  ListTree,
  Radar,
  Shield,
  Sparkles,
  XCircle,
} from "lucide-react";
import { ExportPdfButton } from "@/components/export-pdf-button";
import { ShareScanButton } from "@/components/share-scan-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ScanApiSuccess, ScanDecision, ScanFinding } from "@/lib/scan-engine";
import type { PolicyEvaluationResult, PolicyGateStatus } from "@/lib/policy-types";
import { buildScanRecommendations } from "@/lib/scan-report-recommendations";
import { cn } from "@/lib/utils";

/* ——— Visual tokens (dark-first SaaS security) ——— */

function decisionBadgeClass(d: ScanDecision): string {
  if (d === "PASS") return "border-emerald-500/50 bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20";
  if (d === "NEEDS REVIEW") return "border-amber-500/50 bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/20";
  return "border-rose-500/50 bg-rose-500/10 text-rose-200 ring-1 ring-rose-500/25";
}

function policyGateBadgeClass(s: PolicyGateStatus): string {
  if (s === "PASS") return "border-emerald-500/50 bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20";
  if (s === "WARN") return "border-amber-500/50 bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/20";
  return "border-rose-500/50 bg-rose-500/10 text-rose-200 ring-1 ring-rose-500/25";
}

function severityLabel(s: ScanFinding["severity"]): string {
  if (s === "critical" || s === "high") return "Critical";
  if (s === "review") return "Review";
  return "Info";
}

function severityStyles(s: ScanFinding["severity"]): { badge: string; bar: string } {
  if (s === "critical" || s === "high") {
    return {
      badge:
        "border-rose-500/60 bg-gradient-to-br from-rose-500/25 to-rose-950/40 text-rose-100 shadow-[0_0_20px_-4px_rgba(244,63,94,0.45)] ring-1 ring-rose-400/30",
      bar: "from-rose-600 to-rose-400",
    };
  }
  if (s === "review") {
    return {
      badge:
        "border-amber-500/60 bg-gradient-to-br from-amber-500/20 to-amber-950/30 text-amber-100 shadow-[0_0_16px_-4px_rgba(245,158,11,0.35)] ring-1 ring-amber-400/25",
      bar: "from-amber-600 to-amber-400",
    };
  }
  return {
    badge:
      "border-slate-500/50 bg-gradient-to-br from-slate-500/15 to-slate-950/40 text-slate-200 ring-1 ring-slate-400/20",
    bar: "from-slate-500 to-slate-400",
  };
}

function decisionCardAccent(d: ScanDecision): string {
  if (d === "PASS") return "from-emerald-500/25 via-emerald-500/5 to-transparent";
  if (d === "NEEDS REVIEW") return "from-amber-500/30 via-amber-500/8 to-transparent";
  return "from-rose-500/30 via-rose-600/10 to-transparent";
}

function DecisionGlyph({ decision }: { decision: ScanDecision }) {
  if (decision === "PASS") {
    return <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden />;
  }
  if (decision === "NEEDS REVIEW") {
    return <AlertTriangle className="h-5 w-5 text-amber-400" aria-hidden />;
  }
  return <XCircle className="h-5 w-5 text-rose-400" aria-hidden />;
}

function riskMeterFill(score: number): string {
  if (score >= 72) return "from-emerald-400 via-teal-400 to-cyan-400";
  if (score >= 45) return "from-amber-400 via-orange-400 to-amber-500";
  return "from-rose-500 via-red-500 to-rose-600";
}

function engineModeLabel(result: ScanApiSuccess): string {
  const fallback = result.fallback;
  if (fallback?.fallback_used || result.engine_mode === "fallback_preview") return "Fallback preview";
  if (result.analysis_kind === "real_engine") return "Real engine";
  if (result.analysis_kind === "preview_heuristic" || result.engine_mode === "server_preview") return "Preview analysis";
  return "Unknown engine";
}

function riskLevelLabel(score: number): "low" | "medium" | "high" {
  if (score >= 80) return "low";
  if (score >= 60) return "medium";
  return "high";
}

/** Trust index = same numeric model as riskScore (higher = safer gate posture). */
function TrustIndexVisual({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  const r = 52;
  const c = 2 * Math.PI * r;
  const dash = c * (pct / 100);

  return (
    <div className="relative flex flex-col items-center justify-center py-2">
      <div className="relative h-[140px] w-[140px]">
        <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 120 120" aria-hidden>
          <circle cx="60" cy="60" r={r} fill="none" className="stroke-muted/50" strokeWidth="8" />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            className={cn("transition-[stroke-dasharray] duration-1000 ease-out motion-reduce:transition-none", {
              "stroke-emerald-400/90": pct >= 72,
              "stroke-amber-400/90": pct >= 45 && pct < 72,
              "stroke-rose-500/90": pct < 45,
            })}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <Shield className="mb-1 h-5 w-5 text-muted-foreground/80" aria-hidden />
          <span className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">{pct}</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Trust</span>
        </div>
      </div>
      <div className="mt-4 h-2 w-full max-w-[200px] overflow-hidden rounded-full bg-muted/60 ring-1 ring-black/[0.06] dark:ring-white/10">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-1000 ease-out motion-reduce:transition-none", riskMeterFill(score))}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-3 max-w-[240px] text-center text-xs leading-relaxed text-muted-foreground">
        Composite index from deterministic rules. Higher indicates fewer risk deductions on this scan.
      </p>
    </div>
  );
}

type ShareToolbarProps = {
  scanId: string;
  configured: boolean;
};

function buildPrTemplateMarkdown(result: ScanApiSuccess): string {
  const lines: string[] = [];
  lines.push("## Torqa — remediation checklist");
  lines.push("");
  lines.push(`- **Scan outcome:** ${result.status}`);
  lines.push(`- **Trust index:** ${result.riskScore} (higher is safer)`);
  lines.push(`- **Engine:** ${result.engine} (${result.analysis_kind})`);
  lines.push(`- **Source:** ${result.source}`);
  if (result.policyEvaluation) {
    lines.push(`- **Policy:** ${result.policyEvaluation.policyStatus} — ${result.policyEvaluation.appliedPolicyName ?? "custom"}`);
  }
  lines.push("");
  lines.push("### Findings (check off as you fix)");
  lines.push("");
  const top = result.findings.slice(0, 40);
  if (top.length === 0) {
    lines.push("_No findings in this snapshot._");
  } else {
    for (const f of top) {
      const fix = f.suggested_fix.trim() ? ` — _${f.suggested_fix.trim()}_` : "";
      lines.push(`- [ ] **${f.rule_id}** @ \`${f.target}\`${fix}`);
      lines.push(`  - ${f.explanation}`);
    }
  }
  lines.push("");
  lines.push("### PR description (paste below)");
  lines.push("");
  lines.push(
    `Addresses Torqa ${result.status} (${result.riskScore}/100) on ${result.source} workflow. See checklist above for rule-level fixes.`
  );
  lines.push("");
  lines.push("<!-- Torqa: attach scan JSON or share link for reviewers -->");
  return lines.join("\n");
}

function ExportToolbar({
  result,
  share,
  pdfExportUrl,
  pdfFilename,
}: {
  result: ScanApiSuccess;
  share?: ShareToolbarProps | null;
  /** When set, enables server-side PDF download (same-origin; sends session cookies). */
  pdfExportUrl?: string | null;
  pdfFilename?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [copiedPr, setCopiedPr] = useState(false);

  const copyJson = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [result]);

  const copyPrTemplate = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(buildPrTemplateMarkdown(result));
      setCopiedPr(true);
      window.setTimeout(() => setCopiedPr(false), 2000);
    } catch {
      /* ignore */
    }
  }, [result]);

  const showShare = Boolean(share?.scanId);
  const shareReady = Boolean(share?.configured);
  const pdfReady = Boolean(pdfExportUrl);

  return (
    <div className="flex w-full max-w-xl flex-col gap-3 sm:max-w-none">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
        <Button type="button" variant="outline" size="sm" className="h-9 gap-2 border-border/80 bg-background/60 shadow-sm" onClick={() => void copyJson()}>
          <Copy className="h-3.5 w-3.5" aria-hidden />
          {copied ? "Copied JSON" : "Copy JSON"}
        </Button>
        <Button
          type="button"
          variant="default"
          size="sm"
          className="h-9 gap-2 shadow-sm"
          onClick={() => void copyPrTemplate()}
          title="Markdown checklist + PR blurb for reviewers"
        >
          <FileCode2 className="h-3.5 w-3.5" aria-hidden />
          {copiedPr ? "Copied PR template" : "Copy PR template"}
        </Button>
        {pdfReady && pdfExportUrl ? (
          <ExportPdfButton url={pdfExportUrl} filename={pdfFilename ?? "torqa-scan-report.pdf"} />
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-2 border-border/80 bg-muted/30 text-muted-foreground shadow-sm"
              disabled
              title="PDF export requires a saved scan context (Supabase)."
            >
              <Download className="h-3.5 w-3.5 opacity-70" aria-hidden />
              Export PDF
            </Button>
            <span className="hidden text-[10px] uppercase tracking-wider text-muted-foreground/80 sm:inline">—</span>
          </>
        )}
      </div>

      {showShare && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.06] p-3 sm:p-3.5">
          <p className="text-[11px] font-medium leading-relaxed text-amber-100/95">
            <strong className="font-semibold">Public link:</strong> anyone with a share URL can read this report. Only
            create links for non-sensitive snapshots.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            {shareReady && share ? (
              <ShareScanButton scanId={share.scanId} />
            ) : (
              <p className="text-xs text-muted-foreground">
                Sharing requires Supabase (<code className="rounded bg-muted/60 px-1 font-mono text-[10px]">NEXT_PUBLIC_*</code>{" "}
                keys and migrations).
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RecommendationsPanel({ result }: { result: ScanApiSuccess }) {
  const items = useMemo(() => buildScanRecommendations(result), [result]);

  return (
    <Card className="border-border/60 bg-gradient-to-b from-card to-muted/20 shadow-lg ring-1 ring-black/[0.05] dark:ring-white/[0.06]">
      <CardHeader className="space-y-1 pb-3">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-4 w-4" aria-hidden />
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/90">Guidance</span>
        </div>
        <CardTitle className="text-base font-semibold tracking-tight">Recommendations</CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          Prioritized actions derived from this scan&apos;s outcome and findings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-0 px-4 pb-5 pt-0 sm:px-5">
        <ol className="list-none space-y-0">
          {items.map((text, i) => (
            <li key={i}>
              {i > 0 ? <Separator className="my-3 bg-border/50" /> : null}
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/15 text-[11px] font-bold text-primary">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed text-foreground/90">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function FindingCard({ f }: { f: ScanFinding }) {
  const styles = severityStyles(f.severity);
  const label = severityLabel(f.severity);

  return (
    <details
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/70 bg-card/40 shadow-md backdrop-blur-sm transition-[box-shadow,background-color] open:bg-card/85 open:shadow-lg open:ring-1 open:ring-primary/20",
        "[&_summary::-webkit-details-marker]:hidden"
      )}
    >
      <summary className="cursor-pointer list-none select-none rounded-xl px-4 py-3.5 sm:px-5 sm:py-4">
        <div className="flex items-start gap-3">
          <div className={cn("mt-1 min-h-[40px] w-1 shrink-0 rounded-full bg-gradient-to-b to-transparent", styles.bar)} />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center rounded-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                  styles.badge
                )}
              >
                {label}
              </span>
              <code className="rounded-md bg-muted/80 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">{f.rule_id}</code>
            </div>
            <p className="text-sm font-semibold leading-snug text-foreground">{f.target}</p>
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{f.explanation}</p>
          </div>
          <ChevronDown className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" aria-hidden />
        </div>
      </summary>
      <div className="border-t border-border/50 bg-muted/[0.08] px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
        <div className="space-y-3 sm:pl-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Analysis</p>
            <p className="mt-1 text-sm leading-relaxed text-foreground/95">{f.explanation}</p>
          </div>
          <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/[0.08] p-3 sm:p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/95">Recommended fix</p>
            <p className="mt-1 text-sm leading-relaxed text-emerald-50/95">{f.suggested_fix}</p>
          </div>
        </div>
      </div>
    </details>
  );
}

function PolicyEvaluationPanel({ pe }: { pe: PolicyEvaluationResult }) {
  return (
    <section className="rounded-2xl border border-teal-500/25 bg-gradient-to-br from-teal-500/[0.08] via-card to-card p-5 shadow-lg ring-1 ring-teal-500/10 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Governance</p>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Applied policy</h3>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{pe.appliedPolicyName}</span>
            <span className="mx-2 text-muted-foreground/60">·</span>
            Thresholds evaluated on top of the scan gate above.
          </p>
        </div>
        <Badge variant="outline" className={cn("w-fit shrink-0 font-bold", policyGateBadgeClass(pe.policyStatus))}>
          {pe.policyStatus}
        </Badge>
      </div>

      {pe.violations.length > 0 ? (
        <div className="mt-5 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Violations</p>
          <ul className="space-y-2">
            {pe.violations.map((v, i) => (
              <li
                key={`${v.code}-${i}`}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm",
                  v.severity === "error"
                    ? "border-rose-500/35 bg-rose-500/[0.06] text-rose-100"
                    : "border-amber-500/30 bg-amber-500/[0.06] text-amber-100"
                )}
              >
                <span className="font-mono text-[11px] text-muted-foreground">{v.code}</span>
                <span className="mx-2 text-muted-foreground/50">—</span>
                {v.message}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">No policy violations for this snapshot.</p>
      )}

      {pe.recommendations.length > 0 ? (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recommendations</p>
          <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-foreground/90">
            {pe.recommendations.map((r, i) => (
              <li key={i} className="leading-relaxed">
                {r}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

export type ScanReportViewProps = {
  result: ScanApiSuccess;
  showPoweredBanner?: boolean;
  notice?: string | null;
  /** `shared` tightens copy for public `/share/[shareId]` pages. */
  variant?: "default" | "shared";
  /** When set with a saved scan id, shows share link controls (Supabase-backed). */
  share?: ShareToolbarProps | null;
  /** Same-origin PDF export API path (authenticated or share PDF route). */
  pdfExportUrl?: string | null;
  /** Suggested download filename (e.g. torqa-scan-report-{uuid}.pdf). */
  pdfFilename?: string;
};

export function ScanReportView({
  result,
  showPoweredBanner = true,
  notice,
  variant = "default",
  share,
  pdfExportUrl,
  pdfFilename,
}: ScanReportViewProps) {
  const isShared = variant === "shared";
  const fallbackMeta = result.fallback ?? {
    fallback_used: false,
    fallback_from: null,
    fallback_to: null,
    fallback_reason: null,
  };

  return (
    <div className="space-y-10 sm:space-y-12">
      {/* Top bar: positioning + exports */}
      <div className="flex flex-col gap-4 border-b border-border/50 pb-8 sm:flex-row sm:items-start sm:justify-between sm:pb-10">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {isShared ? "Shared snapshot" : "Scan results"}
            </h2>
            <Badge variant="outline" className={cn("font-semibold", decisionBadgeClass(result.status))}>
              {result.status}
            </Badge>
            <Badge variant="secondary" className="font-medium">
              {engineModeLabel(result)}
            </Badge>
            <Badge variant="secondary" className="font-medium capitalize">
              Risk: {riskLevelLabel(result.riskScore)}
            </Badge>
            {result.policyEvaluation ? (
              <Badge variant="secondary" className="font-medium">
                Policy: {result.policyEvaluation.policyStatus === "WARN" ? "warning" : result.policyEvaluation.policyStatus === "FAIL" ? "fail" : "pass"}
              </Badge>
            ) : (
              <Badge variant="secondary" className="font-medium">
                Policy: review required
              </Badge>
            )}
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {isShared
              ? "Read-only snapshot shared via a public link. Treat the URL like a password — revoke by clearing the share token in the database if needed."
              : "Deterministic security posture for this workflow snapshot. Expand each finding for remediation detail."}
          </p>
        </div>
        <ExportToolbar
          result={result}
          share={isShared ? undefined : share}
          pdfExportUrl={pdfExportUrl ?? null}
          pdfFilename={pdfFilename}
        />
      </div>

      {showPoweredBanner && (
        <div className="rounded-xl border border-primary/25 bg-gradient-to-r from-primary/[0.12] via-primary/5 to-transparent px-4 py-3.5 shadow-inner sm:px-5 sm:py-4">
          <p className="text-sm leading-relaxed text-foreground">
            <span className="font-semibold text-primary/95">Powered by server-side scan engine</span>
            <span className="text-muted-foreground">
              {" "}
              —{" "}
              <code className="rounded bg-muted/80 px-1.5 py-0.5 font-mono text-[11px]">
                engine: {result.engine}
              </code>
              .
              {result.engine === "hosted-python"
                ? " Result from the hosted Torqa Python engine."
                : " Not the Torqa Python CLI."}
            </span>
          </p>
        </div>
      )}
      {fallbackMeta.fallback_used ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.08] px-4 py-3 text-sm text-amber-100">
          Fallback preview was used ({fallbackMeta.fallback_from ?? "unknown"} →{" "}
          {fallbackMeta.fallback_to ?? "fallback_preview"}). Reason:{" "}
          {fallbackMeta.fallback_reason ?? "provider unavailable"}.
        </div>
      ) : null}

      {notice ? (
        <p className="text-center text-sm font-medium text-emerald-400 sm:text-left">{notice}</p>
      ) : null}

      <section className="rounded-xl border border-border/70 bg-muted/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Executive summary</p>
        <p className="mt-2 text-sm text-foreground">
          Outcome <strong>{result.status}</strong> with trust index <strong>{result.riskScore}</strong>. Engine mode:{" "}
          <strong>{engineModeLabel(result)}</strong>.
          {result.policyEvaluation
            ? ` Policy status: ${result.policyEvaluation.policyStatus}.`
            : " Policy status: review required (no policy attached)."}
        </p>
      </section>

      {/* KPI strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-lg ring-1 ring-black/[0.05] dark:ring-white/[0.06] sm:p-6">
          <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-95", decisionCardAccent(result.status))} />
          <div className="relative flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Gate</span>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-foreground">Decision</h3>
              <DecisionGlyph decision={result.status} />
            </div>
            <Badge variant="outline" className={cn("mt-1 w-fit text-xs font-bold", decisionBadgeClass(result.status))}>
              {result.status}
            </Badge>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.12] via-card to-card p-5 shadow-lg ring-1 ring-violet-500/10 sm:p-6">
          <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-violet-500/25 blur-2xl" />
          <div className="relative">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Signal</span>
            <h3 className="mt-1 text-sm font-medium text-foreground">Trust index</h3>
            <TrustIndexVisual score={result.riskScore} />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-500/[0.1] via-card to-card p-5 shadow-lg ring-1 ring-sky-500/10 sm:p-6">
          <div className="pointer-events-none absolute -bottom-8 left-2 h-24 w-24 rounded-full bg-sky-400/20 blur-2xl" />
          <div className="relative flex h-full flex-col">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Surface</span>
            <div className="mt-1 flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">Findings</h3>
              <ListTree className="h-5 w-5 text-sky-400/80" aria-hidden />
            </div>
            <p className="mt-3 text-4xl font-semibold tabular-nums tracking-tight text-sky-100">{result.findings.length}</p>
            <div className="mt-auto flex flex-wrap gap-x-2 gap-y-1 pt-3 text-[11px] text-muted-foreground">
              {result.totals.high > 0 && <span className="text-rose-300">{result.totals.high} critical</span>}
              {result.totals.review > 0 && <span className="text-amber-200">{result.totals.review} review</span>}
              {result.totals.info > 0 && <span className="text-slate-300">{result.totals.info} info</span>}
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/[0.1] via-card to-card p-5 shadow-lg ring-1 ring-fuchsia-500/10 sm:p-6">
          <div className="pointer-events-none absolute right-4 top-1/2 h-20 w-20 -translate-y-1/2 rounded-full bg-fuchsia-500/15 blur-xl" />
          <div className="relative flex h-full flex-col">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Context</span>
            <div className="mt-1 flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">Source</h3>
              <Radar className="h-5 w-5 text-fuchsia-300/80" aria-hidden />
            </div>
            <Badge
              variant="secondary"
              className="mt-4 w-fit border-fuchsia-500/30 bg-fuchsia-500/15 font-semibold capitalize text-fuchsia-100"
            >
              {result.source === "n8n" ? "n8n export" : "Generic JSON"}
            </Badge>
            <p className="mt-auto pt-4 text-xs leading-relaxed text-muted-foreground">
              Heuristics keyed to the selected adapter. Switch source on re-scan if misaligned.
            </p>
          </div>
        </div>
      </div>

      {result.policyEvaluation ? <PolicyEvaluationPanel pe={result.policyEvaluation} /> : null}

      {/* Main + sidebar */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_min(100%,340px)] lg:items-start lg:gap-10">
        <div className="min-w-0 space-y-8">
          <section>
            <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">Security findings</h3>
                <p className="mt-1 text-sm text-muted-foreground">Tap a row to expand analysis and remediation.</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Layers className="h-3.5 w-3.5" aria-hidden />
                <span>{result.findings.length} item{result.findings.length === 1 ? "" : "s"}</span>
              </div>
            </div>

            {result.findings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-muted/10 px-6 py-16 text-center">
                <Shield className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden />
                <p className="mt-4 text-sm font-medium text-foreground">No findings for this input</p>
                <p className="mt-1 text-sm text-muted-foreground">Preview rules did not flag issues on this snapshot.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {result.findings.map((f, i) => (
                  <FindingCard key={`${f.rule_id}-${f.target}-${i}`} f={f} />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <RecommendationsPanel result={result} />
          <p className="mt-4 px-1 text-[11px] leading-relaxed text-muted-foreground/90">
            {result.policyEvaluation
              ? "Engine recommendations (sidebar) are separate from governance policy violations above."
              : "Recommendations are generated from this scan only. Attach a policy on /scan or define workspace policies on /policies."}
          </p>
        </aside>
      </div>
    </div>
  );
}
