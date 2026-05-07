import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/token-crypto";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server config error" }, { status: 500 });

  const { data: row } = await admin
    .from("integrations")
    .select("id, provider, status, config, token_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row) return NextResponse.json({ error: "Integration not found" }, { status: 404 });

  const cfg = (row.config ?? {}) as Record<string, unknown>;
  const provider = typeof row.provider === "string" ? row.provider : "";

  // Count synced workflows
  const { count: workflowCount } = await admin
    .from("workflow_templates")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("source_id", id);

  // Last sync log
  const { data: lastSync } = await admin
    .from("sync_logs")
    .select("status, created_at, added, updated, unchanged")
    .eq("integration_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Probe the provider API if connected
  let reachable = false;
  let probeError: string | null = null;

  if (row.status === "connected" && typeof row.token_id === "string") {
    let apiKey = "";
    const { data: tokenRow } = await admin
      .from("provider_tokens")
      .select("encrypted_token")
      .eq("id", row.token_id)
      .single();
    if (tokenRow?.encrypted_token) {
      try { apiKey = decryptToken(tokenRow.encrypted_token); } catch { /* */ }
    }

    if (apiKey) {
      const ac = new AbortController();
      setTimeout(() => ac.abort(), 5_000);
      try {
        let testUrl = "";
        let headers: Record<string, string> = {};

        if (provider === "n8n") {
          const baseUrl = typeof cfg.baseUrl === "string" ? cfg.baseUrl.replace(/\/+$/, "") : "";
          testUrl = baseUrl ? `${baseUrl}/api/v1/workflows?limit=1` : "";
          headers = { "X-N8N-API-KEY": apiKey };
        } else if (provider === "zapier") {
          testUrl = "https://api.zapier.com/v1/zaps?limit=1";
          const authMethod = typeof cfg.authMethod === "string" ? cfg.authMethod : "apikey";
          headers = authMethod === "oauth"
            ? { Authorization: `Bearer ${apiKey}` }
            : { "X-API-Key": apiKey };
        } else if (provider === "make") {
          const zone = typeof cfg.zone === "string" ? cfg.zone : "eu1";
          testUrl = `https://${zone}.make.com/api/v2/users/me`;
          headers = { Authorization: `Token ${apiKey}` };
        } else if (provider === "pipedream") {
          testUrl = "https://api.pipedream.com/v1/users/me";
          headers = { Authorization: `Bearer ${apiKey}` };
        } else if (provider === "github") {
          testUrl = "https://api.github.com/user";
          headers = { Authorization: `Bearer ${apiKey}`, "X-GitHub-Api-Version": "2022-11-28" };
        }

        if (testUrl) {
          const res = await fetch(testUrl, { headers, signal: ac.signal });
          reachable = res.ok;
          if (!res.ok) probeError = `HTTP ${res.status}`;
        } else {
          reachable = true; // ai-agent and webhook don't have a ping endpoint
        }
      } catch (e) {
        probeError = e instanceof Error ? e.message : "Probe failed";
      }
    }
  }

  const health = row.status !== "connected" ? "disconnected"
    : reachable ? "healthy"
    : "degraded";

  return NextResponse.json({
    id,
    provider,
    status: row.status,
    health,
    reachable,
    probeError,
    workflowCount: workflowCount ?? 0,
    lastSync: lastSync ? {
      status: lastSync.status,
      at: lastSync.created_at,
      added: lastSync.added ?? 0,
      updated: lastSync.updated ?? 0,
      unchanged: lastSync.unchanged ?? 0,
    } : null,
  });
}
