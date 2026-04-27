import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPlainObject } from "@/lib/json-guards";
import { isAlertDestinationType, toDestinationApi } from "@/lib/alerts";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Ctx) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

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

  const { data: existing, error: selErr } = await supabase
    .from("alert_destinations")
    .select("id,type,name,enabled,config")
    .eq("id", id)
    .maybeSingle();

  if (selErr || !existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const row = existing as Record<string, unknown>;
  const type = isAlertDestinationType(row.type) ? row.type : "in_app";
  const name =
    typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 120) : (row.name as string);
  const enabled = typeof body.enabled === "boolean" ? body.enabled : (row.enabled as boolean);

  const prevConfig =
    row.config && typeof row.config === "object" && !Array.isArray(row.config)
      ? ({ ...(row.config as Record<string, unknown>) } as Record<string, unknown>)
      : {};

  const nextConfig = { ...prevConfig };
  if (isPlainObject(body.config)) {
    if (typeof body.config.address === "string" && (type === "email" || body.config.address !== undefined)) {
      if (type === "email") {
        const addr = body.config.address.trim();
        if (!addr) {
          return NextResponse.json({ error: "address must be non-empty" }, { status: 400 });
        }
        nextConfig.address = addr;
      }
    }
    if (typeof body.config.webhookUrl === "string" && body.config.webhookUrl.trim()) {
      const url = body.config.webhookUrl.trim();
      if (type === "slack" || type === "discord") {
        if (!url.startsWith("https://")) {
          return NextResponse.json({ error: "webhookUrl must be https" }, { status: 400 });
        }
        nextConfig.webhookUrl = url;
      }
    }
  }

  const { data, error } = await supabase
    .from("alert_destinations")
    .update({ name, enabled, config: nextConfig })
    .eq("id", id)
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

export async function DELETE(_request: Request, context: Ctx) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

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

  const { error } = await supabase.from("alert_destinations").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
