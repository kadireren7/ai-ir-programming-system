"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Megaphone, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { hasPublicSupabaseUrl } from "@/lib/env";
import type { AlertDestinationType, AlertRuleTrigger } from "@/lib/alerts";

const useCloud = hasPublicSupabaseUrl();

type DestinationRow = {
  id: string;
  type: AlertDestinationType;
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
};

type RuleRow = {
  id: string;
  name: string;
  enabled: boolean;
  trigger: AlertRuleTrigger;
  destinationIds: string[];
};

const TRIGGER_OPTIONS: { value: AlertRuleTrigger; label: string }[] = [
  { value: "scan_failed", label: "Scan failed (FAIL)" },
  { value: "scan_needs_review", label: "Scan needs review" },
  { value: "high_severity_finding", label: "High / critical finding" },
  { value: "schedule_failed", label: "Scheduled run failed" },
];

export default function AlertsPage() {
  const [destinations, setDestinations] = useState<DestinationRow[]>([]);
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [destName, setDestName] = useState("");
  const [destType, setDestType] = useState<AlertDestinationType>("slack");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [emailAddress, setEmailAddress] = useState("");

  const [ruleName, setRuleName] = useState("");
  const [ruleTrigger, setRuleTrigger] = useState<AlertRuleTrigger>("scan_failed");
  const [ruleDestIds, setRuleDestIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!useCloud) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [dRes, rRes] = await Promise.all([
        fetch("/api/alert-destinations", { credentials: "include" }),
        fetch("/api/alert-rules", { credentials: "include" }),
      ]);
      const dj = (await dRes.json()) as { destinations?: DestinationRow[]; error?: string };
      const rj = (await rRes.json()) as { rules?: RuleRow[]; error?: string };
      if (!dRes.ok) {
        setError(dj.error ?? "Could not load destinations");
        return;
      }
      if (!rRes.ok) {
        setError(rj.error ?? "Could not load rules");
        return;
      }
      setDestinations(dj.destinations ?? []);
      setRules(rj.rules ?? []);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createDestination = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    if (!destName.trim()) {
      setError("Destination name is required.");
      setSaving(false);
      return;
    }
    let config: Record<string, unknown> = {};
    if (destType === "slack" || destType === "discord") {
      if (!webhookUrl.trim().startsWith("https://")) {
        setError("Webhook URL must start with https://");
        setSaving(false);
        return;
      }
      config = { webhookUrl: webhookUrl.trim() };
    } else if (destType === "email") {
      if (!emailAddress.trim()) {
        setError("Email address is required for email placeholder.");
        setSaving(false);
        return;
      }
      config = { address: emailAddress.trim() };
    } else {
      config = { channel: "in_app" };
    }
    try {
      const res = await fetch("/api/alert-destinations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: destName.trim(), type: destType, enabled: true, config }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Create failed");
        return;
      }
      setDestName("");
      setWebhookUrl("");
      setEmailAddress("");
      setMessage("Destination saved. Webhook URLs are not shown again after save.");
      await load();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const createRule = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    if (!ruleName.trim() || ruleDestIds.length === 0) {
      setError("Rule needs a name and at least one destination (use checkboxes).");
      setSaving(false);
      return;
    }
    try {
      const res = await fetch("/api/alert-rules", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ruleName.trim(),
          trigger: ruleTrigger,
          enabled: true,
          destinationIds: ruleDestIds,
        }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Create rule failed");
        return;
      }
      setRuleName("");
      setRuleDestIds([]);
      setMessage("Rule created.");
      await load();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const patchDestination = async (id: string, patch: Record<string, unknown>) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/alert-destinations/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Update failed");
        return;
      }
      await load();
    } finally {
      setSaving(false);
    }
  };

  const patchRule = async (id: string, patch: Record<string, unknown>) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/alert-rules/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Update failed");
        return;
      }
      await load();
    } finally {
      setSaving(false);
    }
  };

  const deleteDestination = async (id: string) => {
    if (!confirm("Delete this destination? Rules referencing it may break.")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/alert-destinations/${id}`, { method: "DELETE", credentials: "include" });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Delete failed");
        return;
      }
      await load();
    } finally {
      setSaving(false);
    }
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Delete this rule?")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/alert-rules/${id}`, { method: "DELETE", credentials: "include" });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Delete failed");
        return;
      }
      await load();
    } finally {
      setSaving(false);
    }
  };

  const testDestination = async (id: string) => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/alert-destinations/${id}/test`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Torqa manual test from /alerts" }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Test failed");
        return;
      }
      setMessage("Test sent (Slack/Discord/in-app) or placeholder logged for email.");
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const toggleRuleDest = (destId: string) => {
    setRuleDestIds((prev) =>
      prev.includes(destId) ? prev.filter((x) => x !== destId) : [...prev, destId]
    );
  };

  if (!useCloud) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
        <p className="text-sm text-muted-foreground">
          Connect Supabase to configure team alert destinations and rules. Existing per-user notification settings
          remain at <Link href="/settings/notifications" className="text-primary hover:underline">Alert settings</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="border-b border-border/60 pb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Governance signals</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Alerts</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Route FAIL / NEEDS REVIEW / high-severity findings and schedule failures to Slack, Discord (JSON webhook),
          in-app workspace fanout, or an email placeholder. Webhook URLs are stored server-side and{" "}
          <span className="font-medium text-foreground">not returned</span> after save — rotate via update if needed.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-border/80 bg-muted/40 px-3 py-2 text-sm">{message}</p>
      ) : null}

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Megaphone className="h-4 w-4" aria-hidden />
            New destination
          </CardTitle>
          <CardDescription>
            Scoped to your active workspace when one is selected; otherwise personal. Only workspace admins can create
            workspace destinations.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ad-name">Name</Label>
            <Input id="ad-name" value={destName} onChange={(e) => setDestName(e.target.value)} placeholder="#sec-alerts" />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <select
              id="ad-type"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
              value={destType}
              onChange={(e) => setDestType(e.target.value as AlertDestinationType)}
            >
              <option value="slack">Slack incoming webhook</option>
              <option value="discord">Discord webhook</option>
              <option value="email">Email (placeholder)</option>
              <option value="in_app">In-app (workspace fanout)</option>
            </select>
          </div>
          {destType === "slack" || destType === "discord" ? (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ad-url">Webhook URL (https only, shown once)</Label>
              <Input
                id="ad-url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/..."
                autoComplete="off"
              />
            </div>
          ) : null}
          {destType === "email" ? (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ad-email">Email address (placeholder routing)</Label>
              <Input
                id="ad-email"
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="team@company.com"
              />
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <Button type="button" disabled={saving || loading} onClick={() => void createDestination()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save destination"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Destinations</CardTitle>
          <CardDescription>Masked config in list; use Test to verify delivery.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : destinations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No destinations yet.</p>
          ) : (
            destinations.map((d) => (
              <div
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 p-3"
              >
                <div>
                  <p className="text-sm font-medium">{d.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.type}
                    {d.type === "slack" || d.type === "discord" ? (
                      <> · webhook {d.config.webhookConfigured ? "on file" : "not set"}</>
                    ) : null}
                    {d.type === "email" ? (
                      <> · email {d.config.emailConfigured ? "on file" : "not set"}</>
                    ) : null}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={d.enabled ? "default" : "secondary"}>{d.enabled ? "on" : "off"}</Badge>
                  <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => void testDestination(d.id)}>
                    <Send className="h-3.5 w-3.5" />
                    Test
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void patchDestination(d.id, { enabled: !d.enabled })}
                  >
                    Toggle
                  </Button>
                  <Button type="button" size="sm" variant="destructive" onClick={() => void deleteDestination(d.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">New rule</CardTitle>
          <CardDescription>Maps triggers to destinations for the active scope.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ar-name">Rule name</Label>
              <Input id="ar-name" value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder="Prod FAIL → Slack" />
            </div>
            <div className="space-y-2">
              <Label>Trigger</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                value={ruleTrigger}
                onChange={(e) => setRuleTrigger(e.target.value as AlertRuleTrigger)}
              >
                {TRIGGER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Destinations</Label>
            {destinations.length === 0 ? (
              <p className="text-xs text-muted-foreground">Create a destination first.</p>
            ) : (
              <ul className="space-y-2">
                {destinations.map((d) => (
                  <li key={d.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={ruleDestIds.includes(d.id)}
                      onChange={() => toggleRuleDest(d.id)}
                      id={`rd-${d.id}`}
                    />
                    <label htmlFor={`rd-${d.id}`} className="cursor-pointer">
                      {d.name} ({d.type})
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button type="button" disabled={saving || loading} onClick={() => void createRule()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create rule"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rules yet.</p>
          ) : (
            rules.map((r) => (
              <div key={r.id} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.trigger}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={r.enabled ? "default" : "secondary"}>{r.enabled ? "on" : "off"}</Badge>
                    <Button type="button" size="sm" variant="outline" onClick={() => void patchRule(r.id, { enabled: !r.enabled })}>
                      Toggle
                    </Button>
                    <Button type="button" size="sm" variant="destructive" onClick={() => void deleteRule(r.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Legacy per-user toggles remain at{" "}
        <Link href="/settings/notifications" className="text-primary hover:underline">
          /settings/notifications
        </Link>
        . This page adds team-routable destinations and explicit rules on top.
      </p>
    </div>
  );
}
