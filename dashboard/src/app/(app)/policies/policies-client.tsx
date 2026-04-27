"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Loader2, Pencil, Plus, Shield, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BUILT_IN_POLICY_TEMPLATES,
  getBuiltInTemplateBySlug,
  mergeThresholdConfig,
} from "@/lib/built-in-policy-templates";
import { hasPublicSupabaseUrl } from "@/lib/env";
import type { PolicyThresholdConfig } from "@/lib/policy-types";

const hasCloud = hasPublicSupabaseUrl();

type TemplateRow = {
  slug: string;
  name: string;
  description?: string;
  category?: string;
  builtIn?: boolean;
  config?: unknown;
};

type WorkspacePolicyRow = {
  id: string;
  name: string;
  templateSlug: string | null;
  config: Record<string, unknown>;
  enabled: boolean;
};

function effectiveConfigForRow(row: WorkspacePolicyRow): PolicyThresholdConfig {
  const slug = row.templateSlug;
  const built = slug ? getBuiltInTemplateBySlug(slug) : null;
  const base = built ? built.config : BUILT_IN_POLICY_TEMPLATES[0].config;
  return mergeThresholdConfig(base, row.config as Partial<PolicyThresholdConfig>);
}

export function PoliciesPageClient() {
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [policies, setPolicies] = useState<WorkspacePolicyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [createSlug, setCreateSlug] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");

  const [editRow, setEditRow] = useState<WorkspacePolicyRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editEnabled, setEditEnabled] = useState(true);
  const [editCfg, setEditCfg] = useState<PolicyThresholdConfig>(() => ({
    ...BUILT_IN_POLICY_TEMPLATES[0].config,
  }));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tplRes = await fetch("/api/policy-templates");
      const tplJson = (await tplRes.json()) as { templates?: TemplateRow[] };
      if (tplRes.ok && Array.isArray(tplJson.templates)) {
        setTemplates(tplJson.templates);
      } else {
        setTemplates(
          BUILT_IN_POLICY_TEMPLATES.map((t) => ({
            slug: t.slug,
            name: t.name,
            description: t.description,
            category: t.category,
            builtIn: true,
            config: t.config,
          }))
        );
      }

      if (!hasCloud) {
        setPolicies([]);
        return;
      }
      const polRes = await fetch("/api/workspace-policies", { credentials: "include" });
      const polJson = (await polRes.json()) as { policies?: WorkspacePolicyRow[]; error?: string };
      if (!polRes.ok) {
        setPolicies([]);
        if (polRes.status !== 401 && polRes.status !== 503) {
          setError(polJson.error ?? "Could not load workspace policies");
        }
        return;
      }
      setPolicies(Array.isArray(polJson.policies) ? polJson.policies : []);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = (slug: string) => {
    const t = templates.find((x) => x.slug === slug) ?? getBuiltInTemplateBySlug(slug);
    setCreateSlug(slug);
    setCreateName(t?.name ?? slug);
    setMessage(null);
    setError(null);
  };

  const submitCreate = async () => {
    if (!createSlug || !createName.trim()) return;
    if (!hasCloud) {
      setError("Connect Supabase to save workspace policies.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/workspace-policies", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName.trim(),
          templateSlug: createSlug,
          enabled: true,
          config: {},
        }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Create failed");
        return;
      }
      setCreateSlug(null);
      setCreateName("");
      setMessage("Policy saved. Use it from /scan or scheduled runs.");
      await load();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (row: WorkspacePolicyRow) => {
    setEditRow(row);
    setEditName(row.name);
    setEditEnabled(row.enabled);
    setEditCfg(effectiveConfigForRow(row));
    setError(null);
  };

  const saveEdit = async () => {
    if (!editRow) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/workspace-policies/${encodeURIComponent(editRow.id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          enabled: editEnabled,
          config: editCfg,
        }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Update failed");
        return;
      }
      setEditRow(null);
      setMessage("Policy updated.");
      await load();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (row: WorkspacePolicyRow, enabled: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspace-policies/${encodeURIComponent(row.id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Update failed");
        return;
      }
      await load();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const removePolicy = async (id: string) => {
    if (!confirm("Delete this workspace policy?")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspace-policies/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Delete failed");
        return;
      }
      await load();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-10 pb-10">
      <div className="border-b border-border/60 pb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Governance</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Policy templates</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Templates encode trust floors, critical handling, review caps, and hygiene checks. When you attach a policy to
          a scan (UI, <code className="rounded bg-muted px-1 font-mono text-xs">POST /api/scan</code>, or a schedule),
          Torqa evaluates the scan result and returns{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">policyEvaluation</code> — PASS / WARN / FAIL plus
          violations and recommendations — without changing the underlying engine findings.
        </p>
        <p className="mt-3 text-sm">
          <Link href="/scan" className="font-medium text-primary hover:underline">
            Run a scan with a policy →
          </Link>
          <span className="mx-2 text-muted-foreground">·</span>
          <Link href="/policy" className="font-medium text-muted-foreground hover:text-foreground hover:underline">
            Legacy policy settings
          </Link>
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
            <BookOpen className="h-4 w-4" aria-hidden />
            How this affects scan results
          </CardTitle>
          <CardDescription>
            The scan engine still produces PASS / NEEDS REVIEW / FAIL and findings. Policy adds a second layer for
            standards you choose.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ul className="list-inside list-disc space-y-1.5">
            <li>
              <span className="font-medium text-foreground">Trust floor</span> — FAIL when{" "}
              <code className="rounded bg-muted px-1 font-mono text-[11px]">riskScore</code> is below{" "}
              <code className="rounded bg-muted px-1 font-mono text-[11px]">minimumTrustScore</code>.
            </li>
            <li>
              <span className="font-medium text-foreground">Critical handling</span> — optional FAIL when critical-class
              findings exist and <code className="rounded bg-muted px-1 font-mono text-[11px]">failOnCritical</code> is
              on.
            </li>
            <li>
              <span className="font-medium text-foreground">Review budget</span> — WARN or FAIL when review findings
              exceed <code className="rounded bg-muted px-1 font-mono text-[11px]">maxReviewFindings</code> (mode{" "}
              <code className="rounded bg-muted px-1 font-mono text-[11px]">reviewOverflowMode</code>).
            </li>
            <li>
              <span className="font-medium text-foreground">Hygiene gates</span> — plaintext secrets, webhook auth,
              error handling, and TLS bypass rules map to evaluator checks on the structured scan output.
            </li>
          </ul>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="text-lg font-semibold tracking-tight">Built-in templates</h2>
        </div>
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((t) => (
              <Card key={t.slug} className="border-border/80 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-base">{t.name}</CardTitle>
                    {t.category ? (
                      <Badge variant="secondary" className="text-xs">
                        {t.category}
                      </Badge>
                    ) : null}
                  </div>
                  <CardDescription className="text-xs leading-relaxed">{t.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="font-mono text-[11px] text-muted-foreground">{t.slug}</p>
                  <details className="rounded-md border border-border/60 bg-muted/20 p-2 text-xs">
                    <summary className="cursor-pointer font-medium text-foreground">Preview thresholds</summary>
                    <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all text-[11px] text-muted-foreground">
                      {JSON.stringify(
                        (t.config && typeof t.config === "object" && !Array.isArray(t.config)
                          ? t.config
                          : getBuiltInTemplateBySlug(t.slug)?.config) ?? {},
                        null,
                        2
                      )}
                    </pre>
                  </details>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    disabled={!hasCloud || saving}
                    onClick={() => openCreate(t.slug)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Save as workspace policy
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {!hasCloud ? (
          <p className="text-xs text-muted-foreground">
            Built-in templates load without Supabase. Saving workspace policies requires cloud auth + database.
          </p>
        ) : null}
      </section>

      {hasCloud ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Your workspace policies</h2>
          {policies.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved policies yet. Create one from a template above.</p>
          ) : (
            <div className="space-y-3">
              {policies.map((p) => (
                <div key={p.id} className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/15 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.templateSlug ? `From template · ${p.templateSlug}` : "Custom thresholds"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={p.enabled}
                        disabled={saving}
                        onChange={(e) => void toggleEnabled(p, e.target.checked)}
                      />
                      Enabled
                    </label>
                    <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => openEdit(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                      Edit thresholds
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => void removePolicy(p.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {createSlug ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md border-border shadow-lg">
            <CardHeader>
              <CardTitle className="text-base">Create workspace policy</CardTitle>
              <CardDescription>From template {createSlug}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pol-name">Name</Label>
                <Input id="pol-name" value={createName} onChange={(e) => setCreateName(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setCreateSlug(null)}>
                  Cancel
                </Button>
                <Button type="button" disabled={saving} onClick={() => void submitCreate()}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {editRow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-background/80 p-4 backdrop-blur-sm">
          <Card className="my-8 w-full max-w-lg border-border shadow-lg">
            <CardHeader>
              <CardTitle className="text-base">Edit policy</CardTitle>
              <CardDescription>Threshold overrides merge on top of the template baseline.</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[70vh] space-y-4 overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="ed-name">Name</Label>
                <Input id="ed-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editEnabled} onChange={(e) => setEditEnabled(e.target.checked)} />
                Enabled
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="ed-min">minimumTrustScore (0–100)</Label>
                  <Input
                    id="ed-min"
                    type="number"
                    min={0}
                    max={100}
                    value={editCfg.minimumTrustScore}
                    onChange={(e) =>
                      setEditCfg((c) => ({ ...c, minimumTrustScore: Number(e.target.value) || 0 }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ed-maxrev">maxReviewFindings</Label>
                  <Input
                    id="ed-maxrev"
                    type="number"
                    min={0}
                    value={editCfg.maxReviewFindings}
                    onChange={(e) =>
                      setEditCfg((c) => ({ ...c, maxReviewFindings: Number(e.target.value) || 0 }))
                    }
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="ed-rom">reviewOverflowMode</Label>
                  <select
                    id="ed-rom"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={editCfg.reviewOverflowMode}
                    onChange={(e) =>
                      setEditCfg((c) => ({
                        ...c,
                        reviewOverflowMode: e.target.value === "fail" ? "fail" : "warn",
                      }))
                    }
                  >
                    <option value="warn">warn</option>
                    <option value="fail">fail</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                {(
                  [
                    ["failOnCritical", "Fail on critical findings"],
                    ["requireNoPlaintextSecrets", "Require no plaintext secrets"],
                    ["requireWebhookAuth", "Require webhook auth"],
                    ["requireErrorHandling", "Require error handling"],
                    ["blockTlsBypass", "Block TLS bypass / insecure transport"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editCfg[key]}
                      onChange={(e) => setEditCfg((c) => ({ ...c, [key]: e.target.checked }))}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setEditRow(null)}>
                  Cancel
                </Button>
                <Button type="button" disabled={saving} onClick={() => void saveEdit()}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
