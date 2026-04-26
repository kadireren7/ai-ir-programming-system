import type { ScanApiSuccess } from "@/lib/scan-engine";

export function isScanApiSuccess(data: unknown): data is ScanApiSuccess {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  const t = o.totals;
  if (!t || typeof t !== "object" || Array.isArray(t)) return false;
  const totals = t as Record<string, unknown>;
  const statusOk = o.status === "PASS" || o.status === "NEEDS REVIEW" || o.status === "FAIL";
  const sourceOk = o.source === "n8n" || o.source === "generic";
  return (
    o.engine === "server-preview" &&
    typeof o.riskScore === "number" &&
    Array.isArray(o.findings) &&
    statusOk &&
    sourceOk &&
    typeof totals.high === "number" &&
    typeof totals.review === "number" &&
    typeof totals.info === "number" &&
    typeof totals.all === "number"
  );
}
