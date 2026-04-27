import type { SupabaseClient } from "@supabase/supabase-js";
import { getScanProvider, ScanProviderExecutionError } from "@/lib/scan/providers";
import { isScanApiSuccess } from "@/lib/scan-api-guards";
import type { ScanApiSuccess, ScanSource } from "@/lib/scan-engine";
import { dispatchScanNotificationsForUser } from "@/lib/scan-notification-dispatch";
import { resolveScanPolicy } from "@/lib/resolve-scan-policy";
import { evaluateScanAgainstPolicy } from "@/lib/policy-evaluator";
import { dispatchAlertRulesForScheduleFailure } from "@/lib/alert-dispatch";
import { isPlainObject } from "@/lib/json-guards";
import { logWorkspaceActivity, notifyWorkspaceMembers } from "@/lib/workspace-activity";
import { computeNextRunAfter, type ScanScheduleFrequency, type ScanScheduleScopeType } from "@/lib/scan-schedules";

export type ScheduleRunContext = {
  id: string;
  name: string;
  user_id: string;
  organization_id: string | null;
  scope_type: ScanScheduleScopeType;
  scope_id: string;
  frequency: ScanScheduleFrequency;
  enabled: boolean;
  workspace_policy_id: string | null;
};

type TemplateRow = {
  id: string;
  name: string;
  source: string;
  content: unknown;
  organization_id: string | null;
};

function orgMatches(a: string | null, b: string | null): boolean {
  return (a ?? null) === (b ?? null);
}

