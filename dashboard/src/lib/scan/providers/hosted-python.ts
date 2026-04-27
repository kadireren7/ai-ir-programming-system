import {
  buildScanApiResult,
  computeTotals,
  decisionFrom,
  riskScoreFromFindings,
  type ScanApiSuccess,
  type ScanDecision,
  type ScanFinding,
  type ScanSeverity,
  type ScanSource,
} from "@/lib/scan-engine";
import type { ScanProvider, ScanProviderInput } from "./types";

const DEFAULT_TIMEOUT_MS = 25_000;

function trimBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, "");
}

function isScanDecision(v: unknown): v is ScanDecision {
  return v === "PASS" || v === "NEEDS REVIEW" || v === "FAIL";
}

function isScanSeverity(v: unknown): v is ScanSeverity {
  return v === "info" || v === "review" || v === "high" || v === "critical";
}

function isScanSource(v: unknown): v is ScanSource {
  return v === "generic" || v === "n8n";
}

/**
 * Parses Torqa engine HTTP JSON into {@link ScanApiSuccess}.
 * Accepts the dashboard contract (snake_case fields) or omits `engine` (filled as hosted-python).
 * If `totals` is missing, derives from `findings`.
 */
function mapRemoteScanToScanApiSuccess(
  body: unknown,
  fallbackSource: ScanSource
): ScanApiSuccess | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;

  const findingsRaw = o.findings;
  if (!Array.isArray(findingsRaw)) return null;

  const findings: ScanFinding[] = [];
  for (const item of findingsRaw) {
    if (!item || typeof item !== "object") return null;
    const f = item as Record<string, unknown>;
    const severity = f.severity;
    const ruleId = f.rule_id ?? f.ruleId;
    const target = f.target;
    const explanation = f.explanation;
    const suggestedFix = f.suggested_fix ?? f.suggestedFix ?? "";
    if (
      !isScanSeverity(severity) ||
      typeof ruleId !== "string" ||
      typeof target !== "string" ||
      typeof explanation !== "string" ||
      typeof suggestedFix !== "string"
    ) {
      return null;
    }
    findings.push({
      severity,
      rule_id: ruleId,
      target,
      explanation,
      suggested_fix: suggestedFix,
    });
  }

  const source = isScanSource(o.source) ? o.source : fallbackSource;

  let status: ScanDecision;
  if (isScanDecision(o.status)) status = o.status;
  else if (isScanDecision(o.decision)) status = o.decision;
  else status = decisionFrom(findings);

  let riskScore: number;
  if (typeof o.riskScore === "number" && Number.isFinite(o.riskScore)) {
    riskScore = Math.max(0, Math.min(100, o.riskScore));
  } else {
    riskScore = riskScoreFromFindings(findings);
  }

  let totals;
  const t = o.totals;
  if (t && typeof t === "object" && !Array.isArray(t)) {
    const tr = t as Record<string, unknown>;
    if (
      typeof tr.high === "number" &&
      typeof tr.review === "number" &&
      typeof tr.info === "number" &&
      typeof tr.all === "number"
    ) {
      totals = { high: tr.high, review: tr.review, info: tr.info, all: tr.all };
    }
  }
  if (!totals) totals = computeTotals(findings);

  return {
    status,
    riskScore,
    findings,
    totals,
    engine: "hosted-python",
    source,
  };
}

async function fetchHostedScan(
  baseUrl: string,
  input: ScanProviderInput,
  timeoutMs: number
): Promise<ScanApiSuccess | null> {
  const url = `${trimBaseUrl(baseUrl)}/scan`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ source: input.source, content: input.content }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      return null;
    }
    return mapRemoteScanToScanApiSuccess(json, input.source);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Calls `TORQA_ENGINE_URL` + `/scan` with `{ source, content }`, maps JSON to {@link ScanApiSuccess}.
 * On missing URL, network errors, timeouts, non-2xx, or invalid payload: falls back to {@link buildScanApiResult}
 * (same behavior as `server-preview`) so `/scan` stays usable.
 */
export const hostedPythonProvider: ScanProvider = {
  id: "hosted-python",
  label: "Hosted Torqa Python engine (HTTP)",
  async scan(input: ScanProviderInput): Promise<ScanApiSuccess> {
    const base = process.env.TORQA_ENGINE_URL?.trim();
    if (!base) {
      return buildScanApiResult(input.content, input.source);
    }

    const remote = await fetchHostedScan(base, input, DEFAULT_TIMEOUT_MS);
    if (remote) return remote;

    return buildScanApiResult(input.content, input.source);
  },
};
