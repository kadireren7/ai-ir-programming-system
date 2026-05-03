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
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!isPlainObject(body)) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const token = typeof body.token === "string" ? body.token.trim() : "";
  const name  = typeof body.name  === "string" && body.name.trim() ? body.name.trim().slice(0, 120) : "GitHub";
  const owner = typeof body.owner === "string" ? body.owner.trim() : "";
  const repo  = typeof body.repo  === "string" ? body.repo.trim()  : "";

  if (!token) return NextResponse.json({ error: "GitHub token is required (PAT or GitHub App token)" }, { status: 400 });
  if (!token.startsWith("ghp_") && !token.startsWith("github_pat_") && !token.startsWith("ghs_") && token.length < 20) {
    return NextResponse.json({ error: "Token does not look like a valid GitHub token" }, { status: 400 });
  }

  let encryptedToken: string;
  try {
    encryptedToken = encryptToken(token);
  } catch {
    return NextResponse.json({ error: "Token encryption failed — TORQA_TOKEN_ENCRYPTION_KEY may be missing" }, { status: 500 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server config error" }, { status: 500 });

  const hint = tokenHint(token);

  const { data: tokenRow, error: tokenErr } = await admin
    .from("provider_tokens")
    .insert({ user_id: user.id, provider: "github", token_type: "pat", token_hint: hint, encrypted_token: encryptedToken })
    .select("id")
    .single();

  if (tokenErr || !tokenRow) {
    return NextResponse.json({ error: tokenErr?.message ?? "Failed to store token" }, { status: 500 });
  }

  const { data: existing } = await admin
    .from("integrations")
    .select("id")
    .eq("user_id", user.id)
    .eq("provider", "github")
    .is("organization_id", null)
    .maybeSingle();

  const config: Record<string, unknown> = { tokenMask: hint };
  if (owner) config.owner = owner;
  if (repo) config.repo = repo;

  const integrationPayload = {
    status: "connected" as const,
    auth_type: "pat" as const,
    token_id: tokenRow.id,
    config,
  };

  let integrationId: string;
  if (existing) {
    await admin.from("integrations").update(integrationPayload).eq("id", existing.id);
    integrationId = existing.id;
  } else {
    const { data, error } = await admin
      .from("integrations")
      .insert({ user_id: user.id, organization_id: null, provider: "github", name, ...integrationPayload })
      .select("id")
      .single();
    if (error || !data) return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
    integrationId = data.id;
  }

  const orgId = await getActiveOrganizationId();
  void logWorkspaceActivity(supabase, orgId, "integration.connected", integrationId, { provider: "github" }).catch(() => {});
  void syncIntegration(user.id, integrationId).catch(() => {});

  return NextResponse.json({ ok: true, integrationId, tokenMask: hint });
}
