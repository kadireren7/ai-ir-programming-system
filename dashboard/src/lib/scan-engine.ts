/**
 * Deterministic workflow heuristics for the dashboard scan API.
 * Not the Torqa Python package — same rules as the former client preview, now server-only.
 */

export type ScanSeverity = "info" | "review" | "high";

export type ScanFinding = {
  severity: ScanSeverity;
  rule_id: string;
  target: string;
  explanation: string;
  suggested_fix: string;
};

export type ScanDecision = "PASS" | "NEEDS REVIEW" | "FAIL";

export type ScanSource = "generic" | "n8n";

export type ScanTotals = {
  high: number;
  review: number;
  info: number;
  all: number;
};

/** Successful POST /api/scan JSON body */
export type ScanApiSuccess = {
  status: ScanDecision;
  riskScore: number;
  findings: ScanFinding[];
  totals: ScanTotals;
  engine: "server-preview";
  source: ScanSource;
};

function unwrapN8nDoc(data: Record<string, unknown>): Record<string, unknown> {
  const inner = data.data;
  if (inner && typeof inner === "object" && inner !== null) {
    const d = inner as Record<string, unknown>;
    if (Array.isArray(d.nodes)) return d;
  }
  return data;
}

function isLikelyN8nExport(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const d = unwrapN8nDoc(data as Record<string, unknown>);
  const nodes = d.nodes;
  if (!Array.isArray(nodes) || nodes.length === 0) return false;
  const first = nodes[0];
  if (!first || typeof first !== "object") return false;
  const n = first as Record<string, unknown>;
  return typeof n.type === "string" && typeof n.id === "string" && typeof n.name === "string";
}

function typeLower(t: string): string {
  return t.toLowerCase();
}

function isHttpNode(t: string): boolean {
  const s = typeLower(t);
  return s.includes("httprequest") || s.includes("http request") || s.includes("axios");
}

function isCodeNode(t: string): boolean {
  const s = typeLower(t);
  return s.includes("code") || s.includes("function");
}

function isWebhookish(t: string): boolean {
  return typeLower(t).includes("webhook");
}

function isSlackish(t: string): boolean {
  return typeLower(t).includes("slack");
}

function isEmailish(t: string): boolean {
  const s = typeLower(t);
  return s.includes("email") || s.includes("gmail") || s.includes("sendgrid") || s.includes("mailgun");
}

function hasCredentials(node: Record<string, unknown>): boolean {
  return typeof node.credentials === "object" && node.credentials !== null;
}

function httpMissingErrorHandling(params: unknown): boolean {
  if (!params || typeof params !== "object") return true;
  const p = params as Record<string, unknown>;
  const onError = p.onError;
  const cof = p.continueOnFail;
  const hasOnError = onError !== undefined && onError !== null && String(onError) !== "";
  const hasCof = cof === true;
  return !hasOnError && !hasCof;
}

function riskScoreFromFindings(findings: ScanFinding[]): number {
  let score = 100;
  for (const f of findings) {
    if (f.severity === "high") score -= 18;
    else if (f.severity === "review") score -= 8;
    else score -= 3;
  }
  return Math.max(0, Math.min(100, score));
}

function decisionFrom(findings: ScanFinding[]): ScanDecision {
  if (findings.some((f) => f.severity === "high")) return "FAIL";
  if (findings.some((f) => f.severity === "review")) return "NEEDS REVIEW";
  return "PASS";
}

