import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPlainObject } from "@/lib/json-guards";
import {
  initialNextRunAt,
  isScanScheduleFrequency,
  toScheduleApi,
  type ScanScheduleFrequency,
} from "@/lib/scan-schedules";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Ctx) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing schedule id" }, { status: 400 });
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
    .from("scan_schedules")
    .select(
      "id,user_id,organization_id,name,scope_type,scope_id,frequency,enabled,workspace_policy_id,last_run_at,next_run_at,created_at,updated_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (selErr || !existing) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  const row = existing as Record<string, unknown>;
  const name =
    typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 200) : (row.name as string);

  let frequency: ScanScheduleFrequency = row.frequency as ScanScheduleFrequency;
  if (body.frequency !== undefined) {
    if (!isScanScheduleFrequency(body.frequency)) {
      return NextResponse.json({ error: "Invalid frequency" }, { status: 400 });
    }
    frequency = body.frequency;
  }

  const enabled = typeof body.enabled === "boolean" ? body.enabled : (row.enabled as boolean);

  const freqChanged = body.frequency !== undefined && frequency !== row.frequency;
  const enabledChanged = body.enabled !== undefined && enabled !== row.enabled;
  const nextRunAt =
    freqChanged || enabledChanged ? initialNextRunAt(enabled, frequency) : (row.next_run_at as string | null);

  const orgIdForPolicy = typeof row.organization_id === "string" ? row.organization_id : null;

  let workspacePolicyIdUpdate: string | null | undefined = undefined;
  if ("workspacePolicyId" in body || "workspace_policy_id" in body) {
    const wpBody = body.workspacePolicyId ?? body.workspace_policy_id;
    if (wpBody === null || wpBody === "") {
      workspacePolicyIdUpdate = null;
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
      if ((polOrg ?? null) !== (orgIdForPolicy ?? null)) {
        return NextResponse.json(
          {
            error:
              "Policy must belong to the same workspace scope as the schedule (or personal when schedule is personal).",
          },
          { status: 400 }
        );
      }
      workspacePolicyIdUpdate = wid;
    } else {
      return NextResponse.json({ error: "Invalid workspacePolicyId" }, { status: 400 });
    }
  }

  const updateRow: Record<string, unknown> = {
    name,
    frequency,
    enabled,
    next_run_at: nextRunAt ?? null,
  };
  if (workspacePolicyIdUpdate !== undefined) {
    updateRow.workspace_policy_id = workspacePolicyIdUpdate;
  }

  const { data, error } = await supabase
    .from("scan_schedules")
    .update(updateRow)
    .eq("id", id)
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

export async function DELETE(_request: Request, context: Ctx) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing schedule id" }, { status: 400 });
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

  const { error } = await supabase.from("scan_schedules").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
