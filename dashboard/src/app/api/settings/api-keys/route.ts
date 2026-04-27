import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateApiKey, toApiKeyPreview, type ApiKeyRow } from "@/lib/api-keys";
import { getActiveOrganizationId } from "@/lib/workspace-scope";
import { logWorkspaceActivity, notifyWorkspaceMembers } from "@/lib/workspace-activity";

export const runtime = "nodejs";

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

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

  const [keysRes, usageRes] = await Promise.all([
    supabase
      .from("api_keys")
      .select("id,name,key_prefix,created_at,last_used_at,revoked_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("api_key_usage_logs")
      .select("id,endpoint,source,status_code,success,error_code,request_ip,created_at,api_key_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (keysRes.error) {
    return NextResponse.json({ error: keysRes.error.message }, { status: 500 });
  }
  if (usageRes.error) {
    return NextResponse.json({ error: usageRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    keys: ((keysRes.data ?? []) as ApiKeyRow[]).map(toApiKeyPreview),
    usage: (usageRes.data ?? []).map((row) => ({
      id: row.id,
      endpoint: row.endpoint,
      source: row.source,
      statusCode: row.status_code,
      success: Boolean(row.success),
      errorCode: row.error_code,
      requestIp: row.request_ip,
      createdAt: row.created_at,
      apiKeyId: row.api_key_id,
    })),
  });
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

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (!isObject(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
  }

  const nameRaw = typeof body.name === "string" ? body.name.trim() : "";
  if (!nameRaw) {
    return NextResponse.json({ error: 'Field "name" is required' }, { status: 400 });
  }
  const name = nameRaw.slice(0, 120);

  const { rawKey, keyPrefix, keyHash } = generateApiKey();
  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      user_id: user.id,
      name,
      key_prefix: keyPrefix,
      key_hash: keyHash,
    })
    .select("id,name,key_prefix,created_at,last_used_at,revoked_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const activeOrg = await getActiveOrganizationId();
  if (activeOrg) {
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("organization_id", activeOrg)
      .eq("user_id", user.id)
      .maybeSingle();
    if (membership) {
      await logWorkspaceActivity(supabase, activeOrg, "api_key.created", (data as ApiKeyRow).id, { name });
      await notifyWorkspaceMembers(
        supabase,
        activeOrg,
        "API key created",
        `A new workspace member API key "${name}" was created.`,
        "warning",
        { keyId: (data as ApiKeyRow).id, name }
      );
    }
  }

  return NextResponse.json({
    key: toApiKeyPreview(data as ApiKeyRow),
    rawKey,
    oneTimeReveal: true,
  });
}
