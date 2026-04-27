import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveListOrganizationId } from "@/lib/workspace-scope";
import { isPlainObject } from "@/lib/json-guards";
import { isAlertDestinationType, toDestinationApi } from "@/lib/alerts";

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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const destinations = (data ?? [])
    .map((r) => toDestinationApi(r as Record<string, unknown>))
    .filter((d): d is NonNullable<typeof d> => d !== null);

  return NextResponse.json({ destinations, activeOrganizationId: organizationId });
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
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const type = body.type;
  const enabled = typeof body.enabled === "boolean" ? body.enabled : true;
  const configIn = isPlainObject(body.config) ? body.config : {};

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!isAlertDestinationType(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const organizationId = await resolveListOrganizationId(supabase, user.id);

  const config: Record<string, unknown> = { ...configIn };
  if (type === "slack" || type === "discord") {
    const url = typeof config.webhookUrl === "string" ? config.webhookUrl.trim() : "";
    if (!url.startsWith("https://")) {
      return NextResponse.json({ error: "webhookUrl must be an https URL" }, { status: 400 });
    }
    config.webhookUrl = url;
  }
  if (type === "email") {
    const addr = typeof config.address === "string" ? config.address.trim() : "";
    if (!addr) {
      return NextResponse.json({ error: "config.address is required for email" }, { status: 400 });
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const destination = toDestinationApi((data ?? {}) as Record<string, unknown>);
  if (!destination) {
    return NextResponse.json({ error: "Invalid row" }, { status: 500 });
  }
  return NextResponse.json({ destination });
}
