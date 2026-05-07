import type { SupabaseClient } from "@supabase/supabase-js";
import type { ScanApiSuccess } from "@/lib/scan-engine";
import { notifyWorkspaceMembers } from "@/lib/workspace-activity";
import type { AlertDestinationType, AlertRuleTrigger } from "@/lib/alerts";
import { validateDiscordWebhookUrlForOutbound, validateSlackWebhookUrlForOutbound, validateTeamsWebhookUrlForOutbound } from "@/lib/webhook-ssrf";
import { createAdminClient } from "@/lib/supabase/admin";
import { postSignedGovernanceWebhook } from "@/lib/governance-signals";
import { isAlertRuleTrigger } from "@/lib/alerts";

/* ─── Alert message template ─────────────────────────────────── */

type AlertContext = {
  ruleName: string;
  ruleTrigger: AlertRuleTrigger;
  result: ScanApiSuccess;
  workflowName?: string;
  scanId?: string;
  appUrl?: string;
};

function buildAlertTitle(ctx: AlertContext): string {
  const decision = ctx.result.status === "FAIL" ? "Blocked" : ctx.result.status === "NEEDS REVIEW" ? "Review Required" : "Passed";
  const wf = ctx.workflowName ? ` — ${ctx.workflowName}` : "";
  return `Torqa: ${decision}${wf}`;
}

function buildAlertBody(ctx: AlertContext): string {
  const lines: string[] = [];
  lines.push(`Decision:    ${ctx.result.status}`);
  lines.push(`Trust score: ${ctx.result.riskScore}/100`);
  if (ctx.workflowName) lines.push(`Workflow:    ${ctx.workflowName}`);
  lines.push(`Source:      ${ctx.result.source}`);
  lines.push(`Rule:        "${ctx.ruleName}"`);
  if (ctx.result.findings.length > 0) {
    const crit = ctx.result.totals.high;
    const rev  = ctx.result.totals.review;
    const parts = [];
    if (crit) parts.push(`${crit} critical`);
    if (rev)  parts.push(`${rev} review`);
    if (parts.length) lines.push(`Findings:    ${parts.join(", ")}`);
  }
  if (ctx.scanId && ctx.appUrl) {
    lines.push(`Report:      ${ctx.appUrl}/scan/${ctx.scanId}`);
  }
  return lines.join("\n");
}

/* ─── Delivery log ───────────────────────────────────────────── */

async function logDelivery(opts: {
  userId: string;
  ruleId?: string;
  destinationId?: string;
  destinationType: string;
  ruleTrigger?: string;
  status: "ok" | "error" | "test";
  errorMessage?: string;
  workflowName?: string;
  scanDecision?: string;
  riskScore?: number;
}): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  await admin.from("alert_deliveries").insert({
    user_id: opts.userId,
    rule_id: opts.ruleId ?? null,
    destination_id: opts.destinationId ?? null,
    destination_type: opts.destinationType,
    rule_trigger: opts.ruleTrigger ?? null,
    status: opts.status,
    error_message: opts.errorMessage ?? null,
    workflow_name: opts.workflowName ?? null,
    scan_decision: opts.scanDecision ?? null,
    risk_score: opts.riskScore ?? null,
  });
}

type DestinationRow = {
  id: string;
  user_id: string;
  organization_id: string | null;
  type: AlertDestinationType;
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
};

const VALID_DESTINATION_TYPES = new Set<AlertDestinationType>([
  "in_app",
  "slack",
  "discord",
  "teams",
  "email",
  "webhook",
]);

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

