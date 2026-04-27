import type { RawScanHistoryRow } from "@/lib/insights-aggregate";
import { aggregateInsights } from "@/lib/insights-aggregate";
import type { InsightsDays, InsightsPayload, InsightsScanStatus, InsightsScope } from "@/lib/insights-types";
import type { PolicyGateStatus } from "@/lib/policy-types";
import type { ScanApiSuccess } from "@/lib/scan-engine";

function mkScan(partial: Partial<ScanApiSuccess> & Pick<ScanApiSuccess, "status" | "riskScore">): ScanApiSuccess {
  const findings = partial.findings ?? [];
  let high = 0;
  let review = 0;
  let info = 0;
  for (const f of findings) {
    if (f.severity === "high" || f.severity === "critical") high += 1;
    else if (f.severity === "review") review += 1;
    else info += 1;
  }
  return {
    engine: partial.engine ?? "server-preview",
    source: partial.source ?? "n8n",
    status: partial.status,
    riskScore: partial.riskScore,
    findings,
    totals: { high, review, info, all: findings.length },
    policyEvaluation: partial.policyEvaluation,
  };
}

/** Synthetic rows for demo / offline insights (deterministic). */
export function buildDemoScanRows(): RawScanHistoryRow[] {
  const workflows = ["Billing webhook", "Lead router", "Ops digest", "Data export", "Slack notifier"];
  const users = ["u-demo-1", "u-demo-2", "u-demo-3"];
  const rules = ["v1.http.tls_verification_disabled", "v1.secret.plaintext", "v1.webhook.unauthenticated"];
  const policies = ["Strict security", "Startup baseline", "Agency client-safe"];
  const rows: RawScanHistoryRow[] = [];
  for (let d = 0; d < 88; d++) {
    const created = new Date(Date.now() - d * 86_400_000 - 3_600_000).toISOString();
    const i = d % 5;
    const wf = workflows[i] ?? "Workflow";
    const uid = users[d % 3] ?? "u-demo-1";
    const phase = d / 88;
    const trust = Math.round(52 + phase * 22 + (d % 5) * 3);
    const st = trust < 58 ? "FAIL" : trust < 72 ? "NEEDS REVIEW" : "PASS";
    const findings =
      st === "FAIL"
        ? [
            {
              severity: "high" as const,
              rule_id: rules[d % 3] ?? rules[0],
              target: "HTTP Request",
              explanation: "Demo finding",
              suggested_fix: "Fix",
            },
          ]
        : st === "NEEDS REVIEW"
          ? [
              {
                severity: "review" as const,
                rule_id: "v1.generic.missing_error_handler",
                target: "Node",
                explanation: "Review",
                suggested_fix: "Add",
              },
            ]
          : [];
    const base = mkScan({
      status: st,
      riskScore: trust,
      findings,
    });
    if (d % 4 !== 0) {
      const pname = policies[d % 3] ?? policies[0];
      let gate: "PASS" | "WARN" | "FAIL" = "PASS";
      if (st === "FAIL" && d % 7 === 0) gate = "FAIL";
      else if (st !== "PASS" && d % 5 === 0) gate = "WARN";
      else if (st === "FAIL") gate = "WARN";
      base.policyEvaluation = {
        policyStatus: gate,
        appliedPolicyName: pname,
        violations: [],
        recommendations: [],
      };
    }
    rows.push({
      user_id: uid,
      workflow_name: wf,
      result: base,
      created_at: created,
    });
  }
  return rows;
}

const DEMO_ROWS = buildDemoScanRows();

export function getDemoInsightsPayload(opts: {
  scope: InsightsScope;
  days: InsightsDays;
  status: InsightsScanStatus;
  policyGate: "all" | PolicyGateStatus;
  policyName: string | null;
}): InsightsPayload {
  const since = new Date(Date.now() - opts.days * 86_400_000).toISOString();
  const emails: Record<string, string | null> = {
    "u-demo-1": "alex@example.com",
    "u-demo-2": "sam@example.com",
    "u-demo-3": "jordan@example.com",
  };
  return aggregateInsights(DEMO_ROWS, {
    ...opts,
    sinceIso: since,
    mode: "demo",
    workspaceRequired: false,
    emailByUserId: emails,
  });
}
