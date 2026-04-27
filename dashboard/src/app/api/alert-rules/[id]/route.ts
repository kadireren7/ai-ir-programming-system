import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveListOrganizationId } from "@/lib/workspace-scope";
import { isPlainObject } from "@/lib/json-guards";
import { isAlertRuleTrigger, toRuleApi } from "@/lib/alerts";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

async function validateDestinationIds(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  ids: string[],
  userId: string,
  organizationId: string | null
): Promise<boolean> {
  if (ids.length === 0) return false;
  const { data, error } = await supabase
    .from("alert_destinations")
    .select("id,organization_id,user_id")
    .in("id", ids);
  if (error || !data || data.length !== ids.length) return false;
  for (const d of data) {
    const row = d as { organization_id?: string | null; user_id?: string };
    const org = row.organization_id ?? null;
    const ok =
      organizationId === null ? org === null && row.user_id === userId : org === organizationId;
    if (!ok) return false;
  }
  return true;
}

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
    .from("alert_rules")
    .select("id,name,enabled,rule_trigger,destination_ids,organization_id")
    .eq("id", id)
    .maybeSingle();

  if (selErr || !existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const row = existing as Record<string, unknown>;
  const existingOrg = typeof row.organization_id === "string" ? row.organization_id : null;
  const activeOrgId = await resolveListOrganizationId(supabase, user.id);
  const ownerId = typeof row.user_id === "string" ? row.user_id : "";
  const canEditPersonal = existingOrg === null && ownerId === user.id;
  const canEditOrg = existingOrg !== null && existingOrg === activeOrgId;
  if (!canEditPersonal && !canEditOrg) {
    return NextResponse.json({ error: "Not allowed to edit this rule in the current scope" }, { status: 403 });
  }

  const name =
    typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 160) : (row.name as string);
  const enabled = typeof body.enabled === "boolean" ? body.enabled : (row.enabled as boolean);
  const triggerRaw = body.trigger ?? body.rule_trigger;
  const rule_trigger = isAlertRuleTrigger(triggerRaw) ? triggerRaw : (row.rule_trigger as string);
  if (!isAlertRuleTrigger(rule_trigger)) {
    return NextResponse.json({ error: "Invalid trigger" }, { status: 400 });
  }

  const destinationIdsRaw = body.destinationIds ?? body.destination_ids;
  let destination_ids: string[];
  if (Array.isArray(destinationIdsRaw)) {
    destination_ids = destinationIdsRaw.filter((x): x is string => typeof x === "string");
  } else {
    const raw = row.destination_ids;
    destination_ids = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
  }

  const okDest = await validateDestinationIds(supabase, destination_ids, user.id, existingOrg ?? null);
  if (!okDest) {
    return NextResponse.json({ error: "Invalid destination ids for this scope" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("alert_rules")
    .update({ name, enabled, rule_trigger, destination_ids })
    .eq("id", id)
    .select("id,user_id,organization_id,name,enabled,rule_trigger,destination_ids,created_at,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rule = toRuleApi((data ?? {}) as Record<string, unknown>);
  if (!rule) {
    return NextResponse.json({ error: "Invalid row" }, { status: 500 });
  }
  return NextResponse.json({ rule });
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

  const { error } = await supabase.from("alert_rules").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