async function sendResendEmail(to: string, subject: string, text: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.TORQA_ALERT_FROM_EMAIL?.trim() || process.env.RESEND_FROM_EMAIL?.trim() || "Torqa <onboarding@resend.dev>";
  if (!key) {
    return { ok: false, error: "RESEND_API_KEY is not configured on the server." };
  }
  if (!to.trim()) {
    return { ok: false, error: "Destination email address is empty." };
  }
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 10_000);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to.trim()], subject: subject.slice(0, 998), text: text.slice(0, 100_000) }),
      signal: ac.signal,
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { message?: string } | null;
      return { ok: false, error: j?.message ?? `Resend HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Email request failed" };
  } finally {
    clearTimeout(timer);
  }
}

async function postSlackWebhook(url: string, text: string): Promise<Response | null> {
  if (!validateSlackWebhookUrlForOutbound(url).ok) return null;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 5000);
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: ac.signal,
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function postDiscordWebhook(url: string, content: string): Promise<Response | null> {
  if (!validateDiscordWebhookUrlForOutbound(url).ok) return null;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 5000);
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
      signal: ac.signal,
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function postTeamsWebhook(url: string, text: string): Promise<Response | null> {
  if (!validateTeamsWebhookUrlForOutbound(url).ok) return null;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 5000);
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "@type": "MessageCard", "@context": "http://schema.org/extensions", text }),
      signal: ac.signal,
    });
  } catch {
    return null;
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
    typeof type !== "string" ||
    !VALID_DESTINATION_TYPES.has(type as AlertDestinationType)
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
    type: type as AlertDestinationType,
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
    !isAlertRuleTrigger(rt)
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
): Promise<{ ok: boolean; error?: string }> {
  if (!dest.enabled) return { ok: false, error: "destination disabled" };
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
      return { ok: true };
    }
    case "slack": {
      const url = typeof dest.config.webhookUrl === "string" ? dest.config.webhookUrl.trim() : "";
      if (!url) return { ok: false, error: "missing webhookUrl" };
      const res = await postSlackWebhook(url, `*${title}*\n${body}`);
      if (!res) return { ok: false, error: "Slack webhook failed validation or network error" };
      if (!res.ok) return { ok: false, error: `Slack HTTP ${res.status}` };
      return { ok: true };
    }
    case "discord": {
      const url = typeof dest.config.webhookUrl === "string" ? dest.config.webhookUrl.trim() : "";
      if (!url) return { ok: false, error: "missing webhookUrl" };
      const res = await postDiscordWebhook(url, `**${title}**\n${body}`);
      if (!res) return { ok: false, error: "Discord webhook failed validation or network error" };
      if (!res.ok) return { ok: false, error: `Discord HTTP ${res.status}` };
      return { ok: true };
    }
    case "teams": {
      const url = typeof dest.config.webhookUrl === "string" ? dest.config.webhookUrl.trim() : "";
      if (!url) return { ok: false, error: "missing webhookUrl" };
      const res = await postTeamsWebhook(url, `${title}\n${body}`);
      if (!res) return { ok: false, error: "Teams webhook failed validation or network error" };
      if (!res.ok) return { ok: false, error: `Teams HTTP ${res.status}` };
      return { ok: true };
    }
    case "email": {
      const addr = typeof dest.config.address === "string" ? dest.config.address.trim() : "";
      if (!addr) return { ok: false, error: "missing email address" };
      const r = await sendResendEmail(addr, title, body);
      if (!r.ok) return { ok: false, error: r.error };
      return { ok: true };
    }
    case "webhook": {
      const url = typeof dest.config.url === "string" ? dest.config.url.trim() : "";
      if (!url) return { ok: false, error: "missing webhook url" };
      const secret = typeof dest.config.secret === "string" ? dest.config.secret : "";
      const trigger =
        typeof metadata.ruleTrigger === "string"
          ? (metadata.ruleTrigger as string)
          : "scan_failed";
      const payload = JSON.stringify({
        schema: "torqa.alert.v1",
        title,
        body,
        severity,
        metadata,
      });
      const outcome = await postSignedGovernanceWebhook({
        url,
        body: payload,
        secret,
        event: trigger as Parameters<typeof postSignedGovernanceWebhook>[0]["event"],
      });
      if (!outcome.ok) return { ok: false, error: outcome.error };
      return { ok: true };
    }
    default:
      return { ok: false, error: `unknown type: ${dest.type as string}` };
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
    workflowName?: string;
    scanId?: string;
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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
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

      const ctx: AlertContext = {
        ruleName: rule.name,
        ruleTrigger: rule.rule_trigger,
        result: opts.result,
        workflowName: opts.workflowName,
        scanId: opts.scanId,
        appUrl,
      };

      const title = buildAlertTitle(ctx);
      const body  = buildAlertBody(ctx);
      const severity: "warning" | "critical" =
        rule.rule_trigger === "scan_failed" || rule.rule_trigger === "high_severity_finding"
          ? "critical"
          : "warning";

      for (const destId of rule.destination_ids) {
        if (deliveredDest.has(destId)) continue;
        const dest = destinationsById.get(destId);
        if (!dest) continue;

        const outcome = await deliverToDestination(supabase, dest, title, body, severity, {
          ...metaBase,
          ruleId: rule.id,
          ruleTrigger: rule.rule_trigger,
        });

        void logDelivery({
          userId: opts.actorUserId,
          ruleId: rule.id,
          destinationId: dest.id,
          destinationType: dest.type,
          ruleTrigger: rule.rule_trigger,
          status: outcome.ok ? "ok" : "error",
          errorMessage: outcome.error,
          workflowName: opts.workflowName,
          scanDecision: opts.result.status,
          riskScore: opts.result.riskScore,
        }).catch(() => {});

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
  if (error || !data) return { ok: false, error: "Destination not found" };

  const dest = rowToDestination(data as Record<string, unknown>);
  if (!dest) return { ok: false, error: "Invalid destination" };

  try {
    const outcome = await deliverToDestination(supabase, dest, "Torqa test alert", message, "info", {
      kind: "destination_test",
    });

    void logDelivery({
      userId: dest.user_id,
      destinationId: dest.id,
      destinationType: dest.type,
      status: outcome.ok ? "test" : "error",
      errorMessage: outcome.error,
    }).catch(() => {});

    if (!outcome.ok) return { ok: false, error: outcome.error ?? "Send failed" };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Test failed" };
  }
}
