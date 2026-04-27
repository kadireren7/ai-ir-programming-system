import type { HomeDashboardData, HomeRecentScan, RiskTrendPoint } from "./types";

function daysAgoIso(n: number): string {
  return new Date(Date.now() - 86_400_000 * n).toISOString();
}

const MOCK_RECENT: HomeRecentScan[] = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    workflowName: "Stripe payout webhook",
    source: "n8n",
    status: "PASS",
    riskScore: 88,
    createdAt: daysAgoIso(0),
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    workflowName: "Lead enrichment v3",
    source: "n8n",
    status: "NEEDS REVIEW",
    riskScore: 71,
    createdAt: daysAgoIso(1),
  },
  {
    id: "00000000-0000-4000-8000-000000000103",
    workflowName: null,
    source: "generic",
    status: "FAIL",
    riskScore: 42,
    createdAt: daysAgoIso(2),
  },
  {
    id: "00000000-0000-4000-8000-000000000104",
    workflowName: "Ops digest",
    source: "n8n",
    status: "PASS",
    riskScore: 92,
    createdAt: daysAgoIso(3),
  },
  {
    id: "00000000-0000-4000-8000-000000000105",
    workflowName: "CRM → warehouse sync",
    source: "n8n",
    status: "NEEDS REVIEW",
    riskScore: 64,
    createdAt: daysAgoIso(4),
  },
];

/** Last 14 days of synthetic scan outcomes for the homepage chart */
const MOCK_OUTCOME_TREND: RiskTrendPoint[] = (() => {
  const out: RiskTrendPoint[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    const phase = (13 - i) / 13;
    const pass = Math.round(4 + phase * 5 + (i % 3));
    const review = Math.round(1 + (i % 2));
    const fail = i % 7 === 0 ? 1 : 0;
    out.push({ date: label, safe: pass, needsReview: review, blocked: fail });
  }
  return out;
})();

export const MOCK_HOME_DASHBOARD: HomeDashboardData = {
  mode: "mock",
  totalScans30d: 38,
  savedReportsAllTime: 54,
  avgTrustScore: 79,
  passCount: 28,
  failCount: 4,
  reviewCount: 10,
  recentScans: MOCK_RECENT,
  outcomeTrend: MOCK_OUTCOME_TREND,
  onboarding: null,
};
