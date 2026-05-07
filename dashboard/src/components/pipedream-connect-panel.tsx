"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, X, XCircle, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PanelState = "form" | "testing" | "tested_ok" | "tested_fail" | "saving" | "manage";

type Props = {
  open: boolean;
  onClose: () => void;
  existingMask?: string;
  onDisconnect?: () => Promise<void>;
  onSaved: () => void;
};

export function PipedreamConnectPanel({ open, onClose, existingMask, onDisconnect, onSaved }: Props) {
  const isManage = Boolean(existingMask);
  const [mode, setMode] = useState<PanelState>(isManage ? "manage" : "form");
  const [apiKey, setApiKey] = useState("");
  const [name, setName] = useState("Pipedream");
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
      const res = await fetch("/api/integrations/pipedream/test", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
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
      const res = await fetch("/api/integrations/pipedream/connect", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, name }),
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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400">
              <Plug className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Pipedream</p>
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
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">API Key</p>
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
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My Pipedream" disabled={mode === "testing" || mode === "saving"} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">API Key</Label>
                <p className="text-xs text-muted-foreground">Pipedream → Settings → API Keys → Create key.</p>
                <Input
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); if (mode !== "form") setMode("form"); }}
                  placeholder="Paste your Pipedream API key"
                  type="password"
                  autoComplete="off"
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
          <a href="https://pipedream.com/docs/api/" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground">
            Pipedream API docs ↗
          </a>
        </div>
      </div>
    </>
  );
}
