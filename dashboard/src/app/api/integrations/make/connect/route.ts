import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlainObject } from "@/lib/json-guards";
import { encryptToken, tokenHint } from "@/lib/token-crypto";
import { getActiveOrganizationId } from "@/lib/workspace-scope";
import { logWorkspaceActivity } from "@/lib/workspace-activity";
import { syncIntegration } from "@/lib/workflow-sync-engine";

export const runtime = "nodejs";

// Make zones: eu1 (EU), us1/us2 (US)
const MAKE_ZONES = ["eu1", "us1", "us2", "eu2"];

function makeDomain(zone: string): string {
  return `https://${zone}.make.com`;
}

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
  const zone   = typeof body.zone   === "string" && MAKE_ZONES.includes(body.zone) ? body.zone : "eu1";
  const teamId = typeof body.teamId === "string" ? body.teamId.trim() : null;
  const name   = typeof body.name   === "string" && body.name.trim() ? body.name.trim().slice(0, 120) : "Make";

  if (!apiKey) return NextResponse.json({ error: "API key required" }, { status: 400 });

  // Validate key against Make API
  const domain = makeDomain(zone);
  const testUrl = `${domain}/api/v2/users/me`;
  const testRes = await fetch(testUrl, {
    headers: { Authorization: `Token ${apiKey}`, Accept: "application/json" },
  }).catch(() => null);

  if (!testRes || !testRes.ok) {
    return NextResponse.json({ error: `Make API key invalid or unreachable (zone: ${zone})` }, { status: 422 });
  }

  let encryptedToken: string;
  try { encryptedToken = encryptToken(apiKey); } catch {
    return NextResponse.json({ error: "Token encryption failed" }, { status: 500 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server config error" }, { status: 500 });

  const hint = tokenHint(apiKey);

  const { data: tokenRow, error: tokenErr } = await admin
    .from("provider_tokens")
    .insert({ user_id: user.id, provider: "make", token_type: "api_key", token_hint: hint, encrypted_token: encryptedToken })
    .select("id").single();

  if (tokenErr || !tokenRow) return NextResponse.json({ error: tokenErr?.message ?? "Token store failed" }, { status: 500 });

  const cfg: Record<string, unknown> = { zone, domain, apiKeyMask: hint };
  if (teamId) cfg.teamId = teamId;

  const { data: existing } = await admin
    .from("integrations").select("id")
    .eq("user_id", user.id).eq("provider", "make").is("organization_id", null).maybeSingle();

  const payload = { status: "connected" as const, auth_type: "apikey" as const, token_id: tokenRow.id, config: cfg };

  let integrationId: string;
  if (existing) {
    await admin.from("integrations").update(payload).eq("id", existing.id);
    integrationId = existing.id;
  } else {
    const { data, error } = await admin
      .from("integrations")
      .insert({ user_id: user.id, organization_id: null, provider: "make", name, ...payload })
      .select("id").single();
    if (error || !data) return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
    integrationId = data.id;
  }

  const orgId = await getActiveOrganizationId();
  void logWorkspaceActivity(supabase, orgId, "integration.connected", integrationId, { provider: "make", zone }).catch(() => {});
  void syncIntegration(user.id, integrationId).catch(() => {});

  return NextResponse.json({ ok: true, integrationId, apiKeyMask: hint, zone });
}