async function insertTerminalFailedRun(
  supabase: SupabaseClient,
  scheduleId: string,
  message: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("scan_schedule_runs")
    .insert({
      schedule_id: scheduleId,
      status: "failed",
      error: message.slice(0, 8000),
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) return null;
  return typeof data?.id === "string" ? data.id : null;
}

function fireScheduleFailedAlerts(
  supabase: SupabaseClient,
  userId: string,
  schedule: ScheduleRunContext,
  error: string
): void {
  void dispatchAlertRulesForScheduleFailure(supabase, {
    actorUserId: userId,
    organizationId: schedule.organization_id,
    scheduleId: schedule.id,
    scheduleName: schedule.name,
    error,
  }).catch(() => {});
}

async function bumpScheduleAfterAttempt(
  supabase: SupabaseClient,
  schedule: ScheduleRunContext
): Promise<void> {
  const now = new Date();
  const next =
    schedule.enabled && schedule.frequency !== "manual"
      ? computeNextRunAfter(now, schedule.frequency)?.toISOString() ?? null
      : null;

  await supabase
    .from("scan_schedules")
    .update({
      last_run_at: now.toISOString(),
      next_run_at: next,
    })
    .eq("id", schedule.id);
}

export type ManualRunOutcome =
  | { kind: "integration_not_implemented" }
  | { kind: "failed"; runId: string | null; error: string }
  | {
      kind: "completed";
      runId: string;
      scanId: string;
      result: {
        status: string;
        riskScore: number;
        policyStatus?: string | null;
        appliedPolicyName?: string | null;
      };
    };

export async function executeManualScheduleRun(
  supabase: SupabaseClient,
  userId: string,
  schedule: ScheduleRunContext
): Promise<ManualRunOutcome> {
  if (schedule.scope_type === "integration") {
    return { kind: "integration_not_implemented" };
  }

  const { data: tpl, error: tplErr } = await supabase
    .from("workflow_templates")
    .select("id,name,source,content,organization_id")
    .eq("id", schedule.scope_id)
    .maybeSingle();

  if (tplErr || !tpl) {
    const runId = await insertTerminalFailedRun(
      supabase,
      schedule.id,
      "Workflow template not found or inaccessible."
    );
    await bumpScheduleAfterAttempt(supabase, schedule);
    fireScheduleFailedAlerts(supabase, userId, schedule, "Workflow template not found or inaccessible.");
    return { kind: "failed", runId, error: "Workflow template not found or inaccessible." };
  }

  const template = tpl as TemplateRow;
  if (template.source !== "n8n" && template.source !== "generic") {
    const runId = await insertTerminalFailedRun(supabase, schedule.id, "Invalid template source.");
    await bumpScheduleAfterAttempt(supabase, schedule);
    fireScheduleFailedAlerts(supabase, userId, schedule, "Invalid template source.");
    return { kind: "failed", runId, error: "Invalid template source." };
  }
  if (!isPlainObject(template.content)) {
    const runId = await insertTerminalFailedRun(supabase, schedule.id, "Invalid stored template content.");
    await bumpScheduleAfterAttempt(supabase, schedule);
    fireScheduleFailedAlerts(supabase, userId, schedule, "Invalid stored template content.");
    return { kind: "failed", runId, error: "Invalid stored template content." };
  }
  if (!orgMatches(template.organization_id ?? null, schedule.organization_id)) {
    const runId = await insertTerminalFailedRun(
      supabase,
      schedule.id,
      "Template workspace scope does not match this schedule."
    );
    await bumpScheduleAfterAttempt(supabase, schedule);
    fireScheduleFailedAlerts(
      supabase,
      userId,
      schedule,
      "Template workspace scope does not match this schedule."
    );
    return { kind: "failed", runId, error: "Template workspace scope does not match this schedule." };
  }

  const { data: runQueued, error: runInsErr } = await supabase
    .from("scan_schedule_runs")
    .insert({ schedule_id: schedule.id, status: "queued" })
    .select("id")
    .single();

  if (runInsErr || !runQueued?.id) {
    await bumpScheduleAfterAttempt(supabase, schedule);
    fireScheduleFailedAlerts(
      supabase,
      userId,
      schedule,
      runInsErr?.message ?? "Could not create run row."
    );
    return { kind: "failed", runId: null, error: runInsErr?.message ?? "Could not create run row." };
  }

  const runId = runQueued.id as string;
  const started = new Date().toISOString();
  await supabase
    .from("scan_schedule_runs")
    .update({ status: "running", started_at: started })
    .eq("id", runId);

  const source = template.source as ScanSource;
  let payload: unknown;
  try {
    const provider = getScanProvider();
    payload = await provider.scan({ source, content: template.content as Record<string, unknown> });
  } catch (e) {
    const msg = e instanceof ScanProviderExecutionError ? e.message : "Scan provider error.";
    await supabase
      .from("scan_schedule_runs")
      .update({
        status: "failed",
        error: msg.slice(0, 8000),
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);
    await bumpScheduleAfterAttempt(supabase, schedule);
    fireScheduleFailedAlerts(supabase, userId, schedule, msg);
    return { kind: "failed", runId, error: msg };
  }

  if (!isScanApiSuccess(payload)) {
    await supabase
      .from("scan_schedule_runs")
      .update({
        status: "failed",
        error: "Scan returned an invalid payload.",
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);
    await bumpScheduleAfterAttempt(supabase, schedule);
    fireScheduleFailedAlerts(supabase, userId, schedule, "Scan returned an invalid payload.");
    return { kind: "failed", runId, error: "Scan returned an invalid payload." };
  }

  let scanResult: ScanApiSuccess = payload;
  if (schedule.workspace_policy_id) {
    const resolved = await resolveScanPolicy(supabase, {
      workspacePolicyId: schedule.workspace_policy_id,
      policyTemplateSlug: null,
    });
    if (resolved) {
      scanResult = {
        ...scanResult,
        policyEvaluation: evaluateScanAgainstPolicy(scanResult, resolved.name, resolved.config),
      };
    }
  }

  const orgId = schedule.organization_id;
  const { data: scanRow, error: scanErr } = await supabase
    .from("scan_history")
    .insert({
      user_id: userId,
      source,
      workflow_name: template.name.slice(0, 512),
      result: scanResult,
      organization_id: orgId,
    })
    .select("id")
    .single();

  if (scanErr || !scanRow?.id) {
    await supabase
      .from("scan_schedule_runs")
      .update({
        status: "failed",
        error: (scanErr?.message ?? "Could not persist scan history.").slice(0, 8000),
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);
    await bumpScheduleAfterAttempt(supabase, schedule);
    fireScheduleFailedAlerts(
      supabase,
      userId,
      schedule,
      scanErr?.message ?? "Could not persist scan history."
    );
    return { kind: "failed", runId, error: scanErr?.message ?? "Could not persist scan history." };
  }

  const scanId = scanRow.id as string;

  await logWorkspaceActivity(supabase, orgId, "scan.created", scanId, {
    source,
    workflowName: template.name,
    status: scanResult.status,
    via: "scan_schedule",
    scheduleId: schedule.id,
  });
  await notifyWorkspaceMembers(
    supabase,
    orgId,
    "Scheduled scan saved",
    `A ${source} scan was saved from schedule "${schedule.name}"${template.name ? ` for "${template.name}"` : ""}.`,
    scanResult.status === "FAIL" ? "warning" : "info",
    { scanId, status: scanResult.status, scheduleId: schedule.id }
  );
  void dispatchScanNotificationsForUser(userId, scanResult, source, orgId, "scan_schedule").catch(() => {});

  const completedAt = new Date().toISOString();
  await supabase
    .from("scan_schedule_runs")
    .update({
      status: "completed",
      completed_at: completedAt,
      result: {
        scanId,
        status: scanResult.status,
        riskScore: scanResult.riskScore,
        engine: scanResult.engine,
        source,
        policyStatus: scanResult.policyEvaluation?.policyStatus ?? null,
        appliedPolicyName: scanResult.policyEvaluation?.appliedPolicyName ?? null,
      },
      error: null,
    })
    .eq("id", runId);

  await bumpScheduleAfterAttempt(supabase, schedule);

  return {
    kind: "completed",
    runId,
    scanId,
    result: {
      status: scanResult.status,
      riskScore: scanResult.riskScore,
      policyStatus: scanResult.policyEvaluation?.policyStatus ?? null,
      appliedPolicyName: scanResult.policyEvaluation?.appliedPolicyName ?? null,
    },
  };
}
