import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlainObject } from "@/lib/json-guards";
import { encryptToken, tokenHint } from "@/lib/token-crypto";
import { getActiveOrganizationId } from "@/lib/workspace-scope";
import { logWorkspaceActivity } from "@/lib/workspace-activity";
import { syncIntegration } from "@/lib/workflow-sync-engine";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!isPlainObject(body)) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const name   = typeof body.name   === "string" && body.name.trim() ? body.name.trim().slice(0, 120) : "Zapier";

  if (!apiKey) return NextResponse.json({ error: "API key required" }, { status: 400 });

  // Validate key against Zapier API
  const testRes = await fetch("https://api.zapier.com/v1/zaps?limit=1", {
    headers: { "X-API-Key": apiKey, Accept: "application/json" },
  }).catch(() => null);

  if (!testRes || !testRes.ok) {
    return NextResponse.json({ error: "Zapier API key invalid or Zapier API unreachable" }, { status: 422 });
  }

  let encryptedToken: string;
  try { encryptedToken = encryptToken(apiKey); } catch {
    return NextResponse.json({ error: "Token encryption failed — TORQA_TOKEN_ENCRYPTION_KEY missing" }, { status: 500 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server config error" }, { status: 500 });

  const hint = tokenHint(apiKey);

  const { data: tokenRow, error: tokenErr } = await admin
    .from("provider_tokens")
    .insert({ user_id: user.id, provider: "zapier", token_type: "api_key", token_hint: hint, encrypted_token: encryptedToken })
    .select("id").single();

  if (tokenErr || !tokenRow) return NextResponse.json({ error: tokenErr?.message ?? "Token store failed" }, { status: 500 });

  const { data: existing } = await admin
    .from("integrations").select("id")
    .eq("user_id", user.id).eq("provider", "zapier").is("organization_id", null).maybeSingle();

  const payload = { status: "connected" as const, auth_type: "apikey" as const, token_id: tokenRow.id, config: { apiKeyMask: hint } };

  let integrationId: string;
  if (existing) {
    await admin.from("integrations").update(payload).eq("id", existing.id);
    integrationId = existing.id;
  } else {
    const { data, error } = await admin
      .from("integrations")
      .insert({ user_id: user.id, organization_id: null, provider: "zapier", name, ...payload })
      .select("id").single();
    if (error || !data) return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
    integrationId = data.id;
  }

  const orgId = await getActiveOrganizationId();
  void logWorkspaceActivity(supabase, orgId, "integration.connected", integrationId, { provider: "zapier" }).catch(() => {});
  void syncIntegration(user.id, integrationId).catch(() => {});

  return NextResponse.json({ ok: true, integrationId, apiKeyMask: hint });
}
