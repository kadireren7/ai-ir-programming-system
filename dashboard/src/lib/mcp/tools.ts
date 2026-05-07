import { getScanProvider } from "@/lib/scan/providers";
import { isScanApiSuccess } from "@/lib/scan-api-guards";
import { resolveScanPolicy } from "@/lib/resolve-scan-policy";
import { evaluateScanAgainstPolicy } from "@/lib/policy-evaluator";
import type { ScanSource } from "@/lib/scan-engine";
import type { SupabaseClient } from "@supabase/supabase-js";

export type McpCallContext = {
  admin: SupabaseClient;
  userId: string;
  apiKeyId: string;
};

type McpToolResult = { ok: true; text: string } | { ok: false; error: string };

export const MCP_TOOLS = [
  {
    name: "torqa_scan",
    description: "Scan a workflow JSON for governance policy violations. Returns trust score, decision (PASS/NEEDS REVIEW/FAIL), and findings.",
    inputSchema: {
      type: "object",
      properties: {
        source: {
          type: "string",
          description: "Workflow source type: n8n, github, zapier, make, pipedream, ai_agent, webhook",
        },
        content: {
          type: "object",
          description: "Workflow definition JSON to scan",
        },
        policy_pack_id: {
          type: "string",
          description: "Optional policy pack UUID or slug to evaluate against",
        },
      },
      required: ["source", "content"],
    },
  },
  {
    name: "torqa_findings",
    description: "Query governance findings from recent scan history. Returns findings sorted by severity.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max findings (default 20, max 100)" },
        severity: { type: "string", description: "Filter: critical, high, review, info" },
        source: { type: "string", description: "Filter by source: n8n, github, zapier, make, pipedream" },
      },
    },
  },
  {
    name: "torqa_policy_list",
    description: "List available policy packs for your account.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "torqa_audit",
    description: "Query recent governance decisions (approve / review / block / apply_fix).",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max decisions (default 10, max 50)" },
        decision_type: { type: "string", description: "Filter: approve, needs_review, block, apply_fix" },
      },
    },
  },
] as const;

export async function callMcpTool(
  name: string,
  args: Record<string, unknown>,
  ctx: McpCallContext
): Promise<McpToolResult> {
  switch (name) {
    case "torqa_scan":     return handleScan(args, ctx);
    case "torqa_findings": return handleFindings(args, ctx);
    case "torqa_policy_list": return handlePolicyList(ctx);
    case "torqa_audit":    return handleAudit(args, ctx);
    default:               return { ok: false, error: `Unknown tool: ${name}` };
  }
}

async function handleScan(args: Record<string, unknown>, ctx: McpCallContext): Promise<McpToolResult> {
  const source = typeof args.source === "string" ? args.source : null;
  const content = args.content && typeof args.content === "object" && !Array.isArray(args.content)
    ? args.content as Record<string, unknown>
    : null;

  if (!source || !content) return { ok: false, error: "source and content are required" };

  let scanResult: unknown;
  try {
    const provider = getScanProvider();
    scanResult = await provider.scan({ source: source as ScanSource, content });
  } catch {
    return { ok: false, error: "Scan failed — check that source is valid and content is well-formed" };
  }

  if (!isScanApiSuccess(scanResult)) return { ok: false, error: "Scan returned unexpected format" };

  let policyText = "";
  if (typeof args.policy_pack_id === "string") {
    try {
      const resolved = await resolveScanPolicy(ctx.admin, {
        workspacePolicyId: args.policy_pack_id,
        strictPersonalUserId: ctx.userId,
      });
      if (resolved) {
        const evaluation = evaluateScanAgainstPolicy(scanResult, resolved.name, resolved.config);
        policyText = `\n\nPolicy: ${resolved.name}\nStatus: ${evaluation.policyStatus}\nViolations: ${evaluation.violations.length}`;
        if (evaluation.violations.length > 0) {
          policyText += "\n" + evaluation.violations.map((v) => `  - ${v.code}: ${v.message}`).join("\n");
        }
      }
    } catch {
      policyText = "\n\n(Policy evaluation failed)";
    }
  }

  const lines = [
    `Decision: ${scanResult.status}`,
    `Trust Score: ${scanResult.riskScore}/100`,
    `Findings: ${scanResult.findings.length} (high: ${scanResult.totals.high}, review: ${scanResult.totals.review}, info: ${scanResult.totals.info})`,
    `Engine: ${scanResult.engine}`,
  ];

  if (scanResult.findings.length > 0) {
    lines.push("\nFindings:");
    for (const f of scanResult.findings.slice(0, 10)) {
      lines.push(`  [${f.severity.toUpperCase()}] ${f.rule_id} @ ${f.target}: ${f.explanation}`);
      if (f.suggested_fix) lines.push(`    Fix: ${f.suggested_fix}`);
    }
    if (scanResult.findings.length > 10) lines.push(`  ... and ${scanResult.findings.length - 10} more`);
  }

  return { ok: true, text: lines.join("\n") + policyText };
}

