"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, Cloud, Loader2, Megaphone, Send, XCircle, FlaskConical } from "lucide-react";
import { EmptyStateCta } from "@/components/onboarding/empty-state-cta";
import { GovernanceJourneyStrip } from "@/components/onboarding/governance-journey-strip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { hasPublicSupabaseUrl } from "@/lib/env";
import type { AlertDestinationType, AlertRuleFilters, AlertRuleTrigger } from "@/lib/alerts";

const useCloud = hasPublicSupabaseUrl();

const SCAN_TRIGGERS: AlertRuleTrigger[] = [
  "scan_failed",
  "scan_needs_review",
  "high_severity_finding",
  "schedule_failed",
];

function isGovernanceTrigger(t: AlertRuleTrigger): boolean {
  return !SCAN_TRIGGERS.includes(t);
}

function parseCsv(s: string): string[] {
  return s.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 64);
}

function filtersFromCsvFields(fields: {
  severities: string;
  sources: string;
  decisionTypes: string;
  targetPatterns: string;
}): AlertRuleFilters {
  const out: AlertRuleFilters = {};
  const sev = parseCsv(fields.severities);
  const src = parseCsv(fields.sources);
  const dt = parseCsv(fields.decisionTypes);
  const tp = parseCsv(fields.targetPatterns);
  if (sev.length) out.severities = sev;
  if (src.length) out.sources = src;
  if (dt.length) out.decisionTypes = dt;
  if (tp.length) out.targetPatterns = tp;
  return out;
}

function formatFiltersSummary(f: AlertRuleFilters | undefined): string {
  if (!f) return "";
  const parts: string[] = [];
  if (f.severities?.length) parts.push(`${f.severities.length} sev`);
  if (f.sources?.length) parts.push(`${f.sources.length} src`);
  if (f.decisionTypes?.length) parts.push(`${f.decisionTypes.length} decision types`);
  if (f.targetPatterns?.length) parts.push(`${f.targetPatterns.length} target patterns`);
  return parts.join(" · ");
}

const SCAN_TRIGGER_OPTIONS: { value: AlertRuleTrigger; label: string }[] = [
  { value: "scan_failed", label: "Scan failed (FAIL)" },
  { value: "scan_needs_review", label: "Scan needs review" },
  { value: "high_severity_finding", label: "High / critical finding" },
  { value: "schedule_failed", label: "Scheduled run failed" },
];

const GOVERNANCE_TRIGGER_OPTIONS: { value: AlertRuleTrigger; label: string }[] = [
  { value: "governance_decision", label: "Any governance decision (all types)" },
  { value: "fix_applied", label: "Fix applied" },
  { value: "risk_accepted", label: "Risk accepted" },
  { value: "risk_revoked", label: "Risk revoked" },
  { value: "approval_pending", label: "Approval pending (reserved)" },
  { value: "approval_decided", label: "Approval approved / rejected" },
  { value: "mode_changed", label: "Governance mode changed" },
];

function triggerOptionLabel(trigger: AlertRuleTrigger): string {
  return (
    SCAN_TRIGGER_OPTIONS.find((o) => o.value === trigger)?.label ??
    GOVERNANCE_TRIGGER_OPTIONS.find((o) => o.value === trigger)?.label ??
    trigger
  );
}

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
  filters?: AlertRuleFilters;
};

type DeliveryRow = {
  id: string;
  destination_type: string;
  rule_trigger: string | null;
  status: "ok" | "error" | "test";
  error_message: string | null;
  workflow_name: string | null;
  scan_decision: string | null;
  risk_score: number | null;
  created_at: string;
};

