/**
 * POST /api/fixes/github-issue
 *
 * Creates a GitHub issue on a user-specified repo pre-filled with the
 * governance findings from a scan as a remediation checklist.
 *
 * Requires the user to have a connected GitHub integration.
 */

import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/token-crypto";
import { githubJson } from "@/lib/github-pr/github-rest-client";
import { isScanApiSuccess } from "@/lib/scan-api-guards";
import {
  attachRequestIdHeader,
  jsonDatabaseErrorResponse,
  jsonErrorResponse,
} from "@/lib/api-json-error";
import { getOrCreateRequestId } from "@/lib/api-request-id";
import type { ScanApiSuccess } from "@/lib/scan-engine";

export const runtime = "nodejs";

type CreatedIssue = { html_url: string; number: number; title: string };

function buildIssueBody(result: ScanApiSuccess, workflowName: string, scanId: string): string {
  const lines = [
    `> **Torqa governance report** — ${workflowName}`,
    `> Trust score: **${result.riskScore}/100** | Decision: **${result.status}**`,
    `> Scan ID: \`${scanId}\``,
    "",
    "## Remediation checklist",
    "",
  ];

  if (result.findings.length === 0) {
    lines.push("No findings — all governance checks passed.");
  } else {
    for (const f of result.findings.slice(0, 50)) {
      const severity = f.severity === "critical" || f.severity === "high" ? "🔴" : f.severity === "review" ? "🟡" : "⚪";
      lines.push(`- [ ] ${severity} **${f.rule_id}** \`${f.target}\``);
      lines.push(`  ${f.explanation}`);
      if (f.suggested_fix) lines.push(`  > Fix: ${f.suggested_fix}`);
    }
    if (result.findings.length > 50) {
      lines.push(`\n_...and ${result.findings.length - 50} more findings. [View full report](/scan/${scanId})_`);
    }
  }

  lines.push("", "---", "_Created by [Torqa](https://torqa.dev) governance engine_");
  return lines.join("\n");
}

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);

  if (!isSupabaseConfigured()) {
    return jsonErrorResponse(503, "Supabase not configured", requestId, "service_unavailable");
  }
  const supabase = await createClient();
  if (!supabase) return jsonDatabaseErrorResponse(requestId);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return jsonErrorResponse(401, "Unauthorized", requestId);

  let body: unknown;
  try { body = await request.json(); } catch {
    return jsonErrorResponse(400, "Invalid JSON body", requestId);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonErrorResponse(400, "Body must be a JSON object", requestId);
  }
  const b = body as Record<string, unknown>;

  const scanId = typeof b.scanId === "string" ? b.scanId.trim() : null;
  const repoOwner = typeof b.repoOwner === "string" ? b.repoOwner.trim() : null;
  const repoName = typeof b.repoName === "string" ? b.repoName.trim() : null;

  if (!scanId || !repoOwner || !repoName) {
    return jsonErrorResponse(400, "scanId, repoOwner, and repoName are required", requestId);
  }

  const { data: scanRow, error: scanError } = await supabase
    .from("scan_history")
    .select("id, workflow_name, source, result")
    .eq("id", scanId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (scanError || !scanRow) {
    return jsonErrorResponse(404, "Scan not found", requestId);
  }
  if (!isScanApiSuccess(scanRow.result)) {
    return jsonErrorResponse(422, "Scan result is not in a reportable state", requestId);
  }

  const admin = createAdminClient();
  if (!admin) return jsonDatabaseErrorResponse(requestId);

  const { data: githubIntegration } = await admin
    .from("integrations")
    .select("id, config, token_id")
    .eq("user_id", user.id)
    .eq("provider", "github")
    .eq("status", "connected")
    .maybeSingle();

  if (!githubIntegration) {
    return jsonErrorResponse(400, "GitHub integration not connected. Connect GitHub in Sources first.", requestId, "github_not_connected");
  }

  let githubToken: string | null = null;
  if (githubIntegration.token_id) {
    const { data: tokenRow } = await admin
      .from("provider_tokens")
      .select("encrypted_token")
      .eq("id", githubIntegration.token_id)
      .maybeSingle();
    if (tokenRow?.encrypted_token) {
      try {
        githubToken = await decryptToken(tokenRow.encrypted_token as string);
      } catch {
        return jsonErrorResponse(500, "Failed to decrypt GitHub token", requestId);
      }
    }
  }

  if (!githubToken) {
    const config = githubIntegration.config as Record<string, unknown> | null;
    githubToken = typeof config?.personal_access_token === "string" ? config.personal_access_token : null;
  }

  if (!githubToken) {
    return jsonErrorResponse(400, "GitHub token not found — reconnect GitHub in Sources", requestId, "github_token_missing");
  }

  const workflowName = typeof scanRow.workflow_name === "string" && scanRow.workflow_name
    ? scanRow.workflow_name
    : "Workflow";

  const issueTitle = `[Torqa] Governance findings: ${workflowName} (${(scanRow.result as ScanApiSuccess).status})`;
  const issueBody = buildIssueBody(scanRow.result as ScanApiSuccess, workflowName, scanId);

  let issue: CreatedIssue;
  try {
    issue = await githubJson<CreatedIssue>(
      githubToken,
      `/repos/${encodeURIComponent(repoOwner)}/${encodeURIComponent(repoName)}/issues`,
      {
        method: "POST",
        body: JSON.stringify({
          title: issueTitle,
          body: issueBody,
          labels: ["governance", "torqa"],
        }),
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "GitHub API error";
    return jsonErrorResponse(502, `Failed to create GitHub issue: ${msg}`, requestId, "github_api_error");
  }

  await supabase.from("governance_decisions").insert({
    user_id: user.id,
    scan_id: scanId,
    finding_signature: `github-issue-${issue.number}`,
    decision_type: "apply_fix",
    mode: "interactive",
    actor_user_id: user.id,
    rationale: `GitHub issue #${issue.number} created for remediation`,
    payload: {
      type: "github_issue",
      repo: `${repoOwner}/${repoName}`,
      issue_number: issue.number,
      issue_url: issue.html_url,
    },
  });

  return attachRequestIdHeader(
    NextResponse.json({
      ok: true,
      issueUrl: issue.html_url,
      issueNumber: issue.number,
      title: issue.title,
    }),
    requestId
  );
}
