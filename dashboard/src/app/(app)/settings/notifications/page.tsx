"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Loader2, Mail, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NotificationPrefsShape } from "@/lib/scan-notification-rules";
import { DEFAULT_NOTIFICATION_PREFS } from "@/lib/scan-notification-rules";
import { readLocalNotificationPrefs, writeLocalNotificationPrefs } from "@/lib/notifications-local";
import { hasPublicSupabaseUrl } from "@/lib/env";

const useCloud = hasPublicSupabaseUrl();

export default function NotificationSettingsPage() {
  const [prefs, setPrefs] = useState<NotificationPrefsShape>({ ...DEFAULT_NOTIFICATION_PREFS });
  const [slackFieldTouched, setSlackFieldTouched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    if (!useCloud) {
      setPrefs(readLocalNotificationPrefs());
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/settings/notifications", { credentials: "include" });
      const j = (await res.json()) as { preferences?: NotificationPrefsShape; error?: string };
      if (res.ok && j.preferences) {
        setPrefs({
          ...j.preferences,
          slackWebhookUrl: j.preferences.slackWebhookUrl ?? null,
        });
        setSlackFieldTouched(false);
      } else setMessage(j.error ?? "Could not load settings");
    } catch {
      setMessage("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    if (!useCloud) {
      writeLocalNotificationPrefs(prefs);
      setMessage("Saved in this browser.");
      setSaving(false);
      window.dispatchEvent(new CustomEvent("torqa-notifications-changed"));
      return;
    }
    try {
      const body: Record<string, unknown> = {
        emailAlerts: prefs.emailAlerts,
        alertOnFail: prefs.alertOnFail,
        alertOnHighRisk: prefs.alertOnHighRisk,
        highRiskThreshold: prefs.highRiskThreshold,
      };
      if (slackFieldTouched) {
        const v = prefs.slackWebhookUrl?.trim();
        body.slackWebhookUrl = v ? v : null;
      }
      const res = await fetch("/api/settings/notifications", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { preferences?: NotificationPrefsShape; error?: string };
      if (!res.ok) {
        setMessage(j.error ?? "Save failed");
        return;
      }
      if (j.preferences) {
        setPrefs({
          ...j.preferences,
          slackWebhookUrl: j.preferences.slackWebhookUrl ?? null,
        });
        setSlackFieldTouched(false);
      }
      setMessage("Saved.");
    } catch {
      setMessage("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Settings</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Scan alerts</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Control in-app alerts after a workflow scan. Email and Slack are wired as placeholders until you connect a
          provider.
        </p>
      </div>

      {message && (
        <p className="rounded-lg border border-border/80 bg-muted/40 px-3 py-2 text-sm text-foreground">{message}</p>
      )}

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-4 w-4" aria-hidden />
            Rules
          </CardTitle>
          <CardDescription>
            <strong>Fail</strong> uses scan status <code className="rounded bg-muted px-1 font-mono text-[11px]">FAIL</code>
            . <strong>High risk</strong> fires when trust score ≤ threshold or any high-severity finding exists.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                <div>
                  <Label className="text-sm font-medium">Alert on FAIL</Label>
                  <p className="text-xs text-muted-foreground">When the scan gate outcome is FAIL.</p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={prefs.alertOnFail}
                  onChange={(e) => setPrefs((p) => ({ ...p, alertOnFail: e.target.checked }))}
                />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                <div>
                  <Label className="text-sm font-medium">Alert on high-risk</Label>
                  <p className="text-xs text-muted-foreground">Low trust score or high-severity findings.</p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={prefs.alertOnHighRisk}
                  onChange={(e) => setPrefs((p) => ({ ...p, alertOnHighRisk: e.target.checked }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="thr">High-risk trust score threshold</Label>
                <Input
                  id="thr"
                  type="number"
                  min={0}
                  max={100}
                  value={prefs.highRiskThreshold}
                  onChange={(e) =>
                    setPrefs((p) => ({
                      ...p,
                      highRiskThreshold: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)),
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">Alert when risk score is at or below this value (0–100).</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-4 w-4" aria-hidden />
            Email (placeholder)
          </CardTitle>
          <CardDescription>
            Toggle records intent only. Delivery is a no-op until you connect Resend, SendGrid, or similar in the API
            layer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-dashed border-border/80 px-4 py-3">
            <span className="text-sm font-medium">Enable email alerts</span>
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={prefs.emailAlerts}
              onChange={(e) => setPrefs((p) => ({ ...p, emailAlerts: e.target.checked }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessagesSquare className="h-4 w-4" aria-hidden />
            Slack webhook (placeholder)
          </CardTitle>
          <CardDescription>
            Only <code className="rounded bg-muted px-1 font-mono text-[11px]">hooks.slack.com/services/…</code>{" "}
            URLs are accepted. Saved URLs are never shown again; enter a new URL to replace the stored webhook.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {prefs.slackWebhookConfigured ? (
            <p className="text-xs text-muted-foreground">
              A Slack webhook is on file; the URL is not shown again. Paste a new URL and save to replace it.
            </p>
          ) : null}
          <Label htmlFor="slack">Incoming webhook URL</Label>
          <Input
            id="slack"
            type="url"
            placeholder="https://hooks.slack.com/services/…"
            value={prefs.slackWebhookUrl ?? ""}
            onChange={(e) => {
              const v = e.target.value.trim();
              if (v) setSlackFieldTouched(true);
              setPrefs((p) => ({
                ...p,
                slackWebhookUrl: v ? v : null,
              }));
            }}
          />
          {prefs.slackWebhookConfigured ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-1"
              onClick={() => {
                setSlackFieldTouched(true);
                setPrefs((p) => ({ ...p, slackWebhookUrl: null }));
              }}
            >
              Remove saved webhook
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button type="button" disabled={saving || loading} onClick={() => void save()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/settings/api">User API</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/notifications">View notifications</Link>
        </Button>
      </div>
    </div>
  );
}
