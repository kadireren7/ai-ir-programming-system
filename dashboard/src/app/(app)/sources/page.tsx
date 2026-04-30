"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Cable,
  GitBranch,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Workflow,
  Plug,
  Puzzle,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { hasPublicSupabaseUrl } from "@/lib/env";
import { connectorRegistry } from "@/lib/connectors";
import type { ConnectorStatus } from "@/lib/connectors/types";
import type { IntegrationProvider, IntegrationStatus } from "@/lib/integrations";

const useCloud = hasPublicSupabaseUrl();

type IntegrationRow = {
  id: string;
  userId: string;
  organizationId: string | null;
  provider: IntegrationProvider;
  name: string;
  status: IntegrationStatus;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

const SOURCE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  n8n: Workflow,
  github: GitBranch,
  webhook: Cable,
  zapier: Plug,
  make: Puzzle,
  pipedream: Zap,
};

function statusBadge(s: ConnectorStatus) {
  if (s === "available") return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">Available</Badge>;
  if (s === "beta") return <Badge variant="outline">Beta</Badge>;
  return <Badge variant="secondary">Coming soon</Badge>;
}

export default function SourcesPage() {
  const [items, setItems] = useState<IntegrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [formName, setFormName] = useState("");

  const load = useCallback(async () => {
    if (!useCloud) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations", { credentials: "include" });
      const j = (await res.json()) as { integrations?: IntegrationRow[]; error?: string };
      if (!res.ok) { setError(j.error ?? "Could not load sources"); setItems([]); return; }
      setItems(j.integrations ?? []);
    } catch { setError("Network error"); setItems([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openConnect = (id: string) => {
    setConnectingId(id);
    setFormValues({});
    setFormName(id === "n8n" ? "n8n workspace" : id + " source");
    setError(null);
    setMessage(null);
  };

  const handleConnect = async () => {
    if (!connectingId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: connectingId,
          name: formName,
          status: "draft",
          config: formValues,
        }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) { setError(j.error ?? "Could not connect source"); return; }
      setMessage("Source connected.");
      setConnectingId(null);
      await load();
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  };

  const deleteSource = async (id: string) => {
    if (!confirm("Remove this source?")) return;
    setSaving(true);
    try {
      await fetch(`/api/integrations/${id}`, { method: "DELETE", credentials: "include" });
      await load();
    } finally { setSaving(false); }
  };

  const editSource = async (row: IntegrationRow) => {
    const nextName = prompt("Source name", row.name);
    if (!nextName) return;
    setSaving(true);
    try {
      await fetch(`/api/integrations/${row.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName }),
      });
      await load();
    } finally { setSaving(false); }
  };

  const connectedIds = useMemo(() => new Set(items.map((i) => i.provider)), [items]);
  const activeConnector = connectorRegistry.find((c) => c.id === connectingId);

  return (
    <div className="space-y-8 pb-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Connect</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Sources</h1>
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
          Connect your automation platforms. Torqa scans workflows continuously and enforces policies on every run.
        </p>
      </div>

      {error ? <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      {message ? <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">{message}</p> : null}

      {/* Source catalog */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {connectorRegistry.map((connector) => {
          const Icon = SOURCE_ICONS[connector.id] ?? Cable;
          const connected = connectedIds.has(connector.id as IntegrationProvider);
          const canConnect = connector.status === "available" && useCloud;

          return (
            <Card
              key={connector.id}
              className={`border-border/70 shadow-sm transition-shadow hover:shadow-md ${connector.status === "coming_soon" ? "opacity-70" : ""}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-4 w-4 text-primary" />
                    {connector.name}
                  </CardTitle>
                  {statusBadge(connector.status)}
                </div>
                <CardDescription className="text-sm leading-relaxed">{connector.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  {connector.capabilities.map((cap) => (
                    <span key={cap} className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                      {cap.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {connected ? (
                    <Badge className="gap-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                      <BadgeCheck className="h-3 w-3" />
                      Connected
                    </Badge>
                  ) : null}
                  {canConnect && !connected ? (
                    <Button size="sm" className="gap-1.5" onClick={() => openConnect(connector.id)}>
                      <Plus className="h-3.5 w-3.5" />
                      Connect
                    </Button>
                  ) : null}
                  {canConnect && connected ? (
                    <Button size="sm" variant="outline" onClick={() => openConnect(connector.id)}>
                      Add another
                    </Button>
                  ) : null}
                  {connector.status === "coming_soon" ? (
                    <span className="text-xs text-muted-foreground">Coming soon</span>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Connect form */}
      {connectingId && activeConnector ? (
        <Card className="border-primary/30 bg-primary/[0.02] shadow-md" id="connect-form">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Cable className="h-4 w-4" />
              Connect {activeConnector.name}
            </CardTitle>
            {activeConnector.docsUrl ? (
              <CardDescription>
                <Link href={activeConnector.docsUrl} className="text-primary hover:underline" target="_blank">
                  View docs ↗
                </Link>
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="src-name">Name</Label>
              <Input id="src-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Source name" />
            </div>
            {activeConnector.credentialFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={`src-${field.key}`}>{field.label}{field.required ? "" : " (optional)"}</Label>
                {field.hint ? <p className="text-xs text-muted-foreground">{field.hint}</p> : null}
                <Input
                  id={`src-${field.key}`}
                  type={field.type === "password" ? "password" : field.type === "url" ? "url" : "text"}
                  value={formValues[field.key] ?? ""}
                  onChange={(e) => setFormValues((v) => ({ ...v, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  autoComplete="off"
                />
              </div>
            ))}
            <div className="flex gap-2">
              <Button type="button" disabled={saving} onClick={() => void handleConnect()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save connection"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setConnectingId(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Connected sources list */}
      {useCloud ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Connected</h2>
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sources connected yet. Choose one above to get started.</p>
          ) : (
            items.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-card/50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{row.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.provider} ·{" "}
                    {typeof row.config.baseUrl === "string" ? row.config.baseUrl : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={row.status === "connected" ? "default" : "secondary"}>{row.status}</Badge>
                  <Button size="sm" variant="outline" onClick={() => void editSource(row)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="outline" onClick={() => void deleteSource(row.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-6 text-center">
          <p className="text-sm font-medium">Cloud mode off</p>
          <p className="mt-1 text-sm text-muted-foreground">Connect Supabase to save sources and enable continuous scanning.</p>
          <Button asChild size="sm" className="mt-4">
            <Link href="/settings">Go to Settings</Link>
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Prefer uploading manually?{" "}
        <Link href="/advanced/manual-scan" className="text-primary hover:underline">Advanced: manual scan</Link>
      </p>
    </div>
  );
}
