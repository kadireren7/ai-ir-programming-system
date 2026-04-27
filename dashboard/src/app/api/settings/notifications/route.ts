import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_NOTIFICATION_PREFS } from "@/lib/scan-notification-rules";
import { validateSlackWebhookUrlForOutbound } from "@/lib/webhook-ssrf";
import { jsonDatabaseErrorResponse, jsonErrorResponse } from "@/lib/api-json-error";
import { getOrCreateRequestId } from "@/lib/api-request-id";
import { readJsonBodyWithByteLimit } from "@/lib/request-body";

export const runtime = "nodejs";

const PATCH_JSON_MAX_BYTES = 32 * 1024;

type DbPrefs = {
  email_alerts: boolean;
  slack_webhook_url: string | null;
  alert_on_fail: boolean;
  alert_on_high_risk: boolean;
  high_risk_threshold: number;
};

function fromDbRow(row: Record<string, unknown> | null): DbPrefs {
  if (!row) {
    return {
      email_alerts: DEFAULT_NOTIFICATION_PREFS.emailAlerts,
      slack_webhook_url: null,
      alert_on_fail: DEFAULT_NOTIFICATION_PREFS.alertOnFail,
      alert_on_high_risk: DEFAULT_NOTIFICATION_PREFS.alertOnHighRisk,
      high_risk_threshold: DEFAULT_NOTIFICATION_PREFS.highRiskThreshold,
    };
  }
  return {
    email_alerts: Boolean(row.email_alerts),
    slack_webhook_url:
      typeof row.slack_webhook_url === "string" && row.slack_webhook_url.trim()
        ? row.slack_webhook_url.trim()
        : null,
    alert_on_fail: row.alert_on_fail !== false,
    alert_on_high_risk: row.alert_on_high_risk !== false,
    high_risk_threshold:
      typeof row.high_risk_threshold === "number" && Number.isFinite(row.high_risk_threshold)
        ? Math.max(0, Math.min(100, Math.round(row.high_risk_threshold as number)))
        : DEFAULT_NOTIFICATION_PREFS.highRiskThreshold,
  };
}

/** Public API: never returns raw Slack webhook URL. */
function toPublicApi(row: Record<string, unknown> | null) {
  const cur = fromDbRow(row);
  return {
    emailAlerts: cur.email_alerts,
    slackWebhookUrl: null as string | null,
    slackWebhookConfigured: Boolean(cur.slack_webhook_url),
    alertOnFail: cur.alert_on_fail,
    alertOnHighRisk: cur.alert_on_high_risk,
    highRiskThreshold: cur.high_risk_threshold,
  };
}

export async function GET(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = await createClient();
  if (!supabase) {
    return jsonErrorResponse(503, "Supabase is not configured", requestId, "service_unavailable");
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return jsonErrorResponse(401, "Unauthorized", requestId, "unauthorized");
  }

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return jsonDatabaseErrorResponse(requestId);
  }

  return NextResponse.json({ preferences: toPublicApi((data ?? null) as Record<string, unknown> | null) });
}

export async function PATCH(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = await createClient();
  if (!supabase) {
    return jsonErrorResponse(503, "Supabase is not configured", requestId, "service_unavailable");
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return jsonErrorResponse(401, "Unauthorized", requestId, "unauthorized");
  }

  const parsed = await readJsonBodyWithByteLimit(request, PATCH_JSON_MAX_BYTES);
  if (!parsed.ok) {
    return jsonErrorResponse(
      parsed.status,
      parsed.message,
      requestId,
      parsed.status === 413 ? "payload_too_large" : "bad_request"
    );
  }
  const b = parsed.value;
  if (!b || typeof b !== "object" || Array.isArray(b)) {
    return jsonErrorResponse(400, "Invalid body", requestId, "bad_request");
  }
  const patch = b as Record<string, unknown>;

  const { data: existing } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const cur = fromDbRow((existing ?? null) as Record<string, unknown> | null);

  const emailAlerts = typeof patch.emailAlerts === "boolean" ? patch.emailAlerts : cur.email_alerts;
  const alertOnFail = typeof patch.alertOnFail === "boolean" ? patch.alertOnFail : cur.alert_on_fail;
  const alertOnHighRisk = typeof patch.alertOnHighRisk === "boolean" ? patch.alertOnHighRisk : cur.alert_on_high_risk;
  let highRiskThreshold = cur.high_risk_threshold;
  if (typeof patch.highRiskThreshold === "number" && Number.isFinite(patch.highRiskThreshold)) {
    highRiskThreshold = Math.max(0, Math.min(100, Math.round(patch.highRiskThreshold)));
  }

  let slack_webhook_url = cur.slack_webhook_url;
  if ("slackWebhookUrl" in patch) {
    const raw = patch.slackWebhookUrl;
    if (raw === null || raw === "") {
      slack_webhook_url = null;
    } else if (typeof raw === "string") {
      const trimmed = raw.trim();
      const v = validateSlackWebhookUrlForOutbound(trimmed);
      if (!v.ok) {
        return jsonErrorResponse(400, v.message, requestId, "invalid_webhook_url");
      }
      slack_webhook_url = trimmed;
    }
  }

  const { error } = await supabase.from("notification_preferences").upsert(
    {
      user_id: user.id,
      email_alerts: emailAlerts,
      slack_webhook_url,
      alert_on_fail: alertOnFail,
      alert_on_high_risk: alertOnHighRisk,
      high_risk_threshold: highRiskThreshold,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return jsonDatabaseErrorResponse(requestId);
  }

  return NextResponse.json({
    preferences: {
      emailAlerts,
      slackWebhookUrl: null,
      slackWebhookConfigured: Boolean(slack_webhook_url),
      alertOnFail,
      alertOnHighRisk,
      highRiskThreshold,
    },
  });
}
