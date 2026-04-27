import type { RiskTrendPoint } from "@/data/types";
import { isScanApiSuccess } from "@/lib/scan-api-guards";
import type { PolicyGateStatus } from "@/lib/policy-types";
import type { ScanApiSuccess, ScanFinding } from "@/lib/scan-engine";
import type {
  InsightsDays,
  InsightsPayload,
  InsightsScanStatus,
  InsightsScope,
  MemberInsightRow,
  PolicyOutcomeRow,
  TopRuleRow,
  TopWorkflowRow,
} from "@/lib/insights-types";

export type RawScanHistoryRow = {
  user_id: string;
  workflow_name: string | null;
  result: unknown;
  created_at: string;
};

function utcDayKey(iso: string): string {
  return iso.slice(0, 10);
}

function labelForUtcDay(day: string): string {
  return new Date(`${day}T12:00:00.000Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function isHighSeverityFinding(f: ScanFinding): boolean {
  return f.severity === "critical" || f.severity === "high";
}

function countCriticalClass(r: ScanApiSuccess): number {
  return r.findings.filter(isHighSeverityFinding).length;
}

function buildTrend(rows: RawScanHistoryRow[], dayKeys: string[]): RiskTrendPoint[] {
  const acc = new Map<string, { safe: number; needsReview: number; blocked: number }>();
  for (const k of dayKeys) {
    acc.set(k, { safe: 0, needsReview: 0, blocked: 0 });
  }
  for (const row of rows) {
    const day = utcDayKey(row.created_at);
    const bucket = acc.get(day);
    if (!bucket || !isScanApiSuccess(row.result)) continue;
    const st = row.result.status;
    if (st === "PASS") bucket.safe += 1;
    else if (st === "FAIL") bucket.blocked += 1;
    else bucket.needsReview += 1;
  }
  return dayKeys.map((k) => {
    const b = acc.get(k)!;
    return { date: labelForUtcDay(k), safe: b.safe, needsReview: b.needsReview, blocked: b.blocked };
  });
}

/** Chart spans the last N UTC days where N = min(selectedDays, 30). */
function trendDayKeys(selectedDays: InsightsDays): string[] {
  const n = Math.min(selectedDays, 30);
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

function trendDirectionFromRows(rows: RawScanHistoryRow[], sinceMs: number): "improving" | "worsening" | "stable" {
  const scored = rows.filter((r) => isScanApiSuccess(r.result) && new Date(r.created_at).getTime() >= sinceMs);
  if (scored.length < 4) return "stable";
  const mid = (sinceMs + Date.now()) / 2;
  let earlySum = 0;
  let earlyN = 0;
  let lateSum = 0;
  let lateN = 0;
  for (const row of scored) {
    const t = new Date(row.created_at).getTime();
    const r = row.result as ScanApiSuccess;
    if (t < mid) {
      earlySum += r.riskScore;
      earlyN += 1;
    } else {
      lateSum += r.riskScore;
      lateN += 1;
    }
  }
  if (earlyN < 1 || lateN < 1) return "stable";
  const delta = lateSum / lateN - earlySum / earlyN;
  if (delta > 2) return "improving";
  if (delta < -2) return "worsening";
  return "stable";
}

export function aggregateInsights(
  rawRows: RawScanHistoryRow[],
  opts: {
    scope: InsightsScope;
    days: InsightsDays;
    status: InsightsScanStatus;
    policyGate: "all" | PolicyGateStatus;
    policyName: string | null;
    sinceIso: string;
    mode: "live" | "demo";
    workspaceRequired?: boolean;
    emailByUserId?: Record<string, string | null>;
  }
): InsightsPayload {
  const {
    scope,
    days,
    status,
    policyGate,
    policyName,
    sinceIso,
    mode,
    workspaceRequired = false,
    emailByUserId = {},
  } = opts;
  const sinceMs = new Date(sinceIso).getTime();

  const inWindow = rawRows.filter((r) => new Date(r.created_at).getTime() >= sinceMs);

  const policyNameOptions = Array.from(
    new Set(
      inWindow
        .map((r) => (isScanApiSuccess(r.result) ? r.result.policyEvaluation?.appliedPolicyName : null))
        .filter((n): n is string => typeof n === "string" && n.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b));

  const filtered: RawScanHistoryRow[] = [];
  for (const row of inWindow) {
    if (!isScanApiSuccess(row.result)) continue;
    const res = row.result;
    if (status !== "all" && res.status !== status) continue;
    const pe = res.policyEvaluation;
    if (policyName) {
      if (!pe || pe.appliedPolicyName !== policyName) continue;
    }
    if (policyGate !== "all") {
      if (!pe || pe.policyStatus !== policyGate) continue;
    }
    filtered.push(row);
  }

  let criticalSum = 0;
  let govFail = 0;
  let trustSum = 0;
  let trustN = 0;
  let policyEvalN = 0;
  let policyFailN = 0;
  const ruleCounts = new Map<string, number>();
  const wfMap = new Map<string, { sum: number; n: number; fails: number }>();
  const policyOutcomeMap = new Map<string, { pass: number; warn: number; fail: number }>();
  const memberMap = new Map<string, { scanCount: number; criticalFindings: number; governanceFails: number }>();

  for (const row of filtered) {
    const res = row.result as ScanApiSuccess;
    criticalSum += countCriticalClass(res);
    if (res.policyEvaluation?.policyStatus === "FAIL") govFail += 1;
    trustSum += res.riskScore;
    trustN += 1;
    if (res.policyEvaluation) {
      policyEvalN += 1;
      if (res.policyEvaluation.policyStatus === "FAIL") policyFailN += 1;
      const pn = res.policyEvaluation.appliedPolicyName;
      const o = policyOutcomeMap.get(pn) ?? { pass: 0, warn: 0, fail: 0 };
      if (res.policyEvaluation.policyStatus === "PASS") o.pass += 1;
      else if (res.policyEvaluation.policyStatus === "WARN") o.warn += 1;
      else o.fail += 1;
      policyOutcomeMap.set(pn, o);
    }
    for (const f of res.findings) {
      if (!isHighSeverityFinding(f)) continue;
      ruleCounts.set(f.rule_id, (ruleCounts.get(f.rule_id) ?? 0) + 1);
    }
    const wn = row.workflow_name?.trim() || "(Unnamed workflow)";
    const w = wfMap.get(wn) ?? { sum: 0, n: 0, fails: 0 };
    w.sum += res.riskScore;
    w.n += 1;
    if (res.status === "FAIL") w.fails += 1;
    wfMap.set(wn, w);

    const m = memberMap.get(row.user_id) ?? { scanCount: 0, criticalFindings: 0, governanceFails: 0 };
    m.scanCount += 1;
    m.criticalFindings += countCriticalClass(res);
    if (res.policyEvaluation?.policyStatus === "FAIL") m.governanceFails += 1;
    memberMap.set(row.user_id, m);
  }

  const topRules: TopRuleRow[] = [...ruleCounts.entries()]
    .map(([ruleId, count]) => ({ ruleId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const topWorkflows: TopWorkflowRow[] = [...wfMap.entries()]
    .map(([name, v]) => ({
      name,
      scanCount: v.n,
      avgTrust: Math.round(v.sum / v.n),
      engineFailRate: v.n > 0 ? Math.round((v.fails / v.n) * 100) : 0,
    }))
    .sort((a, b) => {
      const risk = a.avgTrust - b.avgTrust;
      if (risk !== 0) return risk;
      return b.engineFailRate - a.engineFailRate || b.scanCount - a.scanCount;
    })
    .slice(0, 8);

  const policyOutcomes: PolicyOutcomeRow[] = [...policyOutcomeMap.entries()]
    .map(([policyName, v]) => ({ policyName, ...v }))
    .sort((a, b) => b.fail + b.warn - (a.fail + a.warn));

  const trendKeys = trendDayKeys(days);
  const trend = buildTrend(filtered, trendKeys);

  const memberStats: MemberInsightRow[] = [...memberMap.entries()]
    .map(([userId, v]) => ({
      userId,
      email: emailByUserId[userId] ?? null,
      ...v,
    }))
    .sort(
      (a, b) =>
        b.criticalFindings + b.governanceFails - (a.criticalFindings + a.governanceFails) ||
        b.scanCount - a.scanCount
    );

  return {
    mode,
    workspaceRequired,
    scope,
    days,
    status,
    policyGate,
    policyName,
    totals: {
      totalScans: filtered.length,
      criticalFindingsCaught: criticalSum,
      governanceFailures: govFail,
      avgTrustScore: trustN > 0 ? Math.round(trustSum / trustN) : null,
      policyFailureRate: policyEvalN > 0 ? Math.round((policyFailN / policyEvalN) * 100) : null,
      riskTrendDirection: trendDirectionFromRows(filtered, sinceMs),
    },
    trend,
    topRules,
    topWorkflows,
    policyOutcomes,
    memberStats,
    policyNameOptions,
  };
}
