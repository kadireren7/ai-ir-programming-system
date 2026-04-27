import type { SupabaseClient } from "@supabase/supabase-js";
import type { ScanApiSuccess } from "@/lib/scan-engine";
import { notifyWorkspaceMembers } from "@/lib/workspace-activity";
import type { AlertDestinationType, AlertRuleTrigger } from "@/lib/alerts";

type DestinationRow = {
  id: string;
  user_id: string;
  organization_id: string | null;
  type: AlertDestinationType;
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
};

type RuleRow = {
  id: string;
  user_id: string;
  organization_id: string | null;
  name: string;
  enabled: boolean;
  rule_trigger: AlertRuleTrigger;
  destination_ids: string[];
};

function scanHasHighSeverityFindings(result: ScanApiSuccess): boolean {
  if (typeof result.totals?.high === "number" && result.totals.high > 0) return true;
  return result.findings.some((f) => f.severity === "high" || f.severity === "critical");
}

function triggersForScanResult(result: ScanApiSuccess): Set<AlertRuleTrigger> {
  const t = new Set<AlertRuleTrigger>();
  if (result.status === "FAIL") t.add("scan_failed");
  if (result.status === "NEEDS REVIEW") t.add("scan_needs_review");
  if (scanHasHighSeverityFindings(result)) t.add("high_severity_finding");
  return t;
}

async function placeholderAlertEmail(_to: string, subject: string, text: string): Promise<void> {
  void _to;
  void subject;
  void text;
}

async function postSlackWebhook(url: string, text: string): Promise<void> {
  if (!url.startsWith("https://")) return;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 5000);
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: ac.signal,
    });
  } catch {
    /* optional channel */
  } finally {
    clearTimeout(timer);
  }
}

async function postDiscordWebhook(url: string, content: string): Promise<void> {
  if (!url.startsWith("https://")) return;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 5000);
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
      signal: ac.signal,
    });
  } catch {
    /* optional channel */
  } finally {
    clearTimeout(timer);
  }
}

function rowToDestination(row: Record<string, unknown>): DestinationRow | null {
  const type = row.type;
  if (
    typeof row.id !== "string" ||
    typeof row.user_id !== "string" ||
    typeof row.name !== "string" ||
    typeof row.enabled !== "boolean" ||
    (type !== "in_app" && type !== "slack" && type !== "discord" && type !== "email")
  ) {
    return null;
  }
  const config =
    row.config && typeof row.config === "object" && !Array.isArray(row.config)
      ? (row.config as Record<string, unknown>)
      : {};
  return {
    id: row.id,
    user_id: row.user_id,
    organization_id: typeof row.organization_id === "string" ? row.organization_id : null,
    type,
    name: row.name,
    enabled: row.enabled,
    config,
  };
}

