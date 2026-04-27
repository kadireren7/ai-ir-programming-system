import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPlainObject } from "@/lib/json-guards";
import {
  isIntegrationProvider,
  maskSecret,
  sanitizeBaseUrl,
  toIntegrationApi,
  type IntegrationStatus,
} from "@/lib/integrations";
import { getActiveOrganizationId } from "@/lib/workspace-scope";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let organizationId: string | null = null;
  const activeOrg = await getActiveOrganizationId();
  if (activeOrg) {
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("organization_id", activeOrg)
      .eq("user_id", user.id)
      .maybeSingle();
    if (membership) organizationId = activeOrg;
  }

  let query = supabase
    .from("integrations")
    .select("id,user_id,organization_id,provider,name,status,config,created_at,updated_at")
    .order("created_at", { ascending: false });

  query = organizationId
    ? query.eq("organization_id", organizationId)
    : query.is("organization_id", null).eq("user_id", user.id);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const integrations = (data ?? [])
    .map((row) => toIntegrationApi(row as Record<string, unknown>))
    .filter((row): row is NonNullable<typeof row> => row !== null);

  return NextResponse.json({ integrations, activeOrganizationId: organizationId });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!isPlainObject(body)) {
    return NextResponse.json({ error: "Request body must be JSON object" }, { status: 400 });
  }

  const provider = body.provider;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const statusRaw = body.status;
  const configRaw = isPlainObject(body.config) ? body.config : {};

  if (!isIntegrationProvider(provider)) {
    return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: 'Field "name" is required' }, { status: 400 });
  }
  if (provider !== "n8n") {
    return NextResponse.json({ error: "Only n8n is available in this release" }, { status: 400 });
  }

  let organizationId: string | null = null;
  const activeOrg = await getActiveOrganizationId();
  if (activeOrg) {
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("organization_id", activeOrg)
      .eq("user_id", user.id)
      .maybeSingle();
    if (membership) organizationId = activeOrg;
  }

  const baseUrlInput = typeof configRaw.baseUrl === "string" ? configRaw.baseUrl : "";
  const apiKeyInput = typeof configRaw.apiKey === "string" ? configRaw.apiKey : "";
  const baseUrl = sanitizeBaseUrl(baseUrlInput);
  if (!baseUrl) {
    return NextResponse.json({ error: "n8n base URL must start with http:// or https://" }, { status: 400 });
  }
  const apiKeyMasked = maskSecret(apiKeyInput);

  const safeConfig = {
    baseUrl,
    apiKeyConfigured: Boolean(apiKeyMasked),
    apiKeyMask: apiKeyMasked,
    mode: "placeholder-not-fully-connected",
    note: "Torqa stores only masked API-key metadata in this MVP integration foundation.",
  };
  const status: IntegrationStatus = statusRaw === "connected" ? "connected" : "draft";

  const { data, error } = await supabase
    .from("integrations")
    .insert({
      user_id: user.id,
      organization_id: organizationId,
      provider,
      name: name.slice(0, 120),
      status,
      config: safeConfig,
    })
    .select("id,user_id,organization_id,provider,name,status,config,created_at,updated_at")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const integration = toIntegrationApi((data ?? {}) as Record<string, unknown>);
  if (!integration) {
    return NextResponse.json({ error: "Invalid integration row" }, { status: 500 });
  }
  return NextResponse.json({ integration });
}
