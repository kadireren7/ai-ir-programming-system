"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Filter, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { hasPublicSupabaseUrl } from "@/lib/env";

const useCloud = hasPublicSupabaseUrl();

type Workspace = { id: string; name: string; slug: string; role: string };
type ActivityRow = {
  id: number;
  actorUserId: string | null;
  actorDisplayName: string | null;
  action: string;
  target: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

const ACTION_LABELS: Record<string, string> = {
  "invite.sent": "Invite sent",
  "member.joined": "Member joined",
  "member.left": "Member left",
  "member.removed": "Member removed",
  "member.role_changed": "Role changed",
  "workspace.ownership_transferred": "Ownership transferred",
  "workspace.renamed": "Workspace renamed",
  "scan.created": "Scan created",
  "workflow.uploaded": "Workflow uploaded",
  "report.shared": "Report shared",
  "api_key.created": "API key created",
  "api_key.revoked": "API key revoked",
  "integration.connected": "Integration connected",
  "integration.disconnected": "Integration disconnected",
  "policy.changed": "Policy changed",
  "schedule.created": "Schedule created",
  "alert.sent": "Alert sent",
};

const ACTION_CATEGORIES: Record<string, string[]> = {
  All: [],
  Access: ["invite.sent", "member.joined", "member.left", "member.removed", "member.role_changed", "workspace.ownership_transferred", "api_key.created", "api_key.revoked"],
  Scans: ["scan.created", "workflow.uploaded", "report.shared"],
  Integrations: ["integration.connected", "integration.disconnected", "schedule.created"],
  Policies: ["policy.changed", "alert.sent"],
};

function actionBadgeVariant(action: string): "default" | "secondary" | "outline" | "destructive" {
  if (action.includes("removed") || action.includes("revoked") || action.includes("left") || action.includes("disconnected")) return "destructive";
  if (action.includes("created") || action.includes("connected") || action.includes("joined")) return "default";
  return "secondary";
}

export default function AuditLogPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [items, setItems] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const loadWorkspaces = useCallback(async () => {
    if (!useCloud) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [wRes, aRes] = await Promise.all([
        fetch("/api/workspaces", { credentials: "include" }),
        fetch("/api/workspaces/active", { credentials: "include" }),
      ]);
      const wj = (await wRes.json()) as { workspaces?: Workspace[]; error?: string };
      const aj = (await aRes.json()) as { organizationId?: string | null };
      if (!wRes.ok) { setError(wj.error ?? "Could not load workspaces"); return; }
      const ws = wj.workspaces ?? [];
      setWorkspaces(ws);
      const next = (aj.organizationId && ws.find((w) => w.id === aj.organizationId)?.id) || ws[0]?.id || "";
      setSelectedOrg(next);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadActivity = useCallback(async () => {
    if (!selectedOrg || !useCloud) { setItems([]); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${selectedOrg}/activity?limit=100`, { credentials: "include" });
      const j = (await res.json()) as { items?: ActivityRow[]; error?: string };
      if (!res.ok) { setError(j.error ?? "Could not load audit log"); setItems([]); return; }
      setItems(j.items ?? []);
    } catch {
      setError("Network error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [selectedOrg]);

  useEffect(() => { void loadWorkspaces(); }, [loadWorkspaces]);
  useEffect(() => { void loadActivity(); }, [loadActivity]);

  const filtered = useMemo(() => {
    const allowed = ACTION_CATEGORIES[category] ?? [];
    return items.filter((row) => {
      if (allowed.length > 0 && !allowed.includes(row.action)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          row.action.toLowerCase().includes(q) ||
          (row.actorDisplayName ?? "").toLowerCase().includes(q) ||
          (row.target ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, category, search]);

  const selected = useMemo(() => workspaces.find((w) => w.id === selectedOrg) ?? null, [workspaces, selectedOrg]);

  if (!useCloud) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground">Connect Supabase to enable the audit trail.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Settings</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Audit Log</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Full trail of who did what and when — integrations, scans, policies, access changes.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" aria-hidden />
            Filter
          </CardTitle>
          <CardDescription>
            {selected ? `${selected.name} · ${items.length} events` : "No workspace selected"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {workspaces.length > 1 && (
            <div className="min-w-0 flex-1 space-y-1.5">
              <label htmlFor="audit-org" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Workspace
              </label>
              <select
                id="audit-org"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.slug})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="min-w-0 flex-1 space-y-1.5">
            <label htmlFor="audit-search" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Search
            </label>
            <Input
              id="audit-search"
              placeholder="action, actor, resource…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9"
            />
          </div>

          <Button type="button" variant="outline" size="sm" onClick={() => void loadActivity()} disabled={loading}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-1.5">
        {Object.keys(ACTION_CATEGORIES).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              category === cat
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-muted/30 text-muted-foreground hover:bg-muted"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-4 w-4" aria-hidden />
            Events
          </CardTitle>
          <CardDescription>
            {filtered.length} of {items.length} events shown
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events match your filter.</p>
          ) : (
            filtered.map((row) => (
              <div
                key={row.id}
                className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={actionBadgeVariant(row.action)} className="text-[11px]">
                    {ACTION_LABELS[row.action] ?? row.action}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {row.actorDisplayName ?? row.actorUserId ?? "System"} &middot;{" "}
                    {new Date(row.createdAt).toLocaleString()}
                  </span>
                </div>
                {row.target ? (
                  <p className="mt-1 truncate text-sm text-foreground">{row.target}</p>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
