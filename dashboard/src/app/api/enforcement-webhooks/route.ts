import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlainObject } from "@/lib/json-guards";
import { getActiveOrganizationId } from "@/lib/workspace-scope";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getActiveOrganizationId();

  let query = supabase
    .from("enforcement_webhooks")
    .select("id,name,url,secret,enabled,trigger_on,created_at,updated_at")
    .order("created_at", { ascending: false });

  if (orgId) {
    query = query.eq("organization_id", orgId);
  } else {
    query = query.is("organization_id", null).eq("user_id", user.id);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const masked = (data ?? []).map((w) => ({
    ...w,
    secret: typeof w.secret === "string" && w.secret ? `${w.secret.slice(0, 4)}…` : null,
  }));

  return NextResponse.json({ webhooks: masked });
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

  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 120) : "";
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const secret = typeof body.secret === "string" && body.secret.trim() ? body.secret.trim() : null;
  const enabled = body.enabled !== false;
  const triggerOn = Array.isArray(body.triggerOn) ? body.triggerOn : ["FAIL"];

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!url || url.length < 10) return NextResponse.json({ error: "Valid URL is required" }, { status: 400 });
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return NextResponse.json({ error: "URL must start with http:// or https://" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Server config error" }, { status: 500 });

  const orgId = await getActiveOrganizationId();

  const { data, error } = await admin
    .from("enforcement_webhooks")
    .insert({
      user_id: user.id,
      organization_id: orgId,
      name,
      url,
      secret,
      enabled,
      trigger_on: triggerOn,
    })
    .select("id,name,url,enabled,trigger_on,created_at")
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });

  return NextResponse.json({ ok: true, webhook: data }, { status: 201 });
}
