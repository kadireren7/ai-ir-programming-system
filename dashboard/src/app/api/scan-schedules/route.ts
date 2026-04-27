import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveListOrganizationId } from "@/lib/workspace-scope";
import { isPlainObject } from "@/lib/json-guards";
import {
  initialNextRunAt,
  isScanScheduleFrequency,
  isScanScheduleScopeType,
  toRunApi,
  toScheduleApi,
} from "@/lib/scan-schedules";

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

  let query = supabase
    .from("scan_schedules")
    .select(
      "id,user_id,organization_id,name,scope_type,scope_id,frequency,enabled,workspace_policy_id,last_run_at,next_run_at,created_at,updated_at"
    )
    .order("created_at", { ascending: false });

  query = organizationId
    ? query.eq("organization_id", organizationId)
    : query.is("organization_id", null).eq("user_id", user.id);

  const { data: rows, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const schedules = (rows ?? [])
    .map((r) => toScheduleApi(r as Record<string, unknown>))
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const ids = schedules.map((s) => s.id);
  const lastRuns: Record<string, NonNullable<ReturnType<typeof toRunApi>>> = {};

  if (ids.length > 0) {
    const { data: runRows, error: runErr } = await supabase
      .from("scan_schedule_runs")
      .select("id,schedule_id,status,result,error,started_at,completed_at,created_at")
      .in("schedule_id", ids)
      .order("created_at", { ascending: false });

    if (!runErr && runRows) {
      for (const raw of runRows) {
        const sid = (raw as { schedule_id?: string }).schedule_id;
        if (typeof sid !== "string" || lastRuns[sid]) continue;
        const mapped = toRunApi(raw as Record<string, unknown>);
        if (mapped) lastRuns[sid] = mapped;
      }
    }
  }

  return NextResponse.json({
    schedules,
    lastRuns,
    activeOrganizationId: organizationId,
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!isPlainObject(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const scopeTypeRaw = body.scopeType ?? body.scope_type;
  const scopeId = typeof body.scopeId === "string" ? body.scopeId : typeof body.scope_id === "string" ? body.scope_id : "";
  const frequencyRaw = body.frequency;
  const enabled = typeof body.enabled === "boolean" ? body.enabled : true;

  if (!name) {
    return NextResponse.json({ error: 'Field "name" is required' }, { status: 400 });
  }
  if (!isScanScheduleScopeType(scopeTypeRaw)) {
    return NextResponse.json({ error: "Invalid scopeType" }, { status: 400 });
  }
  if (!scopeId) {
    return NextResponse.json({ error: "scopeId is required" }, { status: 400 });
  }
  if (!isScanScheduleFrequency(frequencyRaw)) {
    return NextResponse.json({ error: "Invalid frequency" }, { status: 400 });
  }

  const organizationId = await resolveListOrganizationId(supabase, user.id);

  if (scopeTypeRaw === "workflow_template") {
    const { data: tpl, error: te } = await supabase
      .from("workflow_templates")
      .select("id, organization_id")
      .eq("id", scopeId)
      .maybeSingle();
    if (te || !tpl) {
      return NextResponse.json({ error: "Workflow template not found" }, { status: 404 });
    }
    const tplOrg = (tpl as { organization_id?: string | null }).organization_id ?? null;
    if ((organizationId ?? null) !== (tplOrg ?? null)) {
      return NextResponse.json(
        { error: "Template must belong to the same workspace scope as the active workspace (or personal)." },
        { status: 400 }
      );
    }
  } else {
    const { data: row, error: ie } = await supabase
      .from("integrations")
      .select("id, organization_id")
      .eq("id", scopeId)
      .maybeSingle();
    if (ie || !row) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }
    const intOrg = (row as { organization_id?: string | null }).organization_id ?? null;
    if ((organizationId ?? null) !== (intOrg ?? null)) {
      return NextResponse.json(
        { error: "Integration must belong to the same workspace scope as the active workspace (or personal)." },
        { status: 400 }
      );
    }
  }

  const nextRunAt = initialNextRunAt(enabled, frequencyRaw);

  let workspacePolicyIdInsert: string | null | undefined = undefined;
  if ("workspacePolicyId" in body || "workspace_policy_id" in body) {
    const wpBody = body.workspacePolicyId ?? body.workspace_policy_id;
    if (wpBody === null || wpBody === "") {
      workspacePolicyIdInsert = null;
    } else if (typeof wpBody === "string" && wpBody.trim()) {
      const wid = wpBody.trim();
      const { data: pol, error: pe } = await supabase
        .from("workspace_policies")
        .select("organization_id")
        .eq("id", wid)
        .maybeSingle();
      if (pe || !pol) {
        return NextResponse.json({ error: "Policy not found" }, { status: 404 });
      }
      const polOrg = (pol as { organization_id?: string | null }).organization_id ?? null;
      if ((polOrg ?? null) !== (organizationId ?? null)) {
        return NextResponse.json(
          {
            error:
              "Policy must belong to the same workspace scope as the active workspace (or personal).",
          },
          { status: 400 }
        );
      }
      workspacePolicyIdInsert = wid;
    } else {
      return NextResponse.json({ error: "Invalid workspacePolicyId" }, { status: 400 });
    }
  }

  const insertRow: Record<string, unknown> = {
    user_id: user.id,
    organization_id: organizationId,
    name: name.slice(0, 200),
    scope_type: scopeTypeRaw,
    scope_id: scopeId,
    frequency: frequencyRaw,
    enabled,
    next_run_at: nextRunAt,
  };
  if (workspacePolicyIdInsert !== undefined) {
    insertRow.workspace_policy_id = workspacePolicyIdInsert;
  }

  const { data, error } = await supabase
    .from("scan_schedules")
    .insert(insertRow)
    .select(
      "id,user_id,organization_id,name,scope_type,scope_id,frequency,enabled,workspace_policy_id,last_run_at,next_run_at,created_at,updated_at"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const schedule = toScheduleApi((data ?? {}) as Record<string, unknown>);
  if (!schedule) {
    return NextResponse.json({ error: "Invalid schedule row" }, { status: 500 });
  }
  return NextResponse.json({ schedule });
}
