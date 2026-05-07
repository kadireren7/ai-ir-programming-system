"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, X, XCircle, Puzzle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PanelState = "form" | "testing" | "tested_ok" | "tested_fail" | "saving" | "manage";

const ZONES = [
  { value: "eu1", label: "EU1 — Europe" },
  { value: "eu2", label: "EU2 — Europe 2" },
  { value: "us1", label: "US1 — United States" },
  { value: "us2", label: "US2 — United States 2" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  existingMask?: string;
  existingZone?: string;
  onDisconnect?: () => Promise<void>;
  onSaved: () => void;
};

export function MakeConnectPanel({ open, onClose, existingMask, existingZone, onDisconnect, onSaved }: Props) {
  const isManage = Boolean(existingMask);
  const [mode, setMode] = useState<PanelState>(isManage ? "manage" : "form");
  const [apiKey, setApiKey] = useState("");
  const [zone, setZone] = useState(existingZone ?? "eu1");
  const [teamId, setTeamId] = useState("");
  const [name, setName] = useState("Make");
  const [testError, setTestError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  if (!open) return null;

  const reset = () => {
    setMode(isManage ? "manage" : "form");
    setApiKey("");
    setTestError(null);
    setSaveError(null);
  };

  const handleTest = async () => {
    setMode("testing");
    setTestError(null);
    try {
      const res = await fetch("/api/integrations/make/test", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, zone }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (j.ok) {
        setMode("tested_ok");
      } else {
        setTestError(j.error ?? "Connection failed");
        setMode("tested_fail");
      }
    } catch {
      setTestError("Network error");
      setMode("tested_fail");
    }
  };

  const handleSave = async () => {
    setMode("saving");
    setSaveError(null);
    try {
      const res = await fetch("/api/integrations/make/connect", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, zone, teamId: teamId.trim() || undefined, name }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) {
        setSaveError(j.error ?? "Failed to save");
        setMode("tested_ok");
        return;
      }
      onSaved();
      onClose();
    } catch {
      setSaveError("Network error");
      setMode("tested_ok");
    }
  };

  const handleDisconnect = async () => {
    if (!onDisconnect) return;
    setDisconnecting(true);
    try { await onDisconnect(); } finally { setDisconnecting(false); }
    onClose();
  };

  const canTest = apiKey.length > 8;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border/60 bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
              <Puzzle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Make</p>
              <p className="text-xs text-muted-foreground">
                {mode === "manage" ? "Manage connection" : "Connect your account"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {mode === "manage" ? (
            <>
              <div className="rounded-lg border border-border/50 bg-muted/20 px-4 py-3 space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Zone</p>
                  <p className="mt-0.5 text-sm">{existingZone ?? "eu1"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">API Token</p>
                  <p className="mt-0.5 text-sm font-mono tracking-widest text-muted-foreground">{existingMask}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={() => { setMode("form"); setApiKey(""); }}>
                Reconnect with new credentials
              </Button>
              {onDisconnect && (
                <Button
                  variant="ghost" size="sm"
                  className="w-full text-destructive hover:text-destructive"
                  disabled={disconnecting}
                  onClick={() => void handleDisconnect()}
                >
                  {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Disconnect"}
                </Button>
              )}
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Connection name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Production Make" disabled={mode === "testing" || mode === "saving"} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Region / Zone</Label>
                <p className="text-xs text-muted-foreground">Match the zone in your Make URL (e.g. eu1.make.com).</p>
                <select
                  value={zone}
                  onChange={(e) => { setZone(e.target.value); if (mode !== "form") setMode("form"); }}
                  disabled={mode === "testing" || mode === "saving"}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {ZONES.map((z) => (
                    <option key={z.value} value={z.value}>{z.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">API Token</Label>
                <p className="text-xs text-muted-foreground">Make → Profile → API → Generate token.</p>
                <Input
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); if (mode !== "form") setMode("form"); }}
                  placeholder="Paste your Make API token"
                  type="password"
                  autoComplete="off"
                  disabled={mode === "testing" || mode === "saving"}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Team ID (optional)</Label>
                <p className="text-xs text-muted-foreground">Found in your Make team URL. Leave blank for personal account.</p>
                <Input
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  placeholder="e.g. 123456"
                  disabled={mode === "testing" || mode === "saving"}
                />
              </div>

              {mode === "tested_ok" && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Connection verified
                </div>
              )}
              {mode === "tested_fail" && testError && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  <XCircle className="h-4 w-4 shrink-0" />
                  {testError}
                </div>
              )}
              {saveError && <p className="text-sm text-destructive">{saveError}</p>}

              <div className="flex gap-2">
                {mode !== "tested_ok" ? (
                  <Button size="sm" variant="outline" disabled={!canTest || mode === "testing"} onClick={() => void handleTest()} className="gap-1.5">
                    {mode === "testing" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Test connection
                  </Button>
                ) : (
                  <Button size="sm" disabled={mode === ("saving" as PanelState)} onClick={() => void handleSave()} className="gap-1.5">
                    {(mode as PanelState) === "saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Save connection
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => { reset(); onClose(); }}>Cancel</Button>
              </div>
              {mode === "tested_ok" && (
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => void handleTest()}>Re-test</Button>
              )}
            </>
          )}
        </div>

        <div className="border-t border-border/40 px-6 py-3">
          <a href="https://www.make.com/en/api-documentation" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground">
            Make API docs ↗
          </a>
        </div>
      </div>
    </>
  );
}
