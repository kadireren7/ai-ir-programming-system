/** Governance policy evaluation (templates + workspace policies). */

export type PolicyGateStatus = "PASS" | "WARN" | "FAIL";

export type PolicyViolationSeverity = "error" | "warning";

export type PolicyViolation = {
  code: string;
  message: string;
  severity: PolicyViolationSeverity;
};

export type PolicyThresholdConfig = {
  minimumTrustScore: number;
  failOnCritical: boolean;
  maxReviewFindings: number;
  /** When review count exceeds maxReviewFindings: escalate to FAIL vs WARN. */
  reviewOverflowMode: "warn" | "fail";
  requireNoPlaintextSecrets: boolean;
  requireWebhookAuth: boolean;
  requireErrorHandling: boolean;
  blockTlsBypass: boolean;
};

export type PolicyEvaluationResult = {
  policyStatus: PolicyGateStatus;
  violations: PolicyViolation[];
  appliedPolicyName: string;
  recommendations: string[];
};
