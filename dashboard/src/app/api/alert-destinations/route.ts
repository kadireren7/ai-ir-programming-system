import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveListOrganizationId } from "@/lib/workspace-scope";
import { isPlainObject } from "@/lib/json-guards";
import { isAlertDestinationType, toDestinationApi } from "@/lib/alerts";
import { validateWebhookUrlForDestination } from "@/lib/webhook-ssrf";
import { apiJsonDatabaseError, apiJsonError } from "@/lib/api-json-error";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return apiJsonError(request, 503, "Supabase is not configured", "service_unavailable");
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return apiJsonError(request, 401, "Unauthorized", "unauthorized");
  }

  const organizationId = await resolveListOrganizationId(supabase, user.id);

  let q = supabase
    .from("alert_destinations")
    .select("id,user_id,organization_id,type,name,enabled,config,created_at,updated_at")
    .order("created_at", { ascending: false });

  q = organizationId
    ? q.eq("organization_id", organizationId)
    : q.is("organization_id", null).eq("user_id", user.id);

  const { data, error } = await q;
  if (error) {
    return apiJsonDatabaseError(request);
  }

  const destinations = (data ?? [])
    .map((r) => toDestinationApi(r as Record<string, unknown>))
    .filter((d): d is NonNullable<typeof d> => d !== null);

  return NextResponse.json({ destinations, activeOrganizationId: organizationId });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return apiJsonError(request, 503, "Supabase is not configured", "service_unavailable");
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return apiJsonError(request, 401, "Unauthorized", "unauthorized");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiJsonError(request, 400, "Invalid JSON body", "bad_request");
  }
  if (!isPlainObject(body)) {
    return apiJsonError(request, 400, "Invalid body", "bad_request");
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const type = body.type;
  const enabled = typeof body.enabled === "boolean" ? body.enabled : true;
  const configIn = isPlainObject(body.config) ? body.config : {};

  if (!name) {
    return apiJsonError(request, 400, "name is required", "bad_request");
  }
  if (!isAlertDestinationType(type)) {
    return apiJsonError(request, 400, "Invalid type", "bad_request");
  }

  const organizationId = await resolveListOrganizationId(supabase, user.id);

  const config: Record<string, unknown> = { ...configIn };
  if (type === "slack" || type === "discord") {
    const url = typeof config.webhookUrl === "string" ? config.webhookUrl.trim() : "";
    const v = validateWebhookUrlForDestination(type, url);
    if (!v.ok) {
      return apiJsonError(request, 400, v.message, "invalid_webhook_url");
    }
    config.webhookUrl = url;
  }
  if (type === "email") {
    const addr = typeof config.address === "string" ? config.address.trim() : "";
    if (!addr) {
      return apiJsonError(request, 400, "config.address is required for email", "bad_request");
    }
    config.address = addr;
  }
  if (type === "in_app") {
    config.channel = "in_app";
  }

  const { data, error } = await supabase
    .from("alert_destinations")
    .insert({
      user_id: user.id,
      organization_id: organizationId,
      name: name.slice(0, 120),
      type,
      enabled,
      config,
    })
    .select("id,user_id,organization_id,type,name,enabled,config,created_at,updated_at")
    .single();

  if (error) {
    return apiJsonDatabaseError(request);
  }

  const destination = toDestinationApi((data ?? {}) as Record<string, unknown>);
  if (!destination) {
    return apiJsonError(request, 500, "Invalid row", "internal_error");
  }
  return NextResponse.json({ destination });
}
