import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPlainObject } from "@/lib/json-guards";
import {
  isIntegrationStatus,
  maskSecret,
  sanitizeBaseUrl,
  toIntegrationApi,
} from "@/lib/integrations";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Ctx) {
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "Missing integration id" }, { status: 400 });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!isPlainObject(body)) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { data: existing, error: selectError } = await supabase
    .from("integrations")
    .select("id,provider,name,status,config")
    .eq("id", id)
    .maybeSingle();
  if (selectError || !existing) return NextResponse.json({ error: "Integration not found" }, { status: 404 });

  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 120) : existing.name;
  const status = isIntegrationStatus(body.status) ? body.status : existing.status;

  const config = isPlainObject(existing.config) ? { ...existing.config } : {};
  const incomingConfig = isPlainObject(body.config) ? body.config : null;
  if (incomingConfig) {
    if (typeof incomingConfig.baseUrl === "string") {
      const baseUrl = sanitizeBaseUrl(incomingConfig.baseUrl);
      if (!baseUrl) {
        return NextResponse.json({ error: "n8n base URL must start with http:// or https://" }, { status: 400 });
      }
      config.baseUrl = baseUrl;
    }
    if (typeof incomingConfig.apiKey === "string") {
      const masked = maskSecret(incomingConfig.apiKey);
      config.apiKeyConfigured = Boolean(masked);
      config.apiKeyMask = masked;
    }
  }

  const { data, error } = await supabase
    .from("integrations")
    .update({ name, status, config })
    .eq("id", id)
    .select("id,user_id,organization_id,provider,name,status,config,created_at,updated_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const integration = toIntegrationApi((data ?? {}) as Record<string, unknown>);
  if (!integration) return NextResponse.json({ error: "Invalid integration row" }, { status: 500 });
  return NextResponse.json({ integration });
}

export async function DELETE(_request: Request, context: Ctx) {
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: "Missing integration id" }, { status: 400 });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("integrations").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
