import type { ScanApiSuccess } from "@/lib/scan-engine";

export type NotificationPrefsShape = {
  emailAlerts: boolean;
  slackWebhookUrl: string | null;
  /** Populated from cloud API only; never includes the stored secret URL. */
  slackWebhookConfigured?: boolean;
  alertOnFail: boolean;
  alertOnHighRisk: boolean;
  highRiskThreshold: number;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefsShape = {
  emailAlerts: false,
  slackWebhookUrl: null,
  slackWebhookConfigured: false,
  alertOnFail: true,
  alertOnHighRisk: true,
  highRiskThreshold: 50,
};

/** True when gate outcome is FAIL and alerts enabled. */
export function scanTriggersFailAlert(result: ScanApiSuccess, prefs: NotificationPrefsShape): boolean {
  return prefs.alertOnFail && result.status === "FAIL";
}

/** True when risk score is at/below threshold or there is at least one high-severity finding. */
export function scanTriggersHighRiskAlert(result: ScanApiSuccess, prefs: NotificationPrefsShape): boolean {
  if (!prefs.alertOnHighRisk) return false;
  const lowScore = result.riskScore <= prefs.highRiskThreshold;
  const anyHigh = result.totals.high > 0;
  return lowScore || anyHigh;
}

export function buildScanNotificationPayloads(
  result: ScanApiSuccess,
  prefs: NotificationPrefsShape
): { title: string; body: string; severity: "warning" | "critical"; kind: string }[] {
  const out: { title: string; body: string; severity: "warning" | "critical"; kind: string }[] = [];

  if (scanTriggersFailAlert(result, prefs)) {
    out.push({
      kind: "scan_fail",
      severity: "critical",
      title: "Workflow scan failed gate",
      body: `Trust score ${result.riskScore} · ${result.totals.high} high-severity finding(s). Review findings and remediate.`,
    });
  } else if (scanTriggersHighRiskAlert(result, prefs)) {
    out.push({
      kind: "scan_high_risk",
      severity: "warning",
      title: "High-risk workflow scan",
      body: `Status ${result.status} · trust score ${result.riskScore}. Threshold ≤ ${prefs.highRiskThreshold} or high-severity findings present.`,
    });
  }

  return out;
}