function analyzeN8n(doc: Record<string, unknown>, active: boolean | null): ScanFinding[] {
  const out: ScanFinding[] = [];
  const nodes = doc.nodes;
  if (!Array.isArray(nodes)) {
    out.push({
      severity: "high",
      rule_id: "preview.n8n.missing_nodes",
      target: "workflow",
      explanation: "Expected an n8n export with a non-empty nodes array.",
      suggested_fix: "Export a single workflow JSON from n8n and try again.",
    });
    return out;
  }

  for (const raw of nodes) {
    if (!raw || typeof raw !== "object") continue;
    const n = raw as Record<string, unknown>;
    if (n.disabled === true) continue;
    const name = typeof n.name === "string" ? n.name : "(unnamed)";
    const typ = typeof n.type === "string" ? n.type : "unknown";
    const id = typeof n.id === "string" ? n.id : "-";
    const target = `${name} (${id})`;

    if (hasCredentials(n)) {
      out.push({
        severity: "review",
        rule_id: "preview.n8n.credentials",
        target,
        explanation: "Node references stored credentials.",
        suggested_fix: "Review credential scope, rotation, and least-privilege access.",
      });
    }
    if (isCodeNode(typ)) {
      out.push({
        severity: "review",
        rule_id: "preview.n8n.code_node",
        target,
        explanation: "Code / Function node can execute arbitrary logic.",
        suggested_fix: "Add review, constrain inputs, and prefer built-in nodes when possible.",
      });
    }
    if (isHttpNode(typ)) {
      if (httpMissingErrorHandling(n.parameters)) {
        out.push({
          severity: "review",
          rule_id: "preview.n8n.http.error_handling",
          target,
          explanation: "HTTP Request node has no explicit onError / continueOnFail in parameters.",
          suggested_fix: "Configure explicit error handling paths for HTTP failures.",
        });
      }
      const p = n.parameters;
      if (p && typeof p === "object") {
        const pr = p as Record<string, unknown>;
        if (pr.allowUnauthorizedCerts === true || pr.ignoreSSLIssues === true) {
          out.push({
            severity: "high",
            rule_id: "preview.n8n.http.tls_relaxed",
            target,
            explanation: "HTTP node appears to relax TLS verification.",
            suggested_fix: "Remove TLS bypass flags for production traffic.",
          });
        }
      }
    }
    if (isWebhookish(typ) && active === true) {
      out.push({
        severity: "review",
        rule_id: "preview.n8n.webhook.active",
        target,
        explanation: "Active workflow exposes a Webhook entrypoint.",
        suggested_fix: "Verify authentication, URL exposure, and environment separation.",
      });
    }
    if (isSlackish(typ)) {
      out.push({
        severity: "review",
        rule_id: "preview.n8n.external_notification",
        target,
        explanation: "Slack node sends external notifications (side effect).",
        suggested_fix: "Ensure approvals/alerts match your incident process.",
      });
    }
    if (isEmailish(typ)) {
      out.push({
        severity: "review",
        rule_id: "preview.n8n.email_side_effect",
        target,
        explanation: "Email / mail provider node can send outbound messages.",
        suggested_fix: "Confirm recipients, templates, and rate limits before production.",
      });
    }
  }

  out.sort((a, b) => {
    const order = (s: ScanSeverity) => (s === "high" ? 0 : s === "review" ? 1 : 2);
    const d = order(a.severity) - order(b.severity);
    if (d !== 0) return d;
    const c = a.rule_id.localeCompare(b.rule_id);
    if (c !== 0) return c;
    return a.target.localeCompare(b.target);
  });

  return out;
}

function analyzeGeneric(data: unknown): ScanFinding[] {
  const out: ScanFinding[] = [];
  if (data === null || typeof data !== "object") {
    out.push({
      severity: "high",
      rule_id: "preview.generic.invalid_json_root",
      target: "json",
      explanation: "Root value is not a JSON object.",
      suggested_fix: "Paste a JSON object (workflow export or Torqa bundle).",
    });
    return out;
  }
  const root = data as Record<string, unknown>;
  if (typeof root.ir_goal === "object" && root.ir_goal !== null) {
    out.push({
      severity: "info",
      rule_id: "preview.generic.ir_goal_detected",
      target: "bundle",
      explanation: "Detected an object with ir_goal — resembles a Torqa bundle.",
      suggested_fix: "Run torqa validate locally for full structural + semantic + policy checks.",
    });
  } else {
    out.push({
      severity: "info",
      rule_id: "preview.generic.no_heuristics",
      target: "json",
      explanation: "Generic JSON has limited heuristics in this server scan (not the full Torqa Python engine).",
      suggested_fix: "Switch source to n8n for workflow-shaped exports, or validate with the Torqa CLI.",
    });
  }
  return out;
}

export function runScanAnalysis(raw: unknown, source: ScanSource): {
  source: ScanSource;
  decision: ScanDecision;
  riskScore: number;
  findings: ScanFinding[];
} {
  const findings: ScanFinding[] = [];
  const looksN8n = isLikelyN8nExport(raw);

  if (source === "n8n") {
    if (!looksN8n) {
      findings.push({
        severity: "high",
        rule_id: "preview.n8n.shape_mismatch",
        target: "workflow",
        explanation: "Source is n8n but JSON does not look like an n8n workflow export.",
        suggested_fix: "Export a workflow JSON from n8n (nodes + connections) or choose Generic JSON.",
      });
    } else {
      const doc = unwrapN8nDoc(raw as Record<string, unknown>);
      const active = typeof doc.active === "boolean" ? doc.active : null;
      findings.push(...analyzeN8n(doc, active));
    }
  } else {
    findings.push(...analyzeGeneric(raw));
    if (looksN8n) {
      findings.push({
        severity: "review",
        rule_id: "preview.generic.n8n_shape_generic_source",
        target: "workflow",
        explanation: "JSON looks like an n8n export, but source is set to Generic JSON.",
        suggested_fix: "Select n8n as the source for richer workflow rules.",
      });
    }
  }

  const riskScore = riskScoreFromFindings(findings);
  const decision = decisionFrom(findings);

  return {
    source,
    decision,
    riskScore,
    findings,
  };
}

export function computeTotals(findings: ScanFinding[]): ScanTotals {
  let high = 0;
  let review = 0;
  let info = 0;
  for (const f of findings) {
    if (f.severity === "high") high += 1;
    else if (f.severity === "review") review += 1;
    else info += 1;
  }
  return { high, review, info, all: findings.length };
}

export function buildScanApiResult(content: unknown, source: ScanSource): ScanApiSuccess {
  const analysis = runScanAnalysis(content, source);
  return {
    status: analysis.decision,
    riskScore: analysis.riskScore,
    findings: analysis.findings,
    totals: computeTotals(analysis.findings),
    engine: "server-preview",
    source: analysis.source,
  };
}
