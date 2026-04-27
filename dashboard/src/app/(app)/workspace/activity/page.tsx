"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

function humanizeAction(action: string): string {
  const map: Record<string, string> = {
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
  };
  return map[action] ?? action;
}

export default function WorkspaceActivityPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [items, setItems] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!useCloud) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [workspacesRes, activeRes] = await Promise.all([
        fetch("/api/workspaces", { credentials: "include" }),
        fetch("/api/workspaces/active", { credentials: "include" }),
      ]);
      const wj = (await workspacesRes.json()) as { workspaces?: Workspace[]; error?: string };
      const aj = (await activeRes.json()) as { organizationId?: string | null };
      if (!workspacesRes.ok) {
        setError(wj.error ?? "Could not load workspaces");
        return;
      }
      const ws = wj.workspaces ?? [];
      setWorkspaces(ws);
      const nextOrg = (aj.organizationId && ws.find((w) => w.id === aj.organizationId)?.id) || ws[0]?.id || "";
      setSelectedOrg(nextOrg);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadActivity = useCallback(async () => {
    if (!selectedOrg || !useCloud) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/workspaces/${selectedOrg}/activity?limit=80`, { credentials: "include" });
      const j = (await res.json()) as { items?: ActivityRow[]; error?: string };
      if (!res.ok) {
        setError(j.error ?? "Could not load activity");
        setItems([]);
        return;
      }
      setItems(j.items ?? []);
    } catch {
      setError("Network error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [selectedOrg]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  const selected = useMemo(() => workspaces.find((w) => w.id === selectedOrg) ?? null, [workspaces, selectedOrg]);

  if (!useCloud) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Workspace activity</h1>
        <p className="text-sm text-muted-foreground">Connect Supabase to view collaborative workspace activity logs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="border-b border-border/60 pb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Collaboration</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Workspace activity</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Audit and accountability feed for invite, role, scan, share, and API actions.
        </p>
      </div>

      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Activity feed scope</CardTitle>
          <CardDescription>Select which workspace feed to inspect.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <label htmlFor="activity-org" className="text-sm font-medium">
              Workspace
            </label>
            <select
              id="activity-org"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.slug}) · {w.role}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" variant="outline" asChild>
            <Link href="/workspace">Back to workspace</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-4 w-4" aria-hidden />
            Recent activity
          </CardTitle>
          <CardDescription>
            {selected ? `${selected.name} (${selected.slug})` : "No workspace selected"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity logged yet.</p>
          ) : (
            items.map((row) => (
              <div key={row.id} className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{humanizeAction(row.action)}</Badge>
                  <span className="text-xs text-muted-foreground">
                    by {row.actorDisplayName ?? row.actorUserId ?? "Unknown"} · {new Date(row.createdAt).toLocaleString()}
                  </span>
                </div>
                {row.target ? <p className="mt-1 text-sm text-foreground">{row.target}</p> : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