type ScanHistoryRow = {
  id: string;
  workflow_name: string | null;
  source: string | null;
  result: unknown;
};

async function handleFindings(args: Record<string, unknown>, ctx: McpCallContext): Promise<McpToolResult> {
  const limit = Math.min(typeof args.limit === "number" ? args.limit : 20, 100);
  const severity = typeof args.severity === "string" ? args.severity : null;
  const source = typeof args.source === "string" ? args.source : null;

  let query = ctx.admin
    .from("scan_history")
    .select("id, workflow_name, source, result")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (source) query = query.eq("source", source);

  const { data, error } = await query;
  if (error) return { ok: false, error: "Database query failed" };

  const findings: Array<{ rule_id: string; target: string; severity: string; source: string; workflow: string; scan_id: string }> = [];

  for (const row of ((data ?? []) as ScanHistoryRow[])) {
    const result = row.result as { findings?: unknown[] } | null;
    if (!Array.isArray(result?.findings)) continue;
    for (const f of result.findings as Array<{ rule_id?: string; target?: string; severity?: string }>) {
      if (severity && f.severity !== severity) continue;
      findings.push({
        rule_id: typeof f.rule_id === "string" ? f.rule_id : "unknown",
        target: typeof f.target === "string" ? f.target : "unknown",
        severity: typeof f.severity === "string" ? f.severity : "info",
        source: typeof row.source === "string" ? row.source : "unknown",
        workflow: typeof row.workflow_name === "string" ? row.workflow_name : "untitled",
        scan_id: row.id,
      });
      if (findings.length >= limit) break;
    }
    if (findings.length >= limit) break;
  }

  if (findings.length === 0) return { ok: true, text: "No findings matching the given filters." };

  const lines = [`${findings.length} findings:\n`];
  for (const f of findings) {
    lines.push(`[${f.severity.toUpperCase()}] ${f.rule_id}`);
    lines.push(`  Target: ${f.target}`);
    lines.push(`  Workflow: ${f.workflow} (${f.source})`);
    lines.push(`  Scan: ${f.scan_id}`);
  }

  return { ok: true, text: lines.join("\n") };
}

type PolicyPackRow = { id: string; name: string; description?: string | null; is_builtin?: boolean | null };

async function handlePolicyList(ctx: McpCallContext): Promise<McpToolResult> {
  const { data, error } = await ctx.admin
    .from("policy_packs")
    .select("id, name, description, is_builtin")
    .or(`user_id.eq.${ctx.userId},is_builtin.eq.true`)
    .order("is_builtin", { ascending: false })
    .limit(50);

  if (error) return { ok: false, error: "Failed to list policy packs" };
  if (!data || data.length === 0) return { ok: true, text: "No policy packs found." };

  const lines = [`${data.length} policy packs:\n`];
  for (const p of (data as PolicyPackRow[])) {
    lines.push(`${p.is_builtin ? "[built-in]" : "[custom]"} ${p.name}`);
    lines.push(`  ID: ${p.id}`);
    if (p.description) lines.push(`  ${p.description}`);
  }

  return { ok: true, text: lines.join("\n") };
}

type DecisionRow = { id: string; decision_type: string; mode: string; created_at: string; rationale?: string | null };

async function handleAudit(args: Record<string, unknown>, ctx: McpCallContext): Promise<McpToolResult> {
  const limit = Math.min(typeof args.limit === "number" ? args.limit : 10, 50);
  const decisionType = typeof args.decision_type === "string" ? args.decision_type : null;

  let query = ctx.admin
    .from("governance_decisions")
    .select("id, decision_type, mode, rationale, created_at")
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (decisionType) query = query.eq("decision_type", decisionType);

  const { data, error } = await query;
  if (error) return { ok: false, error: "Failed to query audit log" };
  if (!data || data.length === 0) return { ok: true, text: "No audit decisions found." };

  const lines = [`${data.length} audit decisions:\n`];
  for (const d of (data as DecisionRow[])) {
    lines.push(`[${d.decision_type.toUpperCase()}] mode=${d.mode} at ${new Date(d.created_at).toLocaleString()}`);
    if (d.rationale) lines.push(`  Note: ${d.rationale}`);
  }

  return { ok: true, text: lines.join("\n") };
}
