"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarClock, Loader2, Play, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hasPublicSupabaseUrl } from "@/lib/env";
import type { IntegrationProvider } from "@/lib/integrations";
import type { ScanScheduleFrequency, ScanScheduleScopeType } from "@/lib/scan-schedules";

const useCloud = hasPublicSupabaseUrl();

type ScheduleRow = {
  id: string;
  userId: string;
  organizationId: string | null;
  name: string;
  scopeType: ScanScheduleScopeType;
  scopeId: string;
  frequency: ScanScheduleFrequency;
  enabled: boolean;
  workspacePolicyId: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type RunRow = {
  id: string;
  scheduleId: string;
  status: string;
  result: Record<string, unknown> | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

type TemplateOption = { id: string; name: string; source: string };

type IntegrationOption = { id: string; name: string; provider: IntegrationProvider };

type WorkspacePolicyOption = { id: string; name: string };

function SchedulesContent() {
  const searchParams = useSearchParams();
  const templateFromQuery = searchParams.get("template");

  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [lastRuns, setLastRuns] = useState<Record<string, RunRow>>({});
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationOption[]>([]);
  const [workspacePolicies, setWorkspacePolicies] = useState<WorkspacePolicyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [scopeType, setScopeType] = useState<ScanScheduleScopeType>("workflow_template");
  const [templateId, setTemplateId] = useState("");
  const [integrationId, setIntegrationId] = useState("");
  const [frequency, setFrequency] = useState<ScanScheduleFrequency>("daily");
  const [createEnabled, setCreateEnabled] = useState(true);
  const [createPolicyId, setCreatePolicyId] = useState("");

  const load = useCallback(async () => {
    if (!useCloud) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [schRes, tplRes, intRes, polRes] = await Promise.all([
        fetch("/api/scan-schedules", { credentials: "include" }),
        fetch("/api/workflow-templates", { credentials: "include" }),
        fetch("/api/integrations", { credentials: "include" }),
        fetch("/api/workspace-policies", { credentials: "include" }),
      ]);
      const schJson = (await schRes.json()) as {
        schedules?: ScheduleRow[];
        lastRuns?: Record<string, RunRow>;
        error?: string;
      };
      if (!schRes.ok) {
        setError(schJson.error ?? "Could not load schedules");
        setSchedules([]);
        setLastRuns({});
        return;
      }
      setSchedules(schJson.schedules ?? []);
      setLastRuns(schJson.lastRuns ?? {});

      const tplJson = (await tplRes.json()) as { items?: TemplateOption[] };
      if (tplRes.ok) setTemplates(tplJson.items ?? []);

      const intJson = (await intRes.json()) as { integrations?: IntegrationOption[] };
      if (intRes.ok) setIntegrations(intJson.integrations ?? []);

      const polJson = (await polRes.json()) as { policies?: { id?: string; name?: string }[] };
      if (polRes.ok) {
        const plist = Array.isArray(polJson.policies)
          ? polJson.policies
              .filter((p) => typeof p.id === "string" && typeof p.name === "string")
              .map((p) => ({ id: p.id as string, name: p.name as string }))
          : [];
        setWorkspacePolicies(plist);
      } else {
        setWorkspacePolicies([]);
      }
    } catch {
      setError("Network error");
      setSchedules([]);
      setLastRuns({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (templateFromQuery && templates.some((t) => t.id === templateFromQuery)) {
      setTemplateId(templateFromQuery);
      setScopeType("workflow_template");
    }
  }, [templateFromQuery, templates]);

  const sortedSchedules = useMemo(
    () => [...schedules].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [schedules]
  );

  const createSchedule = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    const scopeId = scopeType === "workflow_template" ? templateId : integrationId;
    if (!name.trim()) {
      setError("Name is required.");
      setSaving(false);
      return;
    }
    if (!scopeId) {
      setError(scopeType === "workflow_template" ? "Pick a workflow template." : "Pick an integration.");
      setSaving(false);
      return;
    }
    try {
      const res = await fetch("/api/scan-schedules", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          scopeType,
          scopeId,
          frequency,
          enabled: createEnabled,
          ...(createPolicyId ? { workspacePolicyId: createPolicyId } : {}),
        }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Could not create schedule");
        return;
      }
      setName("");
      setCreatePolicyId("");
      setMessage("Schedule created. Use Run now until background cron is connected.");
      await load();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const patchSchedule = async (id: string, patch: Record<string, unknown>) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/scan-schedules/${id}`, {
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

  const runNow = async (id: string) => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/scan-schedules/${id}/run`, {
        method: "POST",
        credentials: "include",
      });
      const j = (await res.json()) as {
        ok?: boolean;
        code?: string;
        message?: string;
        error?: string;
        scanId?: string;
      };
      if (j.code === "integration_scan_not_implemented") {
        setMessage(j.message ?? "Integration runs are not implemented yet.");
        return;
      }
      if (!res.ok) {
        setError(j.error ?? "Run failed");
        return;
      }
      if (j.ok && j.scanId) {
        setMessage(`Scan saved to history (${j.scanId.slice(0, 8)}…).`);
      } else {
        setMessage("Run finished.");
      }
      await load();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const deleteSchedule = async (id: string) => {
    if (!confirm("Delete this schedule?")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/scan-schedules/${id}`, { method: "DELETE", credentials: "include" });
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

  if (!useCloud) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Scheduled scans</h1>
        <p className="text-sm text-muted-foreground">
          Connect Supabase to enable saved schedules. Manual runs use the same scan engine as /scan; automatic
          background execution will use a cron hook later.
        </p>
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-base">Local mode</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Use the workflow library and <Link href="/scan" className="text-primary hover:underline">/scan</Link>{" "}
            for now. When the dashboard is cloud-connected, schedules appear here.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="border-b border-border/60 pb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Continuous governance</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Scheduled scans</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Scheduler-ready records for workflow templates (and future integration pulls).{" "}
          <span className="font-medium text-foreground">Run now</span> executes immediately; background cron can call
          a protected tick endpoint later.
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
            <CalendarClock className="h-4 w-4" aria-hidden />
            New schedule
          </CardTitle>
          <CardDescription>
            Targets the active workspace library when a workspace is selected; otherwise personal templates.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="sch-name">Name</Label>
            <Input id="sch-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Weekly prod check" />
          </div>
          <div className="space-y-2">
            <Label>Scope</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={scopeType}
              onChange={(e) => setScopeType(e.target.value as ScanScheduleScopeType)}
            >
              <option value="workflow_template">Workflow template</option>
              <option value="integration">Integration (run not implemented)</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Frequency</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as ScanScheduleFrequency)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="manual">Manual only</option>
            </select>
          </div>
          {scopeType === "workflow_template" ? (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="sch-template">Workflow template</Label>
              <select
                id="sch-template"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                <option value="">Select template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.source})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="sch-int">Integration</Label>
              <select
                id="sch-int"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={integrationId}
                onChange={(e) => setIntegrationId(e.target.value)}
              >
                <option value="">Select integration…</option>
                {integrations.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.provider})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="sch-policy">Policy on runs (optional)</Label>
            <select
              id="sch-policy"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={createPolicyId}
              onChange={(e) => setCreatePolicyId(e.target.value)}
            >
              <option value="">None — scan only</option>
              {workspacePolicies.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Manual <strong className="font-medium text-foreground">Run now</strong> applies the same policy and
              stores <code className="rounded bg-muted px-1 font-mono text-[11px]">policyEvaluation</code> on the saved
              scan when configured.{" "}
              <Link href="/policies" className="text-primary hover:underline">
                Policies
              </Link>
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={createEnabled}
              onChange={(e) => setCreateEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Enabled
          </label>
          <div className="sm:col-span-2">
            <Button type="button" disabled={saving || loading} onClick={() => void createSchedule()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create schedule"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Your schedules</CardTitle>
          <CardDescription>Last run reflects the most recent manual or automated attempt.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : sortedSchedules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No schedules yet.</p>
          ) : (
            sortedSchedules.map((s) => {
              const last = lastRuns[s.id];
              return (
                <div key={s.id} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.scopeType === "workflow_template" ? "Workflow template" : "Integration"} · {s.frequency}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={s.enabled ? "default" : "secondary"}>{s.enabled ? "enabled" : "disabled"}</Badge>
                      <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => void runNow(s.id)}>
                        <Play className="h-3.5 w-3.5" />
                        Run now
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => void deleteSchedule(s.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>
                      Last run:{" "}
                      <span className="font-medium text-foreground">
                        {last ? `${last.status}${last.error ? ` — ${last.error.slice(0, 80)}` : ""}` : "—"}
                      </span>
                    </span>
                    <span>
                      Next:{" "}
                      <span className="font-medium text-foreground">
                        {s.nextRunAt ? new Date(s.nextRunAt).toLocaleString() : "—"}
                      </span>
                    </span>
                    {s.lastRunAt ? (
                      <span>Last at: {new Date(s.lastRunAt).toLocaleString()}</span>
                    ) : null}
                  </div>
                  <div className="mt-3 space-y-1">
                    <Label className="text-xs text-muted-foreground">Policy on runs</Label>
                    <select
                      className="flex h-9 w-full max-w-md rounded-md border border-input bg-background px-2 py-1.5 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={s.workspacePolicyId ?? ""}
                      disabled={saving}
                      onChange={(e) => {
                        const v = e.target.value;
                        void patchSchedule(s.id, { workspacePolicyId: v ? v : null });
                      }}
                    >
                      <option value="">None</option>
                      {workspacePolicies.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="mt-2 flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={s.enabled}
                      disabled={saving}
                      onChange={(e) => void patchSchedule(s.id, { enabled: e.target.checked })}
                    />
                    Schedule enabled
                  </label>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Future: <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">POST /api/scan-schedules/cron/tick</code>{" "}
        with <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">Authorization: Bearer $TORQA_CRON_SECRET</code>.
      </p>
    </div>
  );
}

export default function SchedulesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading schedules…
        </div>
      }
    >
      <SchedulesContent />
    </Suspense>
  );
}
