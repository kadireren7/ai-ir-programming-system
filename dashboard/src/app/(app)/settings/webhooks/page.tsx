"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Webhook } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hasPublicSupabaseUrl } from "@/lib/env";

type WebhookRow = {
  id: string;
  name: string;
  url: string;
  secret: string | null;
  enabled: boolean;
  trigger_on: string[];
  created_at: string;
};

const TRIGGER_OPTIONS = ["FAIL", "NEEDS REVIEW", "PASS"];

export default function WebhooksSettingsPage() {
  const [items, setItems] = useState<WebhookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [triggerOn, setTriggerOn] = useState<string[]>(["FAIL"]);

  const isCloud = hasPublicSupabaseUrl();

  const load = useCallback(async () => {
    if (!isCloud) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/enforcement-webhooks", { credentials: "include" });
      const j = (await res.json()) as { webhooks?: WebhookRow[]; error?: string };
      if (!res.ok) { setError(j.error ?? "Load failed"); return; }
      setItems(j.webhooks ?? []);
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }, [isCloud]);

  useEffect(() => { void load(); }, [load]);

  const toggleTrigger = (t: string) => {
    setTriggerOn((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const handleCreate = async () => {
    if (!name.trim() || !url.trim()) { setError("Name and URL are required"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/enforcement-webhooks", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), url: url.trim(), secret: secret.trim() || null, triggerOn }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) { setError(j.error ?? "Create failed"); return; }
      setShowForm(false);
      setName(""); setUrl(""); setSecret(""); setTriggerOn(["FAIL"]);
      await load();
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  };

  const toggleEnabled = async (id: string, enabled: boolean) => {
    setSaving(true);
    try {
      await fetch(`/api/enforcement-webhooks/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      await load();
    } finally { setSaving(false); }
  };

  const deleteWebhook = async (id: string) => {
    if (!confirm("Delete this webhook?")) return;
    setSaving(true);
    try {
      await fetch(`/api/enforcement-webhooks/${id}`, { method: "DELETE", credentials: "include" });
      await load();
    } finally { setSaving(false); }
  };

  if (!isCloud) {
    return (
      <div className="space-y-6 pb-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Settings</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Enforcement Webhooks</h1>
        </div>
        <p className="text-sm text-muted-foreground">Cloud mode is required to use enforcement webhooks.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Settings</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Enforcement Webhooks</h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            Outbound HTTP callbacks triggered when a governance decision matches your configured conditions.
            Payloads are signed with HMAC-SHA256.
          </p>
        </div>
        {!showForm && (
          <Button size="sm" className="shrink-0 gap-1.5" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add webhook
          </Button>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {showForm && (
        <Card className="border-cyan-500/20 bg-cyan-500/[0.02]">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Webhook className="h-4 w-4 text-cyan-400" />
              New webhook
            </CardTitle>
            <CardDescription>
              The endpoint will receive a POST request with a JSON body and an{" "}
              <code className="text-xs">X-Torqa-Signature-256</code> header.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Production alerts" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Endpoint URL</Label>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://hooks.example.com/torqa" type="url" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Signing secret <span className="normal-case font-normal">(optional)</span>
              </Label>
              <Input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="whsec_…" type="password" className="max-w-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Trigger on</Label>
              <div className="flex flex-wrap gap-2">
                {TRIGGER_OPTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTrigger(t)}
                    className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                      triggerOn.includes(t)
                        ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400"
                        : "border-border/50 bg-muted/30 text-muted-foreground hover:border-border"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" disabled={saving} onClick={() => void handleCreate()}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save webhook"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setError(null); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border/40 bg-muted/10 px-6 py-10 text-center">
          <Webhook className="mx-auto mb-3 h-7 w-7 text-muted-foreground/40" />
          <p className="text-sm font-medium">No webhooks yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add a webhook to receive real-time governance decisions from Torqa.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/50">
          {items.map((row, i) => (
            <div
              key={row.id}
              className={`flex flex-wrap items-center justify-between gap-3 bg-card px-5 py-4 ${
                i !== items.length - 1 ? "border-b border-border/40" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{row.name}</p>
                <p className="truncate text-xs text-muted-foreground">{row.url}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {row.trigger_on.map((t) => (
                    <Badge key={t} className="border-border/50 bg-muted/30 text-muted-foreground text-[10px] px-1.5 py-0">
                      {t}
                    </Badge>
                  ))}
                  {row.secret && (
                    <Badge className="border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-[10px] px-1.5 py-0">
                      signed
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void toggleEnabled(row.id, !row.enabled)}
                  disabled={saving}
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                    row.enabled
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                      : "border-border/50 bg-muted/30 text-muted-foreground hover:border-border"
                  }`}
                >
                  {row.enabled ? "enabled" : "disabled"}
                </button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => void deleteWebhook(row.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
