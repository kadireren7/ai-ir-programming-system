export type AlertDestinationType = "in_app" | "slack" | "discord" | "teams" | "email" | "webhook";

export type AlertRuleTrigger =
  // scan triggers
  | "scan_failed"
  | "scan_needs_review"
  | "high_severity_finding"
  | "schedule_failed"
  // governance triggers (Block 6 — real-time signals)
  | "governance_decision"
  | "fix_applied"
  | "risk_accepted"
  | "risk_revoked"
  | "approval_pending"
  | "approval_decided"
  | "mode_changed";

/**
 * Optional filters narrowing when an alert rule fires. Keys are AND-ed; values
 * inside each array are OR-ed. Empty/missing keys are wildcards.
 *
 * - severities[]      info | review | high | critical
 * - sources[]         n8n | github | generic | webhook | pipedream | ai-agent | make | zapier | lambda
 * - decisionTypes[]   apply_fix | accept_risk | revoke_risk | approve_fix | reject_fix | mode_change | interactive_response
 * - targetPatterns[]  case-insensitive substring match against the affected target
 */
export type AlertRuleFilters = {
  severities?: string[];
  sources?: string[];
  decisionTypes?: string[];
  targetPatterns?: string[];
};

export function isAlertDestinationType(v: unknown): v is AlertDestinationType {
  return (
    v === "in_app" ||
    v === "slack" ||
    v === "discord" ||
    v === "teams" ||
    v === "email" ||
    v === "webhook"
  );
}

export function isAlertRuleTrigger(v: unknown): v is AlertRuleTrigger {
  return (
    v === "scan_failed" ||
    v === "scan_needs_review" ||
    v === "high_severity_finding" ||
    v === "schedule_failed" ||
    v === "governance_decision" ||
    v === "fix_applied" ||
    v === "risk_accepted" ||
    v === "risk_revoked" ||
    v === "approval_pending" ||
    v === "approval_decided" ||
    v === "mode_changed"
  );
}

export function maskDestinationConfig(
  type: AlertDestinationType,
  config: Record<string, unknown>
): Record<string, unknown> {
  const out = { ...config };
  if (type === "slack" || type === "discord" || type === "teams") {
    delete out.webhookUrl;
    out.webhookConfigured = Boolean(
      typeof config.webhookUrl === "string" && (config.webhookUrl as string).trim().length > 0
    );
  }
  if (type === "email") {
    delete out.address;
    out.emailConfigured = Boolean(typeof config.address === "string" && (config.address as string).trim().length > 0);
  }
  if (type === "webhook") {
    // Never echo the webhook URL or signing secret back to the client.
    const url = typeof config.url === "string" ? (config.url as string).trim() : "";
    const secret = typeof config.secret === "string" ? (config.secret as string).trim() : "";
    delete out.url;
    delete out.secret;
    out.webhookConfigured = Boolean(url);
    out.signingConfigured = Boolean(secret);
    if (url) {
      try {
        const u = new URL(url);
        out.webhookHost = u.host;
      } catch {
        out.webhookHost = null;
      }
    }
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

export function normalizeRuleFilters(value: unknown): AlertRuleFilters {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const v = value as Record<string, unknown>;
  const out: AlertRuleFilters = {};
  const arrayOfString = (raw: unknown): string[] | undefined => {
    if (!Array.isArray(raw)) return undefined;
    const list = raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, 64);
    return list.length > 0 ? list : undefined;
  };
  const sev = arrayOfString(v.severities);
  if (sev) out.severities = sev;
  const src = arrayOfString(v.sources);
  if (src) out.sources = src;
  const dt = arrayOfString(v.decisionTypes);
  if (dt) out.decisionTypes = dt;
  const tp = arrayOfString(v.targetPatterns);
  if (tp) out.targetPatterns = tp;
  return out;
}

export function toRuleApi(row: Record<string, unknown>): {
  id: string;
  userId: string;
  organizationId: string | null;
  name: string;
  enabled: boolean;
  trigger: AlertRuleTrigger;
  destinationIds: string[];
  filters: AlertRuleFilters;
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
    filters: normalizeRuleFilters(row.filters),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
