import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { executeManualScheduleRun, type ScheduleRunContext } from "@/lib/scan-schedule-executor";
import { isScanScheduleFrequency, isScanScheduleScopeType, type ScanScheduleFrequency } from "@/lib/scan-schedules";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Ctx) {
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

  const { data: row, error } = await supabase
    .from("scan_schedules")
    .select(
      "id,name,user_id,organization_id,scope_type,scope_id,frequency,enabled,workspace_policy_id,cron_expression,cron_timezone"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  const r = row as Record<string, unknown>;
  if (
    typeof r.name !== "string" ||
    typeof r.user_id !== "string" ||
    typeof r.scope_id !== "string" ||
    !isScanScheduleScopeType(r.scope_type) ||
    typeof r.enabled !== "boolean" ||
    !isScanScheduleFrequency(r.frequency)
  ) {
    return NextResponse.json({ error: "Invalid schedule row" }, { status: 500 });
  }

  const schedule: ScheduleRunContext = {
    id: r.id as string,
    name: r.name,
    user_id: r.user_id,
    organization_id: typeof r.organization_id === "string" ? r.organization_id : null,
    scope_type: r.scope_type,
    scope_id: r.scope_id,
    frequency: r.frequency as ScanScheduleFrequency,
    enabled: r.enabled,
    workspace_policy_id: typeof r.workspace_policy_id === "string" ? r.workspace_policy_id : null,
    cron_expression: typeof r.cron_expression === "string" ? r.cron_expression : null,
    cron_timezone: typeof r.cron_timezone === "string" ? r.cron_timezone : null,
  };
  if (!schedule.enabled) {
    return NextResponse.json(
      {
        ok: false,
        schedules_checked: 1,
        schedules_run: 0,
        succeeded: 0,
        failed: 1,
        errors: [{ scheduleId: schedule.id, error: "Schedule is disabled." }],
      },
      { status: 409 }
    );
  }

  const outcome = await executeManualScheduleRun(supabase, user.id, schedule);

  if (outcome.kind === "completed_integration") {
    return NextResponse.json({
      ok: true,
      schedules_checked: 1,
      schedules_run: 1,
      succeeded: 1,
      failed: 0,
      errors: [],
      runId: outcome.runId,
      scanIds: outcome.scanIds,
      totalWorkflows: outcome.totalWorkflows,
      workflowsSucceeded: outcome.succeeded,
      workflowsFailed: outcome.failed,
    });
  }

  if (outcome.kind === "failed") {
    return NextResponse.json(
      {
        ok: false,
        schedules_checked: 1,
        schedules_run: 1,
        succeeded: 0,
        failed: 1,
        errors: [{ scheduleId: schedule.id, error: outcome.error }],
        runId: outcome.runId,
        error: outcome.error,
      },
      { status: 422 }
    );
  }

  return NextResponse.json({
    ok: true,
    schedules_checked: 1,
    schedules_run: 1,
    succeeded: 1,
    failed: 0,
    errors: [],
    runId: outcome.runId,
    scanId: outcome.scanId,
    result: outcome.result,
  });
}
