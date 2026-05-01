"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Cable,
  GitBranch,
  Loader2,
  RefreshCw,
  Webhook,
  Workflow,
  Zap,
  Puzzle,
  Plug,
  Bot,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { hasPublicSupabaseUrl } from "@/lib/env";

const useCloud = hasPublicSupabaseUrl();

type WorkflowRow = {
  id: string;
  name: string;
  source: string;
  source_id: string | null;
  external_id: string | null;
  last_synced_at: string | null;
  risk_score: number | null;
  last_scan_decision: "approve" | "review" | "block" | null;
  last_scanned_at: string | null;
  created_at: string;
};

type IntegrationRow = {
  id: string;
  provider: string;
  name: string;
  status: string;
  config: Record<string, unknown>;
};

const SOURCE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  n8n: Workflow,
  github: GitBranch,
  webhook: Webhook,
  zapier: Zap,
  make: Puzzle,
  pipedream: Plug,
  "ai-agent": Bot,
  generic: Cable,
};

function DecisionBadge({ decision }: { decision: "approve" | "review" | "block" | null }) {
  if (!decision) return <span className="text-xs text-muted-foreground">Not scanned</span>;
  if (decision === "approve") return (
    <span className="flex items-center gap-1 text-xs text-emerald-400">
      <CheckCircle2 className="h-3 w-3" /> Approved
    </span>
  );
  if (decision === "review") return (
    <span className="flex items-center gap-1 text-xs text-amber-400">
      <Clock className="h-3 w-3" /> Review
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-xs text-red-400">
      <AlertTriangle className="h-3 w-3" /> Blocked
    </span>
  );
}

function RiskBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  const color = score >= 80 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400";
  return <span className={`text-xs font-mono font-semibold ${color}`}>{score}</span>;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowRow[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [syncMsg, setSyncMsg] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!useCloud) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [wfRes, intRes] = await Promise.all([
        fetch("/api/workflows", { credentials: "include" }),
        fetch("/api/integrations", { credentials: "include" }),
      ]);
      const wfJson  = (await wfRes.json())  as { workflows?: WorkflowRow[];  error?: string };
      const intJson = (await intRes.json()) as { integrations?: IntegrationRow[]; error?: string };
      if (!wfRes.ok)  { setError(wfJson.error  ?? "Failed to load workflows"); return; }
      if (!intRes.ok) { setError(intJson.error ?? "Failed to load integrations"); return; }
      setWorkflows(wfJson.workflows ?? []);
      setIntegrations((intJson.integrations ?? []).filter((i) => i.status === "connected"));
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const triggerSync = async (integrationId: string) => {
    setSyncing((s) => ({ ...s, [integrationId]: true }));
    setSyncMsg((m) => ({ ...m, [integrationId]: "" }));
    try {
      const res = await fetch("/api/workflows/sync", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integrationId }),
      });
      const j = (await res.json()) as { ok?: boolean; added?: number; updated?: number; unchanged?: number; error?: string };
      if (!res.ok) {
        setSyncMsg((m) => ({ ...m, [integrationId]: j.error ?? "Sync failed" }));
      } else {
        setSyncMsg((m) => ({ ...m, [integrationId]: `+${j.added ?? 0} added · ${j.updated ?? 0} updated · ${j.unchanged ?? 0} unchanged` }));
        await loadAll();
      }
    } catch {
      setSyncMsg((m) => ({ ...m, [integrationId]: "Network error" }));
    } finally {
      setSyncing((s) => ({ ...s, [integrationId]: false }));
    }
  };

  const workflowsBySource = integrations.reduce<Record<string, WorkflowRow[]>>((acc, int) => {
    acc[int.id] = workflows.filter((w) => w.source_id === int.id);
    return acc;
  }, {});

  const orphanWorkflows = workflows.filter((w) => !w.source_id);

  return (
    <div className="space-y-10 pb-12">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Governance</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Workflows</h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Workflows synced from connected sources. Each workflow is scanned against your policy packs.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {!useCloud ? (
        <div className="rounded-xl border border-border/50 bg-muted/10 px-6 py-8 text-center">
          <p className="text-sm font-medium">Cloud mode disabled</p>
          <p className="mt-1 text-sm text-muted-foreground">Connect Supabase to sync workflows from sources.</p>
          <Button asChild size="sm" className="mt-4"><Link href="/settings">Configure in Settings</Link></Button>
        </div>
      ) : loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      ) : integrations.length === 0 ? (
        <div className="rounded-xl border border-border/40 bg-muted/10 px-6 py-10 text-center">
          <Workflow className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium">No sources connected</p>
          <p className="mt-1 text-xs text-muted-foreground">Connect a source to start syncing workflows.</p>
          <Button asChild size="sm" className="mt-4"><Link href="/sources">Go to Integration Center</Link></Button>
        </div>
      ) : (
        <div className="space-y-10">
          {integrations.map((integration) => {
            const Icon = SOURCE_ICONS[integration.provider] ?? Cable;
            const sourceWorkflows = workflowsBySource[integration.id] ?? [];
            const isSyncing = syncing[integration.id] ?? false;
            const msg = syncMsg[integration.id];
            const lastSync = typeof integration.config.last_synced_at === "string"
              ? integration.config.last_synced_at
              : null;

            return (
              <div key={integration.id} className="space-y-4">
                {/* Source header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">{integration.name}</span>
                    <Badge className="border-border/50 bg-muted/30 text-muted-foreground text-[10px]">
                      {integration.provider}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {sourceWorkflows.length} workflow{sourceWorkflows.length !== 1 ? "s" : ""}
                    </span>
                    {lastSync && (
                      <span className="text-xs text-muted-foreground">· synced {timeAgo(lastSync)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {msg && (
                      <span className={`text-xs ${msg.startsWith("+") ? "text-emerald-400" : "text-destructive"}`}>
                        {msg}
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1.5 text-xs"
                      disabled={isSyncing}
                      onClick={() => void triggerSync(integration.id)}
                    >
                      <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
                      {isSyncing ? "Syncing…" : "Sync now"}
                    </Button>
                  </div>
                </div>

                {/* Workflow list */}
                {sourceWorkflows.length === 0 ? (
                  <div className="rounded-xl border border-border/30 bg-muted/5 px-5 py-6 text-center">
                    <p className="text-xs text-muted-foreground">
                      {
                        "No workflows synced yet. Click Sync now on this source header to fetch workflows."
                      }
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-border/50">
                    {sourceWorkflows.map((wf, i) => (
                      <div
                        key={wf.id}
                        className={`flex flex-wrap items-center justify-between gap-3 bg-card px-5 py-3.5 ${
                          i !== sourceWorkflows.length - 1 ? "border-b border-border/40" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium leading-tight">{wf.name}</p>
                            {wf.external_id && (
                              <p className="text-[11px] text-muted-foreground font-mono">{wf.external_id}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <RiskBadge score={wf.risk_score} />
                          <DecisionBadge decision={wf.last_scan_decision} />
                          <span className="text-xs text-muted-foreground">{timeAgo(wf.last_synced_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Manually uploaded workflows */}
          {orphanWorkflows.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Manually uploaded</p>
                <div className="h-px flex-1 bg-border/40" />
              </div>
              <div className="overflow-hidden rounded-xl border border-border/50">
                {orphanWorkflows.map((wf, i) => (
                  <div
                    key={wf.id}
                    className={`flex flex-wrap items-center justify-between gap-3 bg-card px-5 py-3.5 ${
                      i !== orphanWorkflows.length - 1 ? "border-b border-border/40" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Cable className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <p className="text-sm font-medium">{wf.name}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <RiskBadge score={wf.risk_score} />
                      <DecisionBadge decision={wf.last_scan_decision} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Upload a workflow manually?{" "}
        <Link href="/advanced/manual-scan" className="text-muted-foreground underline underline-offset-2 hover:text-foreground">
          Advanced → Manual Scan
        </Link>
      </p>
    </div>
  );
}
