/** Domain types aligned with Torqa cloud + CLI JSON (mock / future API). */

export type TrustProfile = "default" | "strict" | "review-heavy" | "enterprise";

export type OrgRole = "owner" | "admin" | "member" | "viewer";

export type ValidationStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "canceled";

export type ValidationSource =
  | "dashboard"
  | "github_action"
  | "api"
  | "cli"
  | "unknown";

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  defaultPolicyId: string | null;
  updatedAt: string;
}

export interface Policy {
  id: string;
  organizationId: string;
  projectId: string | null;
  name: string;
  slug: string;
  trustProfile: TrustProfile;
  failOnWarning: boolean;
  isArchived: boolean;
}

export interface TeamMember {
  userId: string;
  organizationId: string;
  email: string;
  displayName: string;
  role: OrgRole;
  avatarUrl: string | null;
  joinedAt: string;
}

export interface ValidationRunSummary {
  total: number;
  safe: number;
  needsReview: number;
  blocked: number;
}

export interface ValidationRun {
  id: string;
  projectId: string;
  projectName: string;
  policyId: string | null;
  policyName: string | null;
  trustProfile: TrustProfile;
  failOnWarning: boolean;
  source: ValidationSource;
  status: ValidationStatus;
  summary: ValidationRunSummary | null;
  resultOk: boolean | null;
  exitCode: number | null;
  createdAt: string;
  completedAt: string | null;
  /** Mirrors `torqa.cli.scan.v1` / `torqa.cli.validate.v1` when present */
  resultSchema: "torqa.cli.scan.v1" | "torqa.cli.validate.v1" | null;
}

export interface RiskTrendPoint {
  date: string;
  safe: number;
  needsReview: number;
  blocked: number;
}

/** Homepage workflow-scan metrics (Supabase `scan_history` or demo mock). */
export type HomeDashboardMode = "supabase" | "mock";

export type HomeRecentScan = {
  id: string;
  workflowName: string | null;
  source: "n8n" | "generic" | "github" | "ai-agent";
  status: string;
  riskScore: number;
  createdAt: string;
};

/** Counts for first-run checklist on Overview (cloud session only). */
export type HomeOnboardingCounts = {
  integrations: number;
  workflowTemplates: number;
  scanSchedules: number;
  workspacePolicies: number;
  alertDestinations: number;
  /** Org workspace member rows; 0 when not in a shared workspace. */
  organizationMembers: number;
};

export type HomeDashboardData = {
  mode: HomeDashboardMode;
  totalScans30d: number;
  savedReportsAllTime: number;
  /** Average `riskScore` from saved results (null when no scans). */
  avgTrustScore: number | null;
  passCount: number;
  failCount: number;
  reviewCount: number;
  scansThisWeek: number;
  policyFailures30d: number;
  highRiskScans30d: number;
  scheduleSuccessRate30d: number | null;
  topFindingRules: Array<{ ruleId: string; count: number }>;
  recentScans: HomeRecentScan[];
  /** Stacked daily counts: PASS → safe, NEEDS REVIEW → needsReview, FAIL → blocked (chart keys unchanged). */
  outcomeTrend: RiskTrendPoint[];
  /** Populated in cloud mode for onboarding checklist; null in demo / offline. */
  onboarding: HomeOnboardingCounts | null;
};
