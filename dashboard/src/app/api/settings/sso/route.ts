import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlainObject } from "@/lib/json-guards";
import { getActiveOrganizationId } from "@/lib/workspace-scope";
import type { SsoProviderType } from "@/lib/oidc-sso";

export const runtime = "nodejs";

const VALID_PROVIDERS = new Set<SsoProviderType>(["google_workspace", "entra_id", "oidc"]);

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getActiveOrganizationId();
  if (!orgId) return NextResponse.json({ config: null });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server config error" }, { status: 500 });

  const { data } = await admin
    .from("sso_configs")
    .select("id, provider_type, client_id, issuer_url, domain_restriction, enabled, created_at, updated_at")
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!data) return NextResponse.json({ config: null });

  return NextResponse.json({
    config: {
      id: data.id,
      providerType: data.provider_type,
      clientId: data.client_id,
      issuerUrl: data.issuer_url,
      domainRestriction: data.domain_restriction ?? null,
      enabled: data.enabled,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getActiveOrganizationId();
  if (!orgId) return NextResponse.json({ error: "No active organization" }, { status: 400 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!isPlainObject(body)) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const providerType = typeof body.providerType === "string" && VALID_PROVIDERS.has(body.providerType as SsoProviderType)
    ? body.providerType as SsoProviderType
    : null;
  const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
  const clientSecret = typeof body.clientSecret === "string" ? body.clientSecret.trim() : "";
  const issuerUrl = typeof body.issuerUrl === "string" ? body.issuerUrl.trim() : "";
  const domainRestriction = typeof body.domainRestriction === "string" && body.domainRestriction.trim()
    ? body.domainRestriction.trim().toLowerCase()
    : null;
  const enabled = body.enabled !== false;

  if (!providerType) return NextResponse.json({ error: "Invalid providerType" }, { status: 400 });
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });
  if (!clientSecret) return NextResponse.json({ error: "clientSecret required" }, { status: 400 });
  if (!issuerUrl) return NextResponse.json({ error: "issuerUrl required" }, { status: 400 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server config error" }, { status: 500 });

  // Check org admin role
  const { data: membership } = await admin
    .from("organization_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || !["owner", "admin"].includes(membership.role as string)) {
    return NextResponse.json({ error: "Admin or owner role required" }, { status: 403 });
  }

  const payload = {
    organization_id: orgId,
    provider_type: providerType,
    client_id: clientId,
    client_secret: clientSecret,
    issuer_url: issuerUrl,
    domain_restriction: domainRestriction,
    enabled,
    created_by: user.id,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await admin
    .from("sso_configs")
    .select("id")
    .eq("organization_id", orgId)
    .maybeSingle();

  let ssoId: string;
  if (existing) {
    await admin.from("sso_configs").update(payload).eq("id", existing.id);
    ssoId = existing.id as string;
  } else {
    const { data: inserted, error } = await admin
      .from("sso_configs")
      .insert(payload)
      .select("id")
      .single();
    if (error || !inserted) return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
    ssoId = inserted.id as string;
  }

  return NextResponse.json({ ok: true, id: ssoId });
}

export async function DELETE() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getActiveOrganizationId();
  if (!orgId) return NextResponse.json({ error: "No active organization" }, { status: 400 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server config error" }, { status: 500 });

  await admin.from("sso_configs").delete().eq("organization_id", orgId);
  return NextResponse.json({ ok: true });
}
