import { createClient } from "@/lib/supabase/server";
import type { ScanApiSuccess } from "@/lib/scan-engine";
import {
  buildScanNotificationPayloads,
  DEFAULT_NOTIFICATION_PREFS,
  type NotificationPrefsShape,
} from "@/lib/scan-notification-rules";
import { dispatchAlertRulesForScanContext } from "@/lib/alert-dispatch";

function rowToPrefs(row: Record<string, unknown> | null): NotificationPrefsShape {
  if (!row) return { ...DEFAULT_NOTIFICATION_PREFS };
  return {
    emailAlerts: Boolean(row.email_alerts),
    slackWebhookUrl:
      typeof row.slack_webhook_url === "string" && row.slack_webhook_url.trim()
        ? row.slack_webhook_url.trim()
        : null,
    alertOnFail: row.alert_on_fail !== false,
    alertOnHighRisk: row.alert_on_high_risk !== false,
    highRiskThreshold:
      typeof row.high_risk_threshold === "number" && Number.isFinite(row.high_risk_threshold)
        ? Math.max(0, Math.min(100, Math.round(row.high_risk_threshold)))
        : DEFAULT_NOTIFICATION_PREFS.highRiskThreshold,
  };
}

/** Placeholder until Resend / SendGrid / etc. */
async function placeholderSendScanEmail(_userId: string, subject: string, text: string): Promise<void> {
  void _userId;
  void subject;
  void text;
}

async function sendSlackWebhookStub(url: string, text: string): Promise<void> {
  if (!url.startsWith("https://")) return;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 4000);
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: ac.signal,
    });
  } catch {
    /* webhook optional; never fail scan pipeline */
  } finally {
    clearTimeout(t);
  }
}

/**
 * Persists in-app notifications and fires delivery placeholders when scan rules match.
 * Call without awaiting from /api/scan after a successful payload (short DB writes).
 */
export async function dispatchScanNotificationsForUser(
  userId: string,
  result: ScanApiSuccess,
  source: string,
  organizationId: string | null = null,
  via: string = "scan"
): Promise<void> {
  const supabase = await createClient();
  if (!supabase) return;

  const { data: prefRow } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const prefs = rowToPrefs((prefRow ?? null) as Record<string, unknown> | null);
  const payloads = buildScanNotificationPayloads(result, prefs);
  if (payloads.length === 0) return;

  const meta = {
    source,
    status: result.status,
    riskScore: result.riskScore,
    engine: result.engine,
  };

  for (const p of payloads) {
    const { error } = await supabase.from("in_app_notifications").insert({
      user_id: userId,
      title: p.title,
      body: p.body,
      severity: p.severity,
      metadata: { ...meta, kind: p.kind },
    });
    if (error) {
      console.warn("[notifications] insert failed", error.message);
    }
  }

  const summary = payloads.map((p) => p.title).join(" · ");
  if (prefs.emailAlerts) {
    void placeholderSendScanEmail(userId, "Torqa scan alert", summary);
  }
  if (prefs.slackWebhookUrl) {
    void sendSlackWebhookStub(prefs.slackWebhookUrl, `*Torqa scan alert*\n${summary}\nSource: ${source}`);
  }

  void dispatchAlertRulesForScanContext(supabase, {
    actorUserId: userId,
    organizationId,
    result,
    source,
    via,
  }).catch(() => {});
}
