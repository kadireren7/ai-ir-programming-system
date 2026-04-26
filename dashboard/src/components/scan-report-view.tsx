"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Layers,
  ListTree,
  Radar,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ScanApiSuccess, ScanDecision, ScanFinding } from "@/lib/scan-engine";
import { cn } from "@/lib/utils";

function decisionBadgeClass(d: ScanDecision): string {
  if (d === "PASS") return "border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300";
  if (d === "NEEDS REVIEW") return "border-amber-500/40 bg-amber-500/15 text-amber-900 dark:text-amber-200";
  return "border-destructive/40 bg-destructive/15 text-destructive";
}

function severityBadgeClass(s: ScanFinding["severity"]): string {
  if (s === "high") return "border-destructive/30 bg-destructive/10 text-destructive";
  if (s === "review") return "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300";
  return "border-border bg-muted text-muted-foreground";
}

function decisionCardAccent(d: ScanDecision): string {
  if (d === "PASS") return "from-emerald-500/20 via-emerald-400/10 to-transparent";
  if (d === "NEEDS REVIEW") return "from-amber-500/25 via-amber-400/10 to-transparent";
  return "from-rose-500/25 via-red-400/10 to-transparent";
}

function DecisionGlyph({ decision }: { decision: ScanDecision }) {
  if (decision === "PASS") {
    return <CheckCircle2 className="h-5 w-5 text-emerald-600/90 dark:text-emerald-400/90" aria-hidden />;
  }
  if (decision === "NEEDS REVIEW") {
    return <AlertTriangle className="h-5 w-5 text-amber-600/90 dark:text-amber-300/90" aria-hidden />;
  }
  return <XCircle className="h-5 w-5 text-rose-600/90 dark:text-rose-400/90" aria-hidden />;
}

function riskBarFillClass(score: number): string {
  if (score >= 72) return "bg-gradient-to-r from-emerald-500 to-teal-400";
  if (score >= 45) return "bg-gradient-to-r from-amber-500 to-orange-400";
  return "bg-gradient-to-r from-rose-600 to-red-500";
}

function RiskScoreBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-3xl font-semibold tabular-nums tracking-tight">{score}</span>
        <span className="text-xs font-medium text-muted-foreground">/ 100</span>
      </div>
      <div
        className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted/80 ring-1 ring-border/60"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Risk score"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none",
            riskBarFillClass(score)
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] leading-snug text-muted-foreground">
        Higher is safer in this preview model (100 = no deductions).
      </p>
    </div>
  );
}

export type ScanReportViewProps = {
  result: ScanApiSuccess;
  /** When false, hides the “Powered by…” banner (e.g. archived report). */
  showPoweredBanner?: boolean;
  /** Optional status line (e.g. “Saved to history”). */
  notice?: string | null;
};