function rowToRule(row: Record<string, unknown>): RuleRow | null {
  const rt = row.rule_trigger;
  if (
    typeof row.id !== "string" ||
    typeof row.user_id !== "string" ||
    typeof row.name !== "string" ||
    typeof row.enabled !== "boolean" ||
    (rt !== "scan_failed" &&
      rt !== "scan_needs_review" &&
      rt !== "high_severity_finding" &&
      rt !== "schedule_failed")
  ) {
    return null;
  }
  const rawIds = row.destination_ids;
  const destination_ids = Array.isArray(rawIds)
    ? (rawIds as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  return {
    id: row.id,
    user_id: row.user_id,
    organization_id: typeof row.organization_id === "string" ? row.organization_id : null,
    name: row.name,
    enabled: row.enabled,
    rule_trigger: rt,
    destination_ids,
  };
}

function destinationMatchesScope(dest: DestinationRow, organizationId: string | null, actorUserId: string): boolean {
  if (organizationId === null) {
    return dest.organization_id === null && dest.user_id === actorUserId;
  }
  return dest.organization_id === organizationId;
}

export async function deliverToDestination(
  supabase: SupabaseClient,
  dest: DestinationRow,
  title: string,
  body: string,
  severity: "info" | "warning" | "critical",
  metadata: Record<string, unknown>
): Promise<void> {
  if (!dest.enabled) return;
  switch (dest.type) {
    case "in_app": {
      if (dest.organization_id) {
        await notifyWorkspaceMembers(supabase, dest.organization_id, title, body, severity, {
          ...metadata,
          destinationId: dest.id,
          channel: "alert_destination",
        });
      } else {
        await supabase.from("in_app_notifications").insert({
          user_id: dest.user_id,
          title,
          body,
          severity,
          metadata: { ...metadata, destinationId: dest.id, channel: "alert_destination" },
        });
      }
      break;
    }
    case "slack": {
      const url = typeof dest.config.webhookUrl === "string" ? dest.config.webhookUrl.trim() : "";
      if (!url) return;
      await postSlackWebhook(url, `*${title}*\n${body}`);
      break;
    }
    case "discord": {
      const url = typeof dest.config.webhookUrl === "string" ? dest.config.webhookUrl.trim() : "";
      if (!url) return;
      await postDiscordWebhook(url, `**${title}**\n${body}`);
      break;
    }
    case "email": {
      const addr = typeof dest.config.address === "string" ? dest.config.address.trim() : "";
      await placeholderAlertEmail(addr || "noreply@example.com", title, body);
      break;
    }
    default:
      break;
  }
}

async function loadRulesAndDestinations(
  supabase: SupabaseClient,
  actorUserId: string,
  organizationId: string | null
): Promise<{ rules: RuleRow[]; destinationsById: Map<string, DestinationRow> }> {
  const rules: RuleRow[] = [];

  const { data: personalRules } = await supabase
    .from("alert_rules")
    .select("id,user_id,organization_id,name,enabled,rule_trigger,destination_ids")
    .eq("user_id", actorUserId)
    .is("organization_id", null)
    .eq("enabled", true);

  for (const r of personalRules ?? []) {
    const row = rowToRule(r as Record<string, unknown>);
    if (row) rules.push(row);
  }

  if (organizationId) {
    const { data: orgRules } = await supabase
      .from("alert_rules")
      .select("id,user_id,organization_id,name,enabled,rule_trigger,destination_ids")
      .eq("organization_id", organizationId)
      .eq("enabled", true);

    for (const r of orgRules ?? []) {
      const row = rowToRule(r as Record<string, unknown>);
      if (row) rules.push(row);
    }
  }

  const destIdSet = new Set<string>();
  for (const rule of rules) {
    for (const id of rule.destination_ids) destIdSet.add(id);
  }
  if (destIdSet.size === 0) {
    return { rules, destinationsById: new Map() };
  }

  const { data: destRows } = await supabase
    .from("alert_destinations")
    .select("id,user_id,organization_id,type,name,enabled,config")
    .in("id", [...destIdSet])
    .eq("enabled", true);

  const destinationsById = new Map<string, DestinationRow>();
  for (const d of destRows ?? []) {
    const row = rowToDestination(d as Record<string, unknown>);
    if (row && destinationMatchesScope(row, organizationId, actorUserId)) {
      destinationsById.set(row.id, row);
    }
  }

  return { rules, destinationsById };
}

/**
 * Fires alert rules for scan outcomes (FAIL, NEEDS REVIEW, high/critical findings). Never throws.
 */
export async function dispatchAlertRulesForScanContext(
  supabase: SupabaseClient,
  opts: {
    actorUserId: string;
    organizationId: string | null;
    result: ScanApiSuccess;
    source: string;
    via?: string;
  }
): Promise<void> {
  try {
    const triggers = triggersForScanResult(opts.result);
    if (triggers.size === 0) return;

    const { rules, destinationsById } = await loadRulesAndDestinations(
      supabase,
      opts.actorUserId,
      opts.organizationId
    );

    const metaBase = {
      source: opts.source,
      status: opts.result.status,
      riskScore: opts.result.riskScore,
      engine: opts.result.engine,
      via: opts.via ?? "scan",
    };

    const deliveredDest = new Set<string>();

    for (const rule of rules) {
      if (!triggers.has(rule.rule_trigger)) continue;

      const title =
        rule.rule_trigger === "scan_failed"
          ? "Torqa: scan failed"
          : rule.rule_trigger === "scan_needs_review"
            ? "Torqa: scan needs review"
            : "Torqa: high-severity finding";

      const body = `Rule "${rule.name}" · ${opts.result.status} (score ${opts.result.riskScore}) · source ${opts.source}`;

      const severity: "warning" | "critical" =
        rule.rule_trigger === "scan_failed" || rule.rule_trigger === "high_severity_finding"
          ? "critical"
          : "warning";

      for (const destId of rule.destination_ids) {
        if (deliveredDest.has(destId)) continue;
        const dest = destinationsById.get(destId);
        if (!dest) continue;
        await deliverToDestination(supabase, dest, title, body, severity, {
          ...metaBase,
          ruleId: rule.id,
          ruleTrigger: rule.rule_trigger,
        });
        deliveredDest.add(destId);
      }
    }
  } catch {
    /* never break scan */
  }
}

/**
 * Fires rules with trigger `schedule_failed` after a schedule run could not complete.
 */
export async function dispatchAlertRulesForScheduleFailure(
  supabase: SupabaseClient,
  opts: {
    actorUserId: string;
    organizationId: string | null;
    scheduleId: string;
    scheduleName: string;
    error: string;
  }
): Promise<void> {
  try {
    const { rules, destinationsById } = await loadRulesAndDestinations(
      supabase,
      opts.actorUserId,
      opts.organizationId
    );

    const deliveredDest = new Set<string>();
    const title = "Torqa: scheduled scan failed";
    const body = `Schedule "${opts.scheduleName}" could not complete: ${opts.error.slice(0, 500)}`;

    for (const rule of rules) {
      if (rule.rule_trigger !== "schedule_failed") continue;
      for (const destId of rule.destination_ids) {
        if (deliveredDest.has(destId)) continue;
        const dest = destinationsById.get(destId);
        if (!dest) continue;
        await deliverToDestination(supabase, dest, title, body, "critical", {
          scheduleId: opts.scheduleId,
          ruleId: rule.id,
          ruleTrigger: rule.rule_trigger,
          via: "scan_schedule",
        });
        deliveredDest.add(destId);
      }
    }
  } catch {
    /* swallow */
  }
}

/** Sends a non-destructive test message to one destination (RLS: caller must manage the row). */
export async function sendTestForDestination(
  supabase: SupabaseClient,
  destId: string,
  message: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("alert_destinations")
    .select("id,user_id,organization_id,type,name,enabled,config")
    .eq("id", destId)
    .maybeSingle();
  if (error || !data) {
    return { ok: false, error: "Destination not found" };
  }
  const dest = rowToDestination(data as Record<string, unknown>);
  if (!dest) {
    return { ok: false, error: "Invalid destination" };
  }
  try {
    await deliverToDestination(supabase, dest, "Torqa test", message, "info", {
      kind: "destination_test",
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Test failed" };
  }
}
