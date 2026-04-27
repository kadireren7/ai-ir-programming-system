export type ScanScheduleScopeType = "workflow_template" | "integration";
export type ScanScheduleFrequency = "daily" | "weekly" | "manual";
export type ScanScheduleRunStatus = "queued" | "running" | "completed" | "failed";

export function isScanScheduleScopeType(v: unknown): v is ScanScheduleScopeType {
  return v === "workflow_template" || v === "integration";
}

export function isScanScheduleFrequency(v: unknown): v is ScanScheduleFrequency {
  return v === "daily" || v === "weekly" || v === "manual";
}

export function isScanScheduleRunStatus(v: unknown): v is ScanScheduleRunStatus {
  return v === "queued" || v === "running" || v === "completed" || v === "failed";
}

export function initialNextRunAt(enabled: boolean, frequency: ScanScheduleFrequency): string | null {
  if (!enabled || frequency === "manual") return null;
  const from = new Date();
  const next = computeNextRunAfter(from, frequency);
  return next ? next.toISOString() : null;
}

export function computeNextRunAfter(from: Date, frequency: ScanScheduleFrequency): Date | null {
  if (frequency === "manual") return null;
  const d = new Date(from.getTime());
  if (frequency === "daily") d.setUTCDate(d.getUTCDate() + 1);
  else d.setUTCDate(d.getUTCDate() + 7);
  return d;
}

export function toScheduleApi(row: Record<string, unknown>): {
  id: string;
  userId: string;
  organizationId: string | null;
  name: string;
  scopeType: ScanScheduleScopeType;
  scopeId: string;
  frequency: ScanScheduleFrequency;
  enabled: boolean;
  workspacePolicyId: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
} | null {
  if (
    typeof row.id !== "string" ||
    typeof row.user_id !== "string" ||
    typeof row.name !== "string" ||
    !isScanScheduleScopeType(row.scope_type) ||
    typeof row.scope_id !== "string" ||
    !isScanScheduleFrequency(row.frequency) ||
    typeof row.enabled !== "boolean" ||
    typeof row.created_at !== "string" ||
    typeof row.updated_at !== "string"
  ) {
    return null;
  }
  const workspacePolicyId =
    typeof row.workspace_policy_id === "string" && row.workspace_policy_id ? row.workspace_policy_id : null;

  return {
    id: row.id,
    userId: row.user_id,
    organizationId: typeof row.organization_id === "string" ? row.organization_id : null,
    name: row.name,
    scopeType: row.scope_type,
    scopeId: row.scope_id,
    frequency: row.frequency,
    enabled: row.enabled,
    workspacePolicyId,
    lastRunAt: typeof row.last_run_at === "string" ? row.last_run_at : null,
    nextRunAt: typeof row.next_run_at === "string" ? row.next_run_at : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toRunApi(row: Record<string, unknown>): {
  id: string;
  scheduleId: string;
  status: ScanScheduleRunStatus;
  result: Record<string, unknown> | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
} | null {
  if (
    typeof row.id !== "string" ||
    typeof row.schedule_id !== "string" ||
    !isScanScheduleRunStatus(row.status) ||
    typeof row.created_at !== "string"
  ) {
    return null;
  }
  let result: Record<string, unknown> | null = null;
  if (row.result && typeof row.result === "object" && !Array.isArray(row.result)) {
    result = row.result as Record<string, unknown>;
  }
  return {
    id: row.id,
    scheduleId: row.schedule_id,
    status: row.status,
    result,
    error: typeof row.error === "string" ? row.error : null,
    startedAt: typeof row.started_at === "string" ? row.started_at : null,
    completedAt: typeof row.completed_at === "string" ? row.completed_at : null,
    createdAt: row.created_at,
  };
}
