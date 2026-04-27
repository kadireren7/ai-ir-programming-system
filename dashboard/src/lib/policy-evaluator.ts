import type { ScanApiSuccess, ScanFinding } from "@/lib/scan-engine";
import type { PolicyEvaluationResult, PolicyThresholdConfig, PolicyViolation } from "@/lib/policy-types";

function hasFinding(
  findings: ScanFinding[],
  predicate: (f: ScanFinding) => boolean
): boolean {
  return findings.some(predicate);
}

function hasCritical(findings: ScanFinding[]): boolean {
  return findings.some((f) => f.severity === "critical");
}

function plaintextSecretFinding(f: ScanFinding): boolean {
  return f.rule_id === "v1.secret.plaintext_detected";
}

function webhookAuthFinding(f: ScanFinding): boolean {
  return f.rule_id === "v1.webhook.public_no_auth" || f.rule_id === "v1.webhook.auth_not_explicit";
}

function tlsBypassFinding(f: ScanFinding): boolean {
  return (
    f.rule_id === "v1.http.tls_verification_disabled" ||
    f.rule_id === "v1.http.plaintext_transport" ||
    f.rule_id === "v1.generic.http_plaintext_url"
  );
}

function errorHandlingFinding(f: ScanFinding): boolean {
  return f.rule_id === "v1.http.missing_error_handling" || f.rule_id === "v1.flow.error_strategy_missing";
}

/**
 * Deterministic governance gate on top of Scan Engine v1 output.
 */
export function evaluateScanAgainstPolicy(
  scan: ScanApiSuccess,
  policyName: string,
  cfg: PolicyThresholdConfig
): PolicyEvaluationResult {
  const violations: PolicyViolation[] = [];
  const recommendations: string[] = [];

  if (scan.riskScore < cfg.minimumTrustScore) {
    violations.push({
      code: "trust_score_below_minimum",
      severity: "error",
      message: `Trust score ${scan.riskScore} is below policy minimum ${cfg.minimumTrustScore}.`,
    });
    recommendations.push("Reduce high/critical findings or remediate review items to raise the trust score.");
  }

  if (cfg.failOnCritical && hasCritical(scan.findings)) {
    violations.push({
      code: "critical_finding_present",
      severity: "error",
      message: "At least one critical-severity finding is present.",
    });
    recommendations.push("Resolve all critical findings before promoting this workflow.");
  }

  if (scan.totals.review > cfg.maxReviewFindings) {
    const sev: "error" | "warning" = cfg.reviewOverflowMode === "fail" ? "error" : "warning";
    violations.push({
      code: "review_findings_cap",
      severity: sev,
      message: `Review-tier findings (${scan.totals.review}) exceed the policy cap (${cfg.maxReviewFindings}).`,
    });
    recommendations.push("Triage review findings or tighten workflow design to stay within the review budget.");
  }

  if (cfg.requireNoPlaintextSecrets && hasFinding(scan.findings, plaintextSecretFinding)) {
    violations.push({
      code: "plaintext_secret",
      severity: "error",
      message: "Plaintext or weakly protected secret material was detected.",
    });
    recommendations.push("Move secrets to a vault or credentials store; remove literals from workflow JSON.");
  }

  if (cfg.requireWebhookAuth && hasFinding(scan.findings, webhookAuthFinding)) {
    violations.push({
      code: "webhook_auth_required",
      severity: "error",
      message: "Webhook exposure or missing explicit authentication was detected.",
    });
    recommendations.push("Require authentication or signatures on webhook entry points.");
  }

  if (cfg.blockTlsBypass && hasFinding(scan.findings, tlsBypassFinding)) {
    violations.push({
      code: "tls_bypass",
      severity: "error",
      message: "TLS verification bypass or insecure transport was detected.",
    });
    recommendations.push("Enable TLS verification and use HTTPS for outbound calls.");
  }

  if (cfg.requireErrorHandling && hasFinding(scan.findings, errorHandlingFinding)) {
    violations.push({
      code: "error_handling_required",
      severity: "error",
      message: "Missing explicit HTTP / workflow error handling was detected.",
    });
    recommendations.push("Add retries, error branches, or workflow-level error handlers.");
  }

  const hasError = violations.some((v) => v.severity === "error");
  const hasWarn = violations.some((v) => v.severity === "warning");
  const policyStatus = hasError ? "FAIL" : hasWarn ? "WARN" : "PASS";

  if (policyStatus === "PASS" && recommendations.length === 0) {
    recommendations.push("Policy gate passed — keep monitoring drift in production.");
  }

  return {
    policyStatus,
    violations,
    appliedPolicyName: policyName,
    recommendations,
  };
}
