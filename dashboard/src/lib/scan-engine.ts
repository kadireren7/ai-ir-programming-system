/**
 * Deterministic Scan Engine v1 for workflow security analysis.
 * Produces production-style, explainable findings with no randomness.
 */

import type { PolicyEvaluationResult } from "@/lib/policy-types";

export type ScanSeverity = "info" | "review" | "high" | "critical";

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

/** Discriminator for which backend produced a successful POST /api/scan response */
export type ScanApiEngineId = "server-preview" | "server-v1" | "hosted-python";

/** Successful POST /api/scan JSON body */
export type ScanApiSuccess = {
  status: ScanDecision;
  riskScore: number;
  findings: ScanFinding[];
  totals: ScanTotals;
  engine: ScanApiEngineId;
  source: ScanSource;
  /** Present when a governance policy was applied to this scan response. */
  policyEvaluation?: PolicyEvaluationResult;
};

type N8nNode = {
  id: string;
  name: string;
  type: string;
  parameters: Record<string, unknown>;
  credentials: Record<string, unknown> | null;
  disabled: boolean;
};

type TraversedPair = { keyPath: string; value: string };

const SECRET_KEY_PATTERN = /(api[-_]?key|token|secret|password|bearer|authorization)/i;
const MASKED_VALUE_PATTERN = /(\*{3,}|<redacted>|<hidden>|xxxxx|your[_-]?(token|key|secret)|changeme)/i;
const EXPR_VALUE_PATTERN = /(\{\{.+\}\}|\$\{.+\}|<%.*%>)/;
const SIDE_EFFECT_TYPE_PATTERN = /(slack|email|gmail|sendgrid|mailgun|discord|telegram|twilio|smtp)/i;
const HTTP_TYPE_PATTERN = /(http.?request|axios)/i;
const WEBHOOK_TYPE_PATTERN = /(webhook|http.?trigger)/i;
const TRIGGER_TYPE_PATTERN = /(trigger|webhook|cron|schedule|manualtrigger|start)/i;
const PRIVILEGED_INTEGRATION_PATTERN = /(github|gitlab|notion|jira|stripe|aws|gcp|azure|postgres|mysql|mongodb|slack|twilio|sendgrid)/i;
const LOW_PRIVILEGE_NODE_PATTERN = /(set|if|switch|merge|code|function|wait|no.?op|sticky|note)/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toStringSafe(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function pushFinding(
  out: ScanFinding[],
  severity: ScanSeverity,
  rule_id: string,
  target: string,
  explanation: string,
  suggested_fix: string
) {
  out.push({ severity, rule_id, target, explanation, suggested_fix });
}

function normalizeNode(raw: unknown): N8nNode | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === "string" ? raw.id : "";
  const name = typeof raw.name === "string" ? raw.name : "(unnamed)";
  const type = typeof raw.type === "string" ? raw.type : "unknown";
  const parameters = isRecord(raw.parameters) ? raw.parameters : {};
  const credentials = isRecord(raw.credentials) ? raw.credentials : null;
  return {
    id: id || name,
    name,
    type,
    parameters,
    credentials,
    disabled: raw.disabled === true,
  };
}

function unwrapN8nDoc(data: Record<string, unknown>): Record<string, unknown> {
  const inner = data.data;
  if (isRecord(inner) && Array.isArray(inner.nodes)) return inner;
  return data;
}

function isLikelyN8nExport(data: unknown): boolean {
  if (!isRecord(data)) return false;
  const doc = unwrapN8nDoc(data);
  const nodes = doc.nodes;
  if (!Array.isArray(nodes) || nodes.length === 0) return false;
  const first = normalizeNode(nodes[0]);
  return Boolean(first && first.type !== "unknown");
}

function looksPlaintextSecret(value: string): boolean {
  const v = value.trim();
  if (!v || v.length < 6) return false;
  if (MASKED_VALUE_PATTERN.test(v)) return false;
  if (EXPR_VALUE_PATTERN.test(v)) return false;
  if (/^(true|false|null|undefined)$/i.test(v)) return false;
  if (/^[a-z]+:\/\/\S+$/i.test(v)) return false;
  return true;
}

