import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveListOrganizationId } from "@/lib/workspace-scope";
import { isPlainObject } from "@/lib/json-guards";
import { isAlertRuleTrigger, toRuleApi } from "@/lib/alerts";

export const runtime = "nodejs";

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
    .from("alert_rules")
    .select("id,user_id,organization_id,name,enabled,rule_trigger,destination_ids,created_at,updated_at")
    .order("created_at", { ascending: false });

  q = organizationId
    ? q.eq("organization_id", organizationId)
    : q.is("organization_id", null).eq("user_id", user.id);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rules = (data ?? [])
    .map((r) => toRuleApi(r as Record<string, unknown>))
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return NextResponse.json({ rules, activeOrganizationId: organizationId });
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
  const triggerRaw = body.trigger ?? body.rule_trigger;
  const enabled = typeof body.enabled === "boolean" ? body.enabled : true;
  const destinationIdsRaw = body.destinationIds ?? body.destination_ids;
  const destinationIds = Array.isArray(destinationIdsRaw)
    ? destinationIdsRaw.filter((x): x is string => typeof x === "string")
    : [];

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!isAlertRuleTrigger(triggerRaw)) {
    return NextResponse.json({ error: "Invalid trigger" }, { status: 400 });
  }
  if (destinationIds.length === 0) {
    return NextResponse.json({ error: "At least one destination id is required" }, { status: 400 });
  }

  const organizationId = await resolveListOrganizationId(supabase, user.id);
  const okDest = await validateDestinationIds(supabase, destinationIds, user.id, organizationId);
  if (!okDest) {
    return NextResponse.json(
      { error: "Every destination must exist and match the active workspace scope" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("alert_rules")
    .insert({
      user_id: user.id,
      organization_id: organizationId,
      name: name.slice(0, 160),
      enabled,
      rule_trigger: triggerRaw,
      destination_ids: destinationIds,
    })
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
