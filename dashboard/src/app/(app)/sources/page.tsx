"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Cable,
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
  GitBranch,
  Workflow,
  Webhook,
  Plug,
  Puzzle,
  Zap,
  Bot,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { hasPublicSupabaseUrl } from "@/lib/env";
import { connectorRegistry } from "@/lib/connectors";
import { ProviderCard } from "@/components/provider-card";
import { N8nConnectPanel } from "@/components/n8n-connect-panel";
import { AiAgentScanPanel } from "@/components/ai-agent-scan-panel";
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

const ROW_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  n8n: Workflow,
  github: GitBranch,
  webhook: Webhook,
  zapier: Zap,
  make: Puzzle,
  pipedream: Plug,
  "ai-agent": Bot,
};

export default function SourcesPage() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<IntegrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(searchParams.get("error"));
  const [message, setMessage] = useState<string | null>(
    searchParams.get("connected") === "github" ? "GitHub connected successfully." : null
  );

  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [formName, setFormName] = useState("");
  const [n8nPanelOpen, setN8nPanelOpen] = useState(false);
  const [aiAgentPanelOpen, setAiAgentPanelOpen] = useState(false);

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
    const connector = connectorRegistry.find((c) => c.id === id);
    if (connector?.authType === "oauth") {
      window.location.assign("/api/integrations/github/oauth/start");
      return;
    }
    if (id === "n8n") {
      setN8nPanelOpen(true);
      return;
    }
    if (id === "ai-agent") {
      setAiAgentPanelOpen(true);
      return;
    }
    setConnectingId(id);
    setFormValues({});
    setFormName(id + " source");
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

  const n8nRow = useMemo(() => items.find((i) => i.provider === "n8n"), [items]);
  const n8nBaseUrl = typeof n8nRow?.config?.baseUrl === "string" ? n8nRow.config.baseUrl : undefined;
  const n8nApiKeyMask = typeof n8nRow?.config?.apiKeyMask === "string" ? n8nRow.config.apiKeyMask : undefined;

  const syncSource = async (id: string) => {
    setSyncingId(id);
    try {
      const res = await fetch(`/api/integrations/${id}/sync`, { method: "POST", credentials: "include" });
      const j = (await res.json()) as { error?: string; added?: number; updated?: number; unchanged?: number };
      if (!res.ok) { setError(j.error ?? "Sync failed"); return; }
      const added = j.added ?? 0;
      const updated = j.updated ?? 0;
      setMessage(`Sync complete — ${added} added, ${updated} updated.`);
    } catch { setError("Network error"); }
    finally { setSyncingId(null); }
  };

  const disconnectN8n = async () => {
    if (!n8nRow) return;
    setSaving(true);
    try {
      await fetch(`/api/integrations/${n8nRow.id}`, { method: "DELETE", credentials: "include" });
      await load();
    } finally { setSaving(false); }
  };

  const availableConnectors = connectorRegistry.filter((c) => c.status !== "coming_soon");
  const comingSoonConnectors = connectorRegistry.filter((c) => c.status === "coming_soon");

  return (
    <div className="space-y-10 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Sources</p>
        <h1 className="text-2xl font-semibold tracking-tight">Integration Center</h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Connect your automation platforms. Torqa continuously monitors connected sources, enforces policies, and surfaces governance violations.
        </p>
      </div>

      {/* Alerts */}
      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-400">{message}</p>
      ) : null}

      {/* Connect form */}
      {connectingId && activeConnector ? (
        <Card className="border-cyan-500/20 bg-cyan-500/[0.02] shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Cable className="h-4 w-4 text-cyan-400" />
              Connect {activeConnector.name}
            </CardTitle>
            {activeConnector.docsUrl ? (
              <CardDescription>
                <Link href={activeConnector.docsUrl} className="text-cyan-400 hover:underline" target="_blank">
                  View docs ↗
                </Link>
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="src-name" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Connection name</Label>
              <Input id="src-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Production n8n" className="max-w-sm" />
            </div>
            {activeConnector.credentialFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={`src-${field.key}`} className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {field.label}{field.required ? "" : " (optional)"}
                </Label>
                {field.hint ? <p className="text-xs text-muted-foreground">{field.hint}</p> : null}
                <Input
                  id={`src-${field.key}`}
                  type={field.type === "password" ? "password" : field.type === "url" ? "url" : "text"}
                  value={formValues[field.key] ?? ""}
                  onChange={(e) => setFormValues((v) => ({ ...v, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  autoComplete="off"
                  className="max-w-sm"
                />
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Button type="button" disabled={saving} size="sm" onClick={() => void handleConnect()}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save connection"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConnectingId(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Available providers */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Available</p>
          <div className="h-px flex-1 bg-border/40" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {availableConnectors.map((connector) => (
            <ProviderCard
              key={connector.id}
              connector={connector}
              connected={connectedIds.has(connector.id as IntegrationProvider)}
              canConnect={useCloud}
              onConnect={() => openConnect(connector.id)}
            />
          ))}
        </div>
      </div>

      {/* Coming soon */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Coming soon</p>
          <div className="h-px flex-1 bg-border/40" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {comingSoonConnectors.map((connector) => (
            <ProviderCard
              key={connector.id}
              connector={connector}
              connected={false}
              canConnect={false}
              onConnect={() => {}}
            />
          ))}
        </div>
      </div>

      {/* Connected sources list */}
      {useCloud ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Connected</p>
            <div className="h-px flex-1 bg-border/40" />
          </div>
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-border/40 bg-muted/10 px-6 py-8 text-center">
              <p className="text-sm text-muted-foreground">No sources connected yet.</p>
              <p className="mt-1 text-xs text-muted-foreground">Choose a provider above to get started.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/50">
              {items.map((row, i) => {
                const Icon = ROW_ICONS[row.provider] ?? Cable;
                return (
                  <div
                    key={row.id}
                    className={`flex flex-wrap items-center justify-between gap-3 bg-card px-5 py-3.5 ${
                      i !== items.length - 1 ? "border-b border-border/40" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium leading-tight">{row.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.provider}
                          {typeof row.config.baseUrl === "string" ? ` · ${row.config.baseUrl}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          row.status === "connected"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : "border-border/50 bg-muted/30 text-muted-foreground"
                        }
                      >
                        {row.status}
                      </Badge>
                      {row.status === "connected" && (
                        <Button
                          size="sm" variant="ghost" className="h-7 w-7 p-0"
                          disabled={syncingId === row.id}
                          onClick={() => void syncSource(row.id)}
                          title="Sync now"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${syncingId === row.id ? "animate-spin" : ""}`} />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => void editSource(row)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => void deleteSource(row.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-muted/10 px-6 py-8 text-center">
          <p className="text-sm font-medium">Cloud mode disabled</p>
          <p className="mt-1 text-sm text-muted-foreground">Connect Supabase to save sources and enable continuous scanning.</p>
          <Button asChild size="sm" className="mt-4">
            <Link href="/settings">Configure in Settings</Link>
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Need to upload manually?{" "}
        <Link href="/advanced/manual-scan" className="text-muted-foreground underline underline-offset-2 hover:text-foreground">
          Advanced → Manual Scan
        </Link>
      </p>

      <AiAgentScanPanel
        open={aiAgentPanelOpen}
        onClose={() => setAiAgentPanelOpen(false)}
      />

      <N8nConnectPanel
        open={n8nPanelOpen}
        onClose={() => setN8nPanelOpen(false)}
        existingBaseUrl={n8nBaseUrl}
        existingApiKeyMask={n8nApiKeyMask}
        onDisconnect={n8nRow ? disconnectN8n : undefined}
        onSaved={() => { void load(); setMessage("n8n connected."); }}
      />
    </div>
  );
}