function traverseKeyValuePairs(
  value: unknown,
  basePath: string,
  out: TraversedPair[],
  depth = 0
): void {
  if (depth > 8) return;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      traverseKeyValuePairs(value[i], `${basePath}[${i}]`, out, depth + 1);
    }
    return;
  }
  if (!isRecord(value)) return;
  for (const [k, v] of Object.entries(value)) {
    const next = basePath ? `${basePath}.${k}` : k;
    const stringValue = toStringSafe(v);
    if (stringValue !== null) {
      out.push({ keyPath: next, value: stringValue });
    } else {
      traverseKeyValuePairs(v, next, out, depth + 1);
    }
  }
}

function detectSecretsFromObject(out: ScanFinding[], scope: string, obj: unknown): void {
  const pairs: TraversedPair[] = [];
  traverseKeyValuePairs(obj, "", pairs);
  const seen = new Set<string>();
  for (const pair of pairs) {
    const keyName = pair.keyPath.split(".").pop() ?? pair.keyPath;
    if (!SECRET_KEY_PATTERN.test(keyName)) continue;
    if (!looksPlaintextSecret(pair.value)) continue;
    const dedupe = `${pair.keyPath}:${pair.value.slice(0, 20)}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    pushFinding(
      out,
      "critical",
      "v1.secret.plaintext_detected",
      `${scope}.${pair.keyPath}`,
      `Potential plaintext secret detected in "${pair.keyPath}" with a sensitive key name and non-masked value.`,
      "Move secrets to credential managers or environment variables, and reference them dynamically instead of hardcoding."
    );
  }
}

function nodeTypeMatches(node: N8nNode, pattern: RegExp): boolean {
  return pattern.test(node.type.toLowerCase());
}

function getNodeTarget(node: N8nNode): string {
  return `${node.name} (${node.id})`;
}

function getConnectionAdjacency(doc: Record<string, unknown>, nodes: N8nNode[]): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>();
  for (const n of nodes) adjacency.set(n.name, new Set());
  const connections = isRecord(doc.connections) ? doc.connections : {};
  for (const [fromName, toBlob] of Object.entries(connections)) {
    if (!isRecord(toBlob)) continue;
    const set = adjacency.get(fromName) ?? new Set<string>();
    for (const outputs of Object.values(toBlob)) {
      if (!Array.isArray(outputs)) continue;
      for (const output of outputs) {
        if (!Array.isArray(output)) continue;
        for (const link of output) {
          if (!isRecord(link)) continue;
          const target = typeof link.node === "string" ? link.node : null;
          if (target) set.add(target);
        }
      }
    }
    adjacency.set(fromName, set);
  }
  return adjacency;
}

function hasWebhookAuth(params: Record<string, unknown>): boolean {
  const authKeys = ["auth", "authentication", "httpAuth", "headerAuth", "basicAuth", "apiKeyAuth"];
  return authKeys.some((k) => {
    const v = params[k];
    if (v === true) return true;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      return Boolean(s) && s !== "none" && s !== "false" && s !== "off";
    }
    return isRecord(v);
  });
}

function getNodeUrlCandidate(node: N8nNode): string | null {
  const urlKeys = ["url", "uri", "endpoint", "baseUrl", "baseURL", "webhookUrl"];
  for (const key of urlKeys) {
    const v = node.parameters[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function isPrivateHostUrl(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".local") ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    );
  } catch {
    return false;
  }
}

function detectCycle(adjacency: Map<string, Set<string>>): boolean {
  const temp = new Set<string>();
  const perm = new Set<string>();
  const visit = (node: string): boolean => {
    if (perm.has(node)) return false;
    if (temp.has(node)) return true;
    temp.add(node);
    for (const next of adjacency.get(node) ?? []) {
      if (visit(next)) return true;
    }
    temp.delete(node);
    perm.add(node);
    return false;
  };
  for (const n of adjacency.keys()) {
    if (visit(n)) return true;
  }
  return false;
}

function analyzeN8n(doc: Record<string, unknown>): ScanFinding[] {
  const out: ScanFinding[] = [];
  const rawNodes = Array.isArray(doc.nodes) ? doc.nodes : [];
  const nodes = rawNodes.map(normalizeNode).filter((n): n is N8nNode => Boolean(n && !n.disabled));
  if (nodes.length === 0) {
    pushFinding(
      out,
      "critical",
      "v1.n8n.missing_nodes",
      "workflow",
      "n8n source selected but no active nodes were found in the export.",
      "Export a full n8n workflow JSON containing active nodes and connections."
    );
    return out;
  }

  const byName = new Map(nodes.map((n) => [n.name, n] as const));
  const adjacency = getConnectionAdjacency(doc, nodes);

  const webhookNodes = nodes.filter((n) => nodeTypeMatches(n, WEBHOOK_TYPE_PATTERN));
  const httpNodes = nodes.filter((n) => nodeTypeMatches(n, HTTP_TYPE_PATTERN));
  const sideEffectNodes = nodes.filter((n) => nodeTypeMatches(n, SIDE_EFFECT_TYPE_PATTERN));
  for (const node of nodes) {
    detectSecretsFromObject(out, getNodeTarget(node), node.parameters);
    if (node.credentials) detectSecretsFromObject(out, `${getNodeTarget(node)}.credentials`, node.credentials);
  }

  for (const node of webhookNodes) {
    const target = getNodeTarget(node);
    const hasAuth = hasWebhookAuth(node.parameters);
    const path = toStringSafe(node.parameters.path) ?? "";
    const noAuthAndPublicPath = !hasAuth && (!!path || path === "");
    if (noAuthAndPublicPath) {
      pushFinding(
        out,
        "critical",
        "v1.webhook.public_no_auth",
        target,
        "Webhook trigger appears publicly exposed without authentication controls.",
        "Require authentication/signature validation on webhook triggers and restrict endpoint exposure by environment."
      );
    } else if (!hasAuth) {
      pushFinding(
        out,
        "review",
        "v1.webhook.auth_not_explicit",
        target,
        "Webhook trigger does not show explicit auth configuration.",
        "Set webhook authentication explicitly and validate that only trusted senders can invoke the endpoint."
      );
    }
  }

  for (const node of httpNodes) {
    const target = getNodeTarget(node);
    const p = node.parameters;
    const url = getNodeUrlCandidate(node);
    const methodRaw = toStringSafe(p.method) ?? "GET";
    const method = methodRaw.toUpperCase();

    if (p.allowUnauthorizedCerts === true || p.ignoreSSLIssues === true || p.rejectUnauthorized === false) {
      pushFinding(
        out,
        "critical",
        "v1.http.tls_verification_disabled",
        target,
        "HTTP request disables TLS certificate validation.",
        "Enable TLS verification (`rejectUnauthorized=true`) and remove insecure SSL bypass flags."
      );
    }

    if (typeof url === "string" && /^http:\/\//i.test(url)) {
      pushFinding(
        out,
        "critical",
        "v1.http.plaintext_transport",
        target,
        "HTTP request uses plaintext transport (http://), which can leak credentials or payload data.",
        "Use HTTPS endpoints only and enforce transport security for all outbound requests."
      );
    }

    if (url && !isPrivateHostUrl(url) && ["DELETE", "PUT", "PATCH", "POST"].includes(method)) {
      pushFinding(
        out,
        "review",
        "v1.http.side_effect_unknown_domain",
        target,
        `Potential side-effect HTTP method (${method}) is targeting a non-local endpoint.`,
        "Restrict outbound domains using an allowlist and gate side-effect actions behind approval/validation rules."
      );
    }

    const hasErrorHandling =
      p.continueOnFail === true ||
      p.retryOnFail === true ||
      (typeof p.onError === "string" && p.onError.trim().length > 0);
    if (!hasErrorHandling) {
      pushFinding(
        out,
        "review",
        "v1.http.missing_error_handling",
        target,
        "External HTTP request has no explicit retry/error path configuration.",
        "Add retry logic and explicit failure branching to avoid silent drops or partial workflow execution."
      );
    }
  }

  if (httpNodes.length > 0) {
    const hasWorkflowErrorHint = nodes.some((n) => {
      const t = n.type.toLowerCase();
      return t.includes("error") || t.includes("catch");
    });
    if (!hasWorkflowErrorHint) {
      pushFinding(
        out,
        "review",
        "v1.flow.error_strategy_missing",
        "workflow",
        "Workflow performs external requests but no global error/recovery branch is apparent.",
        "Add centralized error handling paths (dead-letter, retries, notifications) for external request failures."
      );
    }
  }

  if (webhookNodes.length > 0 && sideEffectNodes.length > 0) {
    const directTriggerToSideEffect = webhookNodes.some((w) =>
      Array.from(adjacency.get(w.name) ?? []).some((next) => {
        const node = byName.get(next);
        return Boolean(node && nodeTypeMatches(node, SIDE_EFFECT_TYPE_PATTERN));
      })
    );
    if (directTriggerToSideEffect) {
      pushFinding(
        out,
        "review",
        "v1.spam.direct_webhook_side_effect",
        "workflow",
        "Webhook input appears to trigger outbound messaging side effects directly.",
        "Add rate limits, deduplication keys, and validation gates before sending notifications/messages."
      );
    }
  }

  if (detectCycle(adjacency)) {
    pushFinding(
      out,
      "critical",
      "v1.flow.cycle_detected",
      "workflow",
      "Cyclic node references were detected, which may cause reprocessing loops or message storms.",
      "Break cyclic edges or add strict termination/idempotency guards on loop paths."
    );
  }

  const incoming = new Map<string, number>();
  for (const name of byName.keys()) incoming.set(name, 0);
  for (const dests of adjacency.values()) {
    for (const d of dests) incoming.set(d, (incoming.get(d) ?? 0) + 1);
  }
  const deadNodes = nodes.filter((n) => !TRIGGER_TYPE_PATTERN.test(n.type.toLowerCase()) && (incoming.get(n.name) ?? 0) === 0);
  for (const node of deadNodes) {
    pushFinding(
      out,
      "info",
      "v1.flow.unused_node",
      getNodeTarget(node),
      "Node appears disconnected from workflow execution paths.",
      "Remove or reconnect unused nodes to reduce maintenance overhead and accidental configuration drift."
    );
  }

  for (const node of nodes) {
    if (!node.credentials) continue;
    const target = getNodeTarget(node);
    const lowPrivilege = LOW_PRIVILEGE_NODE_PATTERN.test(node.type.toLowerCase());
    const privileged = PRIVILEGED_INTEGRATION_PATTERN.test(node.type.toLowerCase());
    if (lowPrivilege) {
      pushFinding(
        out,
        "review",
        "v1.credential.scope_unnecessary",
        target,
        "Credentials are attached to a node that typically does not require privileged integration access.",
        "Detach unused credentials from low-privilege nodes and scope credentials only to nodes that require them."
      );
    } else if (privileged) {
      pushFinding(
        out,
        "review",
        "v1.credential.privileged_integration",
        target,
        "Node uses privileged integration credentials and should be reviewed for least-privilege access.",
        "Rotate integration credentials regularly and scope permissions to the minimum actions needed by this workflow."
      );
    }
  }

  if (nodes.length >= 40) {
    pushFinding(
      out,
      "review",
      "v1.complexity.large_workflow",
      "workflow",
      `Workflow has ${nodes.length} active nodes, increasing review and maintenance risk.`,
      "Split large flows into smaller validated modules and add integration tests for critical branches."
    );
  }
  const branchCount = Array.from(adjacency.values()).filter((s) => s.size >= 2).length;
  if (branchCount >= 10) {
    pushFinding(
      out,
      "info",
      "v1.complexity.branching_pressure",
      "workflow",
      `Workflow has ${branchCount} branching nodes, which can hide edge-case behavior.`,
      "Document branch intent and add explicit guards for rarely executed paths."
    );
  }

  return out;
}

function analyzeGeneric(data: unknown): ScanFinding[] {
  const out: ScanFinding[] = [];
  if (!isRecord(data)) {
    pushFinding(
      out,
      "critical",
      "v1.generic.invalid_json_root",
      "json",
      "Root value is not a JSON object.",
      "Send a JSON object as workflow input (not an array or primitive)."
    );
    return out;
  }

  detectSecretsFromObject(out, "json", data);

  const pairs: TraversedPair[] = [];
  traverseKeyValuePairs(data, "", pairs);
  const urls = pairs.filter((p) => /(^|\.)(url|uri|endpoint)$/i.test(p.keyPath)).map((p) => p.value);
  for (const url of urls) {
    if (/^http:\/\//i.test(url)) {
      pushFinding(
        out,
        "critical",
        "v1.generic.http_plaintext_url",
        `json.${url}`,
        "Generic JSON includes a plaintext URL (http://) that can expose data in transit.",
        "Replace plaintext URLs with HTTPS endpoints and validate TLS certificates."
      );
    }
  }

  const rawText = JSON.stringify(data).toLowerCase();
  if (rawText.includes("webhook") && !/(auth|signature|hmac|apikey)/.test(rawText)) {
    pushFinding(
      out,
      "review",
      "v1.generic.webhook_auth_unclear",
      "json.webhook",
      "Webhook-like configuration is present but authentication controls are not obvious.",
      "Document and enforce webhook authentication/signature checks before processing external events."
    );
  }

  if (rawText.includes("\"nodes\"") && rawText.includes("\"connections\"")) {
    pushFinding(
      out,
      "info",
      "v1.generic.n8n_like_payload",
      "json",
      "Input resembles an n8n workflow export while source is Generic JSON.",
      "Set source to n8n to apply richer workflow-specific checks."
    );
  }

  const keyCount = pairs.length;
  if (keyCount >= 200) {
    pushFinding(
      out,
      "review",
      "v1.generic.complexity_large_object",
      "json",
      `Generic payload has high field count (${keyCount}), increasing review complexity.`,
      "Split the payload into smaller components and validate each unit independently."
    );
  }

  if (out.length === 0) {
    pushFinding(
      out,
      "info",
      "v1.generic.no_significant_risk_detected",
      "json",
      "No deterministic high-signal risks were detected for the provided generic payload.",
      "Continue with environment-level controls (secrets management, network allowlists, and runtime monitoring)."
    );
  }
  return out;
}

export function riskScoreFromFindings(findings: ScanFinding[]): number {
  let score = 100;
  for (const f of findings) {
    if (f.severity === "critical" || f.severity === "high") score -= 20;
    else if (f.severity === "review") score -= 8;
    else score -= 2;
  }
  return Math.max(0, Math.min(100, score));
}

export function decisionFrom(findings: ScanFinding[]): ScanDecision {
  const score = riskScoreFromFindings(findings);
  if (score >= 85) return "PASS";
  if (score >= 60) return "NEEDS REVIEW";
  return "FAIL";
}

function sortFindings(findings: ScanFinding[]): ScanFinding[] {
  const severityOrder = (s: ScanSeverity): number => {
    if (s === "critical") return 0;
    if (s === "high") return 1;
    if (s === "review") return 2;
    return 3;
  };
  return [...findings].sort((a, b) => {
    const d = severityOrder(a.severity) - severityOrder(b.severity);
    if (d !== 0) return d;
    const r = a.rule_id.localeCompare(b.rule_id);
    if (r !== 0) return r;
    return a.target.localeCompare(b.target);
  });
}

export function runScanAnalysis(raw: unknown, source: ScanSource): {
  source: ScanSource;
  decision: ScanDecision;
  riskScore: number;
  findings: ScanFinding[];
} {
  const looksN8n = isLikelyN8nExport(raw);
  const findings: ScanFinding[] = [];

  if (source === "n8n") {
    if (!isRecord(raw) || !looksN8n) {
      pushFinding(
        findings,
        "critical",
        "v1.n8n.shape_mismatch",
        "workflow",
        "Source is n8n but JSON does not match a valid n8n workflow export shape.",
        "Export a full n8n workflow JSON (nodes + connections) or switch source to Generic JSON."
      );
    } else {
      const doc = unwrapN8nDoc(raw);
      findings.push(...analyzeN8n(doc));
    }
  } else {
    findings.push(...analyzeGeneric(raw));
    if (looksN8n) {
      pushFinding(
        findings,
        "review",
        "v1.generic.n8n_payload_with_generic_source",
        "workflow",
        "Payload appears to be an n8n export while source is set to Generic JSON.",
        "Set source to n8n for workflow-aware risk analysis and remediation output."
      );
    }
  }

  const sorted = sortFindings(findings);
  const riskScore = riskScoreFromFindings(sorted);
  const decision = decisionFrom(sorted);
  return { source, decision, riskScore, findings: sorted };
}

export function computeTotals(findings: ScanFinding[]): ScanTotals {
  let high = 0;
  let review = 0;
  let info = 0;
  for (const f of findings) {
    if (f.severity === "critical" || f.severity === "high") high += 1;
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
    engine: "server-v1",
    source: analysis.source,
  };
}
