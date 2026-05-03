import { NextResponse } from "next/server";
import { timingSafeStringEqual } from "@/lib/secure-compare";
import { apiJsonError } from "@/lib/api-json-error";
import { createAdminClient } from "@/lib/supabase/admin";
import { executeManualScheduleRun, type ScheduleRunContext } from "@/lib/scan-schedule-executor";
import { isScanScheduleFrequency, isScanScheduleScopeType, type ScanScheduleFrequency } from "@/lib/scan-schedules";

export const runtime = "nodejs";

/**
 * Cron hook for Vercel Cron / external worker. Set `TORQA_CRON_SECRET` and send:
 *   Authorization: Bearer <TORQA_CRON_SECRET>
 */
export async function POST(request: Request) {
  const secret = process.env.TORQA_CRON_SECRET?.trim();
  if (!secret) {
    return apiJsonError(request, 503, "TORQA_CRON_SECRET is not configured", "service_unavailable");
  }

  const auth = request.headers.get("authorization")?.trim() ?? "";
  const expected = `Bearer ${secret}`;
  if (!timingSafeStringEqual(auth, expected)) {
    return apiJsonError(request, 401, "Unauthorized", "unauthorized");
  }

  const admin = createAdminClient();
  if (!admin) {
    return apiJsonError(request, 503, "Supabase admin client is not configured", "service_unavailable");
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from("scan_schedules")
    .select(
      "id,name,user_id,organization_id,scope_type,scope_id,frequency,enabled,workspace_policy_id,cron_expression,cron_timezone,next_run_at"
    )
    .eq("enabled", true)
    .neq("frequency", "manual")
    .lte("next_run_at", nowIso)
    .order("next_run_at", { ascending: true })
    .limit(25);
  if (error) {
    return NextResponse.json(
      {
        ok: false,
        schedules_checked: 0,
        schedules_run: 0,
        succeeded: 0,
        failed: 1,
        errors: [{ scheduleId: null, error: error.message }],
      },
      { status: 500 }
    );
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  const errors: Array<{ scheduleId: string | null; error: string }> = [];
  let schedulesRun = 0;
  let succeeded = 0;
  let failed = 0;

  for (const r of rows) {
    if (
      typeof r.id !== "string" ||
      typeof r.name !== "string" ||
      typeof r.user_id !== "string" ||
      typeof r.scope_id !== "string" ||
      !isScanScheduleScopeType(r.scope_type) ||
      !isScanScheduleFrequency(r.frequency) ||
      typeof r.enabled !== "boolean"
    ) {
      failed += 1;
      errors.push({ scheduleId: typeof r.id === "string" ? r.id : null, error: "Invalid schedule row" });
      continue;
    }
    const schedule: ScheduleRunContext = {
      id: r.id,
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
    schedulesRun += 1;
    const outcome = await executeManualScheduleRun(admin, schedule.user_id, schedule);
    if (outcome.kind === "completed" || outcome.kind === "completed_integration") {
      succeeded += 1;
    } else {
      failed += 1;
      errors.push({ scheduleId: schedule.id, error: outcome.error });
    }
  }

  return NextResponse.json({
    ok: failed === 0,
    schedules_checked: rows.length,
    schedules_run: schedulesRun,
    succeeded,
    failed,
    errors,
  });
}
