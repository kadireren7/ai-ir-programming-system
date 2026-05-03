import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ScanDecision, ScanSource } from "@/lib/scan-engine";

type WebhookPayload = {
  event: "governance.decision";
  decision: ScanDecision;
  riskScore: number;
  workflowName: string | null;
  source: ScanSource;
  scanId: string | null;
  findings: Array<{ severity: string; rule_id: string; target: string }>;
  timestamp: string;
};

async function deliverWebhook(
  url: string,
  payload: WebhookPayload,
  secret: string | null
): Promise<{ success: boolean; statusCode: number | null; error: string | null }> {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "Torqa-Enforcement-Webhook/1.0",
    "X-Torqa-Event": "governance.decision",
    "X-Torqa-Decision": payload.decision,
  };

  if (secret) {
    try {
      const enc = new TextEncoder();
      const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
      const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
      headers["X-Torqa-Signature-256"] = `sha256=${hex}`;
    } catch { /* skip signing if crypto fails */ }
  }

  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), 10_000);
  try {
    const res = await fetch(url, { method: "POST", headers, body, signal: ac.signal });
    return { success: res.ok, statusCode: res.status, error: res.ok ? null : `HTTP ${res.status}` };
  } catch (e) {
    return { success: false, statusCode: null, error: e instanceof Error ? e.message : "Delivery failed" };
  } finally {
    clearTimeout(timeout);
  }
}

export async function dispatchEnforcementWebhooks(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    organizationId: string | null;
    decision: ScanDecision;
    riskScore: number;
    workflowName: string | null;
    source: ScanSource;
    scanId: string | null;
    findings: Array<{ severity: string; rule_id: string; target: string }>;
  }
): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  let query = admin
    .from("enforcement_webhooks")
    .select("id,url,secret,trigger_on")
    .eq("enabled", true);

  if (opts.organizationId) {
    query = query.eq("organization_id", opts.organizationId);
  } else {
    query = query.is("organization_id", null).eq("user_id", opts.userId);
  }

  const { data: webhooks } = await query;
  if (!webhooks || webhooks.length === 0) return;

  const payload: WebhookPayload = {
    event: "governance.decision",
    decision: opts.decision,
    riskScore: opts.riskScore,
    workflowName: opts.workflowName,
    source: opts.source,
    scanId: opts.scanId,
    findings: opts.findings.slice(0, 50),
    timestamp: new Date().toISOString(),
  };

  for (const webhook of webhooks) {
    const triggerOn = Array.isArray(webhook.trigger_on) ? webhook.trigger_on : ["FAIL"];
    if (!triggerOn.includes(opts.decision)) continue;

    const url = typeof webhook.url === "string" ? webhook.url : "";
    if (!url) continue;

    const secret = typeof webhook.secret === "string" ? webhook.secret : null;
    const result = await deliverWebhook(url, payload, secret).catch(() => ({
      success: false,
      statusCode: null,
      error: "Unhandled error",
    }));

    void (admin.from("enforcement_webhook_deliveries").insert({
      webhook_id: webhook.id,
      scan_id: opts.scanId,
      decision: opts.decision,
      status_code: result.statusCode,
      success: result.success,
      error_message: result.error,
    }) as unknown as Promise<unknown>).catch(() => {});
  }
}
