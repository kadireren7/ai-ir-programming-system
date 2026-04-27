export type AlertDestinationType = "in_app" | "slack" | "discord" | "email";

export type AlertRuleTrigger =
  | "scan_failed"
  | "scan_needs_review"
  | "high_severity_finding"
  | "schedule_failed";

export function isAlertDestinationType(v: unknown): v is AlertDestinationType {
  return v === "in_app" || v === "slack" || v === "discord" || v === "email";
}

export function isAlertRuleTrigger(v: unknown): v is AlertRuleTrigger {
  return (
    v === "scan_failed" ||
    v === "scan_needs_review" ||
    v === "high_severity_finding" ||
    v === "schedule_failed"
  );
}

export function maskDestinationConfig(
  type: AlertDestinationType,
  config: Record<string, unknown>
): Record<string, unknown> {
  const out = { ...config };
  if (type === "slack" || type === "discord") {
    delete out.webhookUrl;
    out.webhookConfigured = Boolean(
      typeof config.webhookUrl === "string" && (config.webhookUrl as string).trim().length > 0
    );
  }
  if (type === "email") {
    delete out.address;
    out.emailConfigured = Boolean(typeof config.address === "string" && (config.address as string).trim().length > 0);
  }
  return out;
}

export function toDestinationApi(row: Record<string, unknown>): {
  id: string;
  userId: string;
  organizationId: string | null;
  type: AlertDestinationType;
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
} | null {
  if (
    typeof row.id !== "string" ||
    typeof row.user_id !== "string" ||
    typeof row.name !== "string" ||
    typeof row.enabled !== "boolean" ||
    !isAlertDestinationType(row.type) ||
    typeof row.created_at !== "string" ||
    typeof row.updated_at !== "string"
  ) {
    return null;
  }
  const rawConfig =
    row.config && typeof row.config === "object" && !Array.isArray(row.config)
      ? (row.config as Record<string, unknown>)
      : {};
  return {
    id: row.id,
    userId: row.user_id,
    organizationId: typeof row.organization_id === "string" ? row.organization_id : null,
    type: row.type,
    name: row.name,
    enabled: row.enabled,
    config: maskDestinationConfig(row.type, rawConfig),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toRuleApi(row: Record<string, unknown>): {
  id: string;
  userId: string;
  organizationId: string | null;
  name: string;
  enabled: boolean;
  trigger: AlertRuleTrigger;
  destinationIds: string[];
  createdAt: string;
  updatedAt: string;
} | null {
  const triggerRaw = row.rule_trigger ?? row.trigger;
  if (
    typeof row.id !== "string" ||
    typeof row.user_id !== "string" ||
    typeof row.name !== "string" ||
    typeof row.enabled !== "boolean" ||
    !isAlertRuleTrigger(triggerRaw) ||
    typeof row.created_at !== "string" ||
    typeof row.updated_at !== "string"
  ) {
    return null;
  }
  const ids = Array.isArray(row.destination_ids)
    ? (row.destination_ids as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  return {
    id: row.id,
    userId: row.user_id,
    organizationId: typeof row.organization_id === "string" ? row.organization_id : null,
    name: row.name,
    enabled: row.enabled,
    trigger: triggerRaw,
    destinationIds: ids,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