export function ScanReportView({ result, showPoweredBanner = true, notice }: ScanReportViewProps) {
  return (
    <div className="space-y-6 sm:space-y-8">
      {showPoweredBanner && (
        <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/8 via-primary/5 to-transparent px-4 py-3.5 sm:px-5 sm:py-4">
          <p className="text-sm leading-relaxed text-foreground">
            <span className="font-semibold">Powered by server-side scan engine</span>
            <span className="text-muted-foreground">
              {" "}
              — deterministic rules on the server (
              <code className="rounded bg-muted/80 px-1 font-mono text-xs">engine: server-preview</code>). Not the Torqa
              Python CLI.
            </span>
          </p>
        </div>
      )}

      {notice ? (
        <p className="text-center text-xs text-emerald-600 dark:text-emerald-400 sm:text-left">{notice}</p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-md ring-1 ring-black/[0.03] dark:ring-white/[0.06] sm:p-6">
          <div
            className={cn(
              "pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-90",
              decisionCardAccent(result.status)
            )}
          />
          <div className="relative flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Outcome</span>
              <DecisionGlyph decision={result.status} />
            </div>
            <h2 className="text-sm font-medium text-foreground">Decision</h2>
            <Badge variant="outline" className={cn("w-fit text-sm font-semibold", decisionBadgeClass(result.status))}>
              {result.status}
            </Badge>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/12 via-card to-card p-5 shadow-md ring-1 ring-violet-500/10 sm:p-6">
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-violet-500/20 blur-2xl" />
          <div className="relative flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">0–100 (demo)</span>
              <Layers className="h-5 w-5 text-violet-600/90 dark:text-violet-300/90" aria-hidden />
            </div>
            <h2 className="text-sm font-medium text-foreground">Risk score</h2>
            <RiskScoreBar score={result.riskScore} />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-sky-500/25 bg-gradient-to-br from-sky-500/12 via-card to-card p-5 shadow-md ring-1 ring-sky-500/10 sm:p-6">
          <div className="pointer-events-none absolute -bottom-6 left-4 h-20 w-20 rounded-full bg-sky-400/20 blur-2xl" />
          <div className="relative flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rows</span>
              <ListTree className="h-5 w-5 text-sky-600/90 dark:text-sky-300/90" aria-hidden />
            </div>
            <h2 className="text-sm font-medium text-foreground">Findings</h2>
            <p className="text-3xl font-semibold tabular-nums tracking-tight text-sky-950 dark:text-sky-100">
              {result.findings.length}
            </p>
            {(result.totals.high > 0 || result.totals.review > 0 || result.totals.info > 0) && (
              <p className="text-[11px] leading-snug text-muted-foreground">
                {result.totals.high > 0 && <span className="text-destructive">{result.totals.high} high</span>}
                {result.totals.high > 0 && (result.totals.review > 0 || result.totals.info > 0) && " · "}
                {result.totals.review > 0 && (
                  <span className="text-amber-700 dark:text-amber-300">{result.totals.review} review</span>
                )}
                {result.totals.review > 0 && result.totals.info > 0 && " · "}
                {result.totals.info > 0 && <span>{result.totals.info} info</span>}
              </p>
            )}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-fuchsia-500/25 bg-gradient-to-br from-fuchsia-500/12 via-card to-card p-5 shadow-md ring-1 ring-fuchsia-500/10 sm:p-6">
          <div className="pointer-events-none absolute right-6 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full bg-fuchsia-500/15 blur-xl" />
          <div className="relative flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Heuristic source</span>
              <Radar className="h-5 w-5 text-fuchsia-600/90 dark:text-fuchsia-300/90" aria-hidden />
            </div>
            <h2 className="text-sm font-medium text-foreground">Source type</h2>
            <Badge
              variant="secondary"
              className="w-fit border-fuchsia-500/20 bg-fuchsia-500/10 font-medium capitalize text-fuchsia-950 dark:text-fuchsia-100"
            >
              {result.source === "n8n" ? "n8n" : "generic JSON"}
            </Badge>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden border-border/80 shadow-md ring-1 ring-black/5 dark:ring-white/10">
        <CardHeader className="border-b border-border/60 bg-muted/15 px-5 py-5 sm:px-6 sm:py-6">
          <CardTitle className="text-lg font-semibold sm:text-xl">Findings</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            Severity, rule id, target, explanation, and suggested fix.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/60 md:hidden">
            {result.findings.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                No findings for this input under preview rules.
              </p>
            ) : (
              result.findings.map((f, i) => (
                <div key={`${f.rule_id}-${f.target}-${i}-m`} className="space-y-3 px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={cn("font-medium capitalize", severityBadgeClass(f.severity))}>
                      {f.severity}
                    </Badge>
                    <span className="font-mono text-[11px] text-muted-foreground">{f.rule_id}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{f.target}</p>
                  <p className="text-sm leading-relaxed text-foreground/90">{f.explanation}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground/80">Fix: </span>
                    {f.suggested_fix}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[100px] pl-6">Severity</TableHead>
                  <TableHead className="min-w-[140px]">Rule</TableHead>
                  <TableHead className="min-w-[120px]">Target</TableHead>
                  <TableHead className="min-w-[200px]">Explanation</TableHead>
                  <TableHead className="min-w-[200px] pr-6">Suggested fix</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.findings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="px-6 py-10 text-center text-sm text-muted-foreground">
                      No findings for this input under preview rules.
                    </TableCell>
                  </TableRow>
                ) : (
                  result.findings.map((f, i) => (
                    <TableRow key={`${f.rule_id}-${f.target}-${i}`} className="border-border/60">
                      <TableCell className="pl-6 align-top">
                        <Badge variant="outline" className={cn("font-medium capitalize", severityBadgeClass(f.severity))}>
                          {f.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top font-mono text-xs text-muted-foreground">{f.rule_id}</TableCell>
                      <TableCell className="align-top text-sm">{f.target}</TableCell>
                      <TableCell className="align-top text-sm leading-relaxed">{f.explanation}</TableCell>
                      <TableCell className="pr-6 align-top text-sm leading-relaxed text-muted-foreground">
                        {f.suggested_fix}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
