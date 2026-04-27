import type { RiskTrendPoint } from "@/data/types";
import type { PolicyGateStatus } from "@/lib/policy-types";

export type InsightsMode = "live" | "demo";

export type InsightsScope = "workspace" | "personal";

export type InsightsDays = 7 | 30 | 90;

export type InsightsScanStatus = "all" | "PASS" | "NEEDS REVIEW" | "FAIL";

export type InsightsTotals = {
  totalScans: number;
  criticalFindingsCaught: number;
  governanceFailures: number;
  avgTrustScore: number | null;
  policyFailureRate: number | null;
  riskTrendDirection: "improving" | "worsening" | "stable";
};

export type TopRuleRow = { ruleId: string; count: number };

export type TopWorkflowRow = {
  name: string;
  scanCount: number;
  avgTrust: number;
  engineFailRate: number;
};

export type PolicyOutcomeRow = {
  policyName: string;
  pass: number;
  warn: number;
  fail: number;
};

export type MemberInsightRow = {
  userId: string;
  email: string | null;
  scanCount: number;
  criticalFindings: number;
  governanceFails: number;
};

export type InsightsPayload = {
  mode: InsightsMode;
  workspaceRequired: boolean;
  scope: InsightsScope;
  days: InsightsDays;
  status: InsightsScanStatus;
  policyGate: "all" | PolicyGateStatus;
  policyName: string | null;
  totals: InsightsTotals;
  trend: RiskTrendPoint[];
  topRules: TopRuleRow[];
  topWorkflows: TopWorkflowRow[];
  policyOutcomes: PolicyOutcomeRow[];
  memberStats: MemberInsightRow[];
  policyNameOptions: string[];
};
