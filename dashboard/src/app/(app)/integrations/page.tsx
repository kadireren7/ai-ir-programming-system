"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Cable, GitBranch, Loader2, Pencil, Plug, Puzzle, Trash2, Workflow } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { hasPublicSupabaseUrl } from "@/lib/env";
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

const providers = [
  {
    id: "n8n",
    title: "n8n",
    desc: "Connect n8n workflows to Torqa for continuous governance.",
    icon: Workflow,
    available: true,
  },
  {
    id: "github",
    title: "GitHub",
    desc: "PR and workflow-level governance hooks.",
    icon: GitBranch,
    available: false,
  },
  {
    id: "zapier",
    title: "Zapier",
    desc: "Scan orchestrations and governance triggers.",
    icon: Plug,
    available: false,
  },
  {
    id: "make",
    title: "Make",
    desc: "Scenario integrations for automation visibility.",
    icon: Puzzle,
    available: false,
  },
] as const;

export default function IntegrationsPage() {
  const [items, setItems] = useState<IntegrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState("n8n workspace");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");

  const load = useCallback(async () => {
    if (!useCloud) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations", { credentials: "include" });
      const j = (await res.json()) as { integrations?: IntegrationRow[]; error?: string };
      if (!res.ok) {
        setError(j.error ?? "Could not load integrations");
        setItems([]);
        return;
      }
      setItems(j.integrations ?? []);
    } catch {
      setError("Network error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const n8nRows = useMemo(() => items.filter((i) => i.provider === "n8n"), [items]);

  const createN8n = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "n8n",
          name,
          status: "draft",
          config: { baseUrl, apiKey },
        }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Could not create n8n integration");
        return;
      }
      setApiKey("");
      setMessage("n8n integration saved. Connected scans API sync is coming next.");
      await load();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  const deleteIntegration = async (id: string) => {
    if (!confirm("Delete this integration?")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/integrations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
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

  const editIntegration = async (row: IntegrationRow) => {
    const nextName = prompt("Integration name", row.name);
    if (!nextName) return;
    const currentBaseUrl = typeof row.config.baseUrl === "string" ? row.config.baseUrl : "";
    const nextBaseUrl = prompt("n8n base URL", currentBaseUrl);
    if (!nextBaseUrl) return;
    const nextApiKey = prompt("API key (optional, stores masked hint only)", "");

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/integrations/${row.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nextName,
          status: "draft",
          config: { baseUrl: nextBaseUrl, apiKey: nextApiKey ?? undefined },
        }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(j.error ?? "Update failed");
        return;
      }
      setMessage("Integration updated.");
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (!useCloud) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Connect Supabase to enable saved integrations. Torqa is moving from manual uploads toward connected workflow
          governance.
        </p>
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-base">Available now</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            n8n integration foundation is available in cloud mode. GitHub, Zapier, and Make are planned.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="border-b border-border/60 pb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Connected governance</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Integrations</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Native integrations are the path from manual upload scanning to continuous workflow governance. n8n is
          available now in MVP placeholder mode.
        </p>
      </div>

      {error ? <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      {message ? <p className="rounded-lg border border-border/80 bg-muted/40 px-3 py-2 text-sm">{message}</p> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {providers.map((p) => {
          const Icon = p.icon;
          return (
            <Card key={p.id} className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="h-4 w-4 text-primary" />
                  {p.title}
                </CardTitle>
                <CardDescription>{p.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant={p.available ? "default" : "secondary"}>
                  {p.available ? "Available" : "Coming soon"}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Cable className="h-4 w-4" aria-hidden />
            Create n8n integration
          </CardTitle>
          <CardDescription>
            For this MVP foundation, Torqa stores connection metadata and only masked API-key hints. Real n8n API sync
            comes next.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="int-name">Name</Label>
            <Input id="int-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="n8n production" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="int-base">Base URL</Label>
            <Input
              id="int-base"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://n8n.company.com"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="int-key">API key (placeholder)</Label>
            <Input
              id="int-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste token to store masked hint only"
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="button" disabled={saving || loading} onClick={() => void createN8n()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save n8n integration"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Saved integrations</CardTitle>
          <CardDescription>Connected scans and ingestion jobs are the next milestone on top of this foundation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : n8nRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No integrations yet.</p>
          ) : (
            n8nRows.map((row) => (
              <div key={row.id} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{row.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(typeof row.config.baseUrl === "string" && row.config.baseUrl) || "No URL"} ·{" "}
                      {(typeof row.config.apiKeyMask === "string" && row.config.apiKeyMask) || "No key hint"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={row.status === "connected" ? "default" : "secondary"}>
                      {row.status === "connected" ? <BadgeCheck className="mr-1 h-3 w-3" /> : null}
                      {row.status}
                    </Badge>
                    <Button type="button" size="sm" variant="outline" onClick={() => void editIntegration(row)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => void deleteIntegration(row.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Created {new Date(row.createdAt).toLocaleString()} • Updated {new Date(row.updatedAt).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Next: secure token vaulting + validated n8n API health checks + webhook/pull sync for continuous scan triggers.
        In the meantime, you can keep scanning manually at <Link href="/scan" className="text-primary hover:underline">/scan</Link>.
      </p>
    </div>
  );
}