export default function AlertsPage() {
  const [destinations, setDestinations] = useState<DestinationRow[]>([]);
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [destName, setDestName] = useState("");
  const [destType, setDestType] = useState<AlertDestinationType>("slack");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [genericWebhookUrl, setGenericWebhookUrl] = useState("");
  const [genericWebhookSecret, setGenericWebhookSecret] = useState("");
  const [emailAddress, setEmailAddress] = useState("");

  const [ruleName, setRuleName] = useState("");
  const [ruleTrigger, setRuleTrigger] = useState<AlertRuleTrigger>("scan_failed");
  const [ruleDestIds, setRuleDestIds] = useState<string[]>([]);
  const [newRuleSev, setNewRuleSev] = useState("");
  const [newRuleSrc, setNewRuleSrc] = useState("");
  const [newRuleDecisionTypes, setNewRuleDecisionTypes] = useState("");
  const [newRuleTargets, setNewRuleTargets] = useState("");

  const [filterEditRuleId, setFilterEditRuleId] = useState<string | null>(null);
  const [editSev, setEditSev] = useState("");
  const [editSrc, setEditSrc] = useState("");
  const [editDecisionTypes, setEditDecisionTypes] = useState("");
  const [editTargets, setEditTargets] = useState("");

  const load = useCallback(async () => {
    if (!useCloud) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [dRes, rRes, dlRes] = await Promise.all([
        fetch("/api/alert-destinations", { credentials: "include" }),
        fetch("/api/alert-rules", { credentials: "include" }),
        fetch("/api/alert-deliveries", { credentials: "include" }),
      ]);
      const dj  = (await dRes.json())  as { destinations?: DestinationRow[]; error?: string };
      const rj  = (await rRes.json())  as { rules?: RuleRow[]; error?: string };
      const dlj = (await dlRes.json()) as { deliveries?: DeliveryRow[]; error?: string };
      if (!dRes.ok) { setError(dj.error ?? "Could not load destinations"); return; }
      if (!rRes.ok) { setError(rj.error ?? "Could not load rules"); return; }
      setDestinations(dj.destinations ?? []);
      setRules(rj.rules ?? []);
      setDeliveries(dlj.deliveries ?? []);
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
    if (destType === "slack" || destType === "discord" || destType === "teams") {
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
    } else if (destType === "webhook") {
      const url = genericWebhookUrl.trim();
      if (!url.startsWith("https://")) {
        setError("HTTPS webhook URL required.");
        setSaving(false);
        return;
      }
      const secret = genericWebhookSecret.trim();
      if (secret && (secret.length < 16 || secret.length > 256)) {
        setError("Signing secret must be 16–256 characters if set.");
        setSaving(false);
        return;
      }
      config = { url, secret: secret || "", version: "v1" };
    } else if (destType === "in_app") {
      config = { channel: "in_app" };
    } else {
      setError("Unsupported destination type.");
      setSaving(false);
      return;
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
      setGenericWebhookUrl("");
      setGenericWebhookSecret("");
      setEmailAddress("");
      setMessage("Destination saved. Secrets and webhook URLs stay on the server after save.");
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
      const governanceFilters =
        isGovernanceTrigger(ruleTrigger)
          ? filtersFromCsvFields({
              severities: newRuleSev,
              sources: newRuleSrc,
              decisionTypes: newRuleDecisionTypes,
              targetPatterns: newRuleTargets,
            })
          : {};

      const res = await fetch("/api/alert-rules", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ruleName.trim(),
          trigger: ruleTrigger,
          enabled: true,
          destinationIds: ruleDestIds,
          filters: governanceFilters,
        }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Create rule failed");
        return;
      }
      setRuleName("");
      setRuleDestIds([]);
      setNewRuleSev("");
      setNewRuleSrc("");
      setNewRuleDecisionTypes("");
      setNewRuleTargets("");
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

  const patchRule = async (id: string, patch: Record<string, unknown>): Promise<boolean> => {
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
        return false;
      }
      await load();
      return true;
    } catch {
      setError("Network error");
      return false;
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
      setMessage("Test succeeded (Slack, Discord, HTTPS webhook — check `X-Torqa-Signature` when signing is enabled — in-app) or logged for placeholder email.");
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

  const saveEditedRuleFilters = async () => {
    if (!filterEditRuleId) return;
    const ok = await patchRule(filterEditRuleId, {
      filters: filtersFromCsvFields({
        severities: editSev,
        sources: editSrc,
        decisionTypes: editDecisionTypes,
        targetPatterns: editTargets,
      }),
    });
    if (ok) setFilterEditRuleId(null);
  };

  const openRuleFilterEditor = (r: RuleRow) => {
    if (filterEditRuleId === r.id) {
      setFilterEditRuleId(null);
      return;
    }
    setFilterEditRuleId(r.id);
    setEditSev((r.filters?.severities ?? []).join(", "));
    setEditSrc((r.filters?.sources ?? []).join(", "));
    setEditDecisionTypes((r.filters?.decisionTypes ?? []).join(", "));
    setEditTargets((r.filters?.targetPatterns ?? []).join(", "));
  };

  if (!useCloud) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Team routes for scan outcomes — cloud only.</p>
        </div>
        <EmptyStateCta
          icon={Cloud}
          title="Alerts need cloud"
          description="Personal toggles live in settings until then."
          primary={{ href: "/workspace", label: "Workspace setup" }}
          secondary={{ href: "/settings/notifications", label: "Personal alerts" }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="space-y-5 border-b border-border/60 pb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Alert</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Alerts</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Route scan outcomes, governance decisions, fixes, approvals, mode changes — to Slack,
            Discord, signed HTTPS webhooks, in-app, or email placeholders. Secrets stay on the server after save.
          </p>
        </div>
        <GovernanceJourneyStrip />
        <Card className="border-border/80 bg-muted/15 shadow-sm">
          <CardContent className="grid gap-3 p-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">What this does</p>
              <p className="mt-1">
                Routes scan outcomes and governance signals to destinations so risky workflows do not go unnoticed.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Works now</p>
              <p className="mt-1">
                Slack / Discord webhook tests; signed outbound webhooks (<code className="text-xs">sha256</code> HMAC);
                governance triggers + optional filters per rule; in-app; placeholder email integration.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Next up</p>
              <p className="mt-1">Broader delivery guarantees and richer playbook templates.</p>
            </div>
            <div className="flex items-end">
              <Button asChild>
                <Link href="#dest-form">Create your first alert destination</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">Add a destination</strong> (Slack/Discord webhook or in-app fanout).
          </li>
          <li>
            <strong className="text-foreground">Test it</strong> — use Test on each row to confirm delivery.
          </li>
          <li>
            <strong className="text-foreground">Create rules</strong> — scans, governance signals, approvals, mode changes —
            optionally narrow governance rules by severity / source / decision type / target pattern.
          </li>
        </ol>
      </div>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-border/80 bg-muted/40 px-3 py-2 text-sm">{message}</p>
      ) : null}

      <Card id="dest-form" className="scroll-mt-24 border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Megaphone className="h-4 w-4" aria-hidden />
            New destination
          </CardTitle>
          <CardDescription>Workspace or personal scope — matches your active org cookie.</CardDescription>
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
              <option value="teams">Microsoft Teams webhook</option>
              <option value="webhook">HTTPS webhook (Torqa-signed JSON)</option>
              <option value="email">Email (placeholder)</option>
              <option value="in_app">In-app (workspace fanout)</option>
            </select>
          </div>
          {(destType === "slack" || destType === "discord" || destType === "teams") ? (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ad-url">Webhook URL (https only, shown once)</Label>
              <Input
                id="ad-url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder={
                  destType === "teams"
                    ? "https://outlook.office.com/webhookb2/..."
                    : "https://hooks.slack.com/..."
                }
                autoComplete="off"
              />
            </div>
          ) : null}
          {destType === "webhook" ? (
            <div className="space-y-3 sm:col-span-2">
              <div className="space-y-2">
                <Label htmlFor="ad-gw-url">Destination URL (<code className="text-xs">https://</code> only)</Label>
                <Input
                  id="ad-gw-url"
                  value={genericWebhookUrl}
                  onChange={(e) => setGenericWebhookUrl(e.target.value)}
                  placeholder="https://api.example.com/torqa-alerts"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ad-gw-secret">Signing secret (optional · 16–256 chars)</Label>
                <Input
                  id="ad-gw-secret"
                  type="password"
                  value={genericWebhookSecret}
                  onChange={(e) => setGenericWebhookSecret(e.target.value)}
                  placeholder="When set, body is signed in X-Torqa-Signature"
                  autoComplete="new-password"
                />
              </div>
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
          <CardDescription>Masked in list · Test to verify.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : destinations.length === 0 ? (
            <EmptyStateCta
              icon={Bell}
              title="Alerts are empty"
              description="Add Slack or Discord first, then bind rules."
              primary={{ href: "#dest-form", label: "Create your first alert destination" }}
              secondary={{ href: "/scan", label: "Run a scan" }}
              compact
              className="border-none bg-transparent py-4"
            />
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
                    {(d.type === "slack" || d.type === "discord" || d.type === "teams") ? (
                      <> · webhook {d.config.webhookConfigured ? "on file" : "not set"}</>
                    ) : null}
                    {d.type === "email" ? (
                      <> · email {d.config.emailConfigured ? "on file" : "not set"}</>
                    ) : null}
                    {d.type === "webhook" ? (
                      <>
                        {" "}
                        ·{" "}
                        {typeof d.config.webhookHost === "string" && d.config.webhookHost.length > 0
                          ? d.config.webhookHost
                          : "endpoint"}{" "}
                        · URL {d.config.webhookConfigured ? "on file" : "not set"}
                        {d.config.signingConfigured ? " · HMAC signing on" : ""}
                      </>
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
          <CardDescription>Trigger and optional governance filters (narrow by severity, source, decision type, target substring).</CardDescription>
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
                <optgroup label="Scan & schedule">
                  {SCAN_TRIGGER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Governance">
                  {GOVERNANCE_TRIGGER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Destinations</Label>
            {destinations.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                <Link href="#dest-form" className="font-medium text-primary hover:underline">
                  Add a destination
                </Link>{" "}
                first.
              </p>
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
          {isGovernanceTrigger(ruleTrigger) ? (
            <div className="rounded-lg border border-border/70 bg-muted/15 p-3 text-xs text-muted-foreground space-y-2">
              <p className="font-medium text-foreground text-sm">Optional routing filters</p>
              <p>Comma-separated lists; governance rules combine filters with AND. Empty fields match anything.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="arf-sev" className="text-xs">
                    Severities (e.g. high, critical)
                  </Label>
                  <Input
                    id="arf-sev"
                    value={newRuleSev}
                    onChange={(e) => setNewRuleSev(e.target.value)}
                    placeholder="critical, high"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="arf-src" className="text-xs">
                    Sources (n8n, zapier, …)
                  </Label>
                  <Input
                    id="arf-src"
                    value={newRuleSrc}
                    onChange={(e) => setNewRuleSrc(e.target.value)}
                    placeholder="zapier, lambda"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="arf-dt" className="text-xs">
                    Decision types
                  </Label>
                  <Input
                    id="arf-dt"
                    value={newRuleDecisionTypes}
                    onChange={(e) => setNewRuleDecisionTypes(e.target.value)}
                    placeholder="accept_risk, mode_change"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="arf-tgt" className="text-xs">
                    Target substring patterns
                  </Label>
                  <Input
                    id="arf-tgt"
                    value={newRuleTargets}
                    onChange={(e) => setNewRuleTargets(e.target.value)}
                    placeholder="workflow-id-"
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>
          ) : null}
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
            <EmptyStateCta
              icon={Megaphone}
              title="No rules yet"
              description="Connect scan or governance triggers to a destination. Use filters to narrow governance alerts."
              primary={{ href: "#dest-form", label: "Check destinations" }}
              secondary={{ href: "/policies", label: "Policies" }}
              compact
              className="border-none bg-transparent py-4"
            />
          ) : (
            rules.map((r) => {
              const filtSummary = formatFiltersSummary(r.filters);
              const filtersOpen = filterEditRuleId === r.id;
              return (
                <div key={r.id} className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {triggerOptionLabel(r.trigger)}{" "}
                        <span className="font-mono text-[11px] opacity-80">({r.trigger})</span>
                      </p>
                      {filtSummary ? (
                        <p className="text-[11px] text-muted-foreground mt-1">Filters: {filtSummary}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={r.enabled ? "default" : "secondary"}>{r.enabled ? "on" : "off"}</Badge>
                      <Button
                        type="button"
                        size="sm"
                        variant={filtersOpen ? "secondary" : "outline"}
                        onClick={() => openRuleFilterEditor(r)}
                      >
                        {filtersOpen ? "Close filters" : "Filters"}
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => void patchRule(r.id, { enabled: !r.enabled })}>
                        Toggle
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const next = prompt("Rule name", r.name);
                          if (!next?.trim()) return;
                          void patchRule(r.id, { name: next.trim() });
                        }}
                      >
                        Rename
                      </Button>
                      <Button type="button" size="sm" variant="destructive" onClick={() => void deleteRule(r.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                  {filtersOpen ? (
                    <div className="rounded-md border border-border/50 bg-background/60 p-3 text-xs space-y-2">
                      {!isGovernanceTrigger(r.trigger) ? (
                        <p className="text-muted-foreground">
                          Filters are evaluated for governance alert dispatch. You can still store them for when you switch this
                          rule to a governance trigger.
                        </p>
                      ) : null}
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label htmlFor={`ef-sev-${r.id}`} className="text-xs">
                            Severities
                          </Label>
                          <Input
                            id={`ef-sev-${r.id}`}
                            value={editSev}
                            onChange={(e) => setEditSev(e.target.value)}
                            className="h-9 text-xs"
                            placeholder="critical, high"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`ef-src-${r.id}`} className="text-xs">
                            Sources
                          </Label>
                          <Input
                            id={`ef-src-${r.id}`}
                            value={editSrc}
                            onChange={(e) => setEditSrc(e.target.value)}
                            className="h-9 text-xs"
                            placeholder="zapier, n8n"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`ef-dt-${r.id}`} className="text-xs">
                            Decision types
                          </Label>
                          <Input
                            id={`ef-dt-${r.id}`}
                            value={editDecisionTypes}
                            onChange={(e) => setEditDecisionTypes(e.target.value)}
                            className="h-9 text-xs"
                            placeholder="accept_risk"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`ef-tgt-${r.id}`} className="text-xs">
                            Target patterns
                          </Label>
                          <Input
                            id={`ef-tgt-${r.id}`}
                            value={editTargets}
                            onChange={(e) => setEditTargets(e.target.value)}
                            className="h-9 text-xs"
                            placeholder="substring"
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button type="button" size="sm" disabled={saving} onClick={() => void saveEditedRuleFilters()}>
                          Save filters
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setFilterEditRuleId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Delivery log */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Delivery log</p>
          <div className="h-px flex-1 bg-border/40" />
        </div>
        {deliveries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No deliveries yet. Alerts fire when a scan or governance event matches a rule.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/50">
            {deliveries.map((d, i) => (
              <div
                key={d.id}
                className={`flex flex-wrap items-center gap-3 bg-card px-5 py-3 text-xs ${
                  i !== deliveries.length - 1 ? "border-b border-border/40" : ""
                }`}
              >
                <span className="shrink-0">
                  {d.status === "ok"   ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> :
                   d.status === "test" ? <FlaskConical className="h-3.5 w-3.5 text-cyan-400" /> :
                                         <XCircle className="h-3.5 w-3.5 text-destructive" />}
                </span>
                <span className="font-medium capitalize">{d.destination_type}</span>
                {d.rule_trigger && <span className="text-muted-foreground">{d.rule_trigger}</span>}
                {d.workflow_name && <span className="truncate max-w-[160px] text-muted-foreground">{d.workflow_name}</span>}
                {d.scan_decision && <span className="font-mono">{d.scan_decision}</span>}
                {d.risk_score !== null && <span className="font-mono text-muted-foreground">{d.risk_score}/100</span>}
                {d.error_message && <span className="text-destructive truncate max-w-[200px]">{d.error_message}</span>}
                <span className="ml-auto text-muted-foreground">{new Date(d.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Personal toggles:{" "}
        <Link href="/settings/notifications" className="text-primary hover:underline">
          Settings → notifications
        </Link>
      </p>
    </div>
  );
}
