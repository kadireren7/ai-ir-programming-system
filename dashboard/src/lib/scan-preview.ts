/**
 * @deprecated Import from `@/lib/scan-engine` instead.
 * Re-exports kept for any legacy imports; scan runs on the server via POST /api/scan.
 */

import { runScanAnalysis, type ScanDecision, type ScanFinding, type ScanSource } from "./scan-engine";

export type PreviewSeverity = import("./scan-engine").ScanSeverity;
export type PreviewFinding = ScanFinding;
export type PreviewDecision = ScanDecision;
export type PreviewSource = ScanSource;

export type PreviewResult = {
  label: "Dashboard preview analysis";
  source: PreviewSource;
  decision: PreviewDecision;
  risk_score: number;
  findings: PreviewFinding[];
};

/** @deprecated Use POST /api/scan — kept for tests or scripts only */
export function runPreviewScan(raw: unknown, source: PreviewSource): PreviewResult {
  const a = runScanAnalysis(raw, source);
  return {
    label: "Dashboard preview analysis",
    source: a.source,
    decision: a.decision,
    risk_score: a.riskScore,
    findings: a.findings,
  };
}
