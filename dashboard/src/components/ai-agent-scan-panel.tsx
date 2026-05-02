"use client";

import { useRef, useState } from "react";
import { Bot, Loader2, Upload, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ScanApiSuccess } from "@/lib/scan-engine";

type Props = {
  open: boolean;
  onClose: () => void;
};

type ScanResult = ScanApiSuccess & { ok?: boolean };

export function AiAgentScanPanel({ open, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<unknown | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        setFileContent(parsed);
      } catch {
        setError("Invalid JSON file — upload a valid agent definition JSON.");
        setFileContent(null);
      }
    };
    reader.readAsText(file);
  };

  const handleScan = async () => {
    if (!fileContent) return;
    setScanning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "ai-agent", content: fileContent }),
      });
      const j = (await res.json()) as ScanResult;
      if (!res.ok) {
        setError((j as { error?: string }).error ?? "Scan failed");
        return;
      }
      setResult(j);
    } catch {
      setError("Network error — could not reach scan API");
    } finally {
      setScanning(false);
    }
  };

  const decisionColor =
    result?.status === "PASS"
      ? "text-emerald-400"
      : result?.status === "FAIL"
      ? "text-red-400"
      : "text-yellow-400";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border/60 bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15">
              <Bot className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">AI Agent Scan</p>
              <p className="text-xs text-muted-foreground">Upload agent definition JSON</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-6 py-5">
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Agent Definition File (JSON)
            </Label>
            <p className="text-xs text-muted-foreground">
              Expected fields: <code className="text-cyan-400">name</code>,{" "}
              <code className="text-cyan-400">model</code>,{" "}
              <code className="text-cyan-400">system_prompt</code>,{" "}
              <code className="text-cyan-400">tools</code>,{" "}
              <code className="text-cyan-400">permissions</code>
            </p>
            <div
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/60 py-8 transition hover:border-violet-500/40 hover:bg-violet-500/[0.02]"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {fileName ?? "Click to upload or drag & drop"}
              </p>
              {fileName && (
                <p className="text-xs text-violet-400">{fileName} loaded</p>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFile} />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {result && (
            <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-medium">Scan complete</span>
                </div>
                <span className={`text-sm font-semibold ${decisionColor}`}>{result.status}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-border/40 bg-card p-2">
                  <p className="text-lg font-bold">{result.riskScore}</p>
                  <p className="text-[10px] text-muted-foreground">Trust Score</p>
                </div>
                <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-2">
                  <p className="text-lg font-bold text-red-400">{result.totals?.high ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">High</p>
                </div>
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-2">
                  <p className="text-lg font-bold text-yellow-400">{result.totals?.review ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">Review</p>
                </div>
              </div>
              {result.findings && result.findings.length > 0 && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {result.findings.slice(0, 8).map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className={`mt-0.5 shrink-0 font-medium ${
                        f.severity === "critical" || f.severity === "high" ? "text-red-400" :
                        f.severity === "review" ? "text-yellow-400" : "text-muted-foreground"
                      }`}>{f.severity.toUpperCase()}</span>
                      <span className="text-muted-foreground">{f.explanation}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border/40 px-6 py-4">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            type="button"
            size="sm"
            disabled={!fileContent || scanning}
            onClick={() => void handleScan()}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {scanning ? (
              <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Scanning…</>
            ) : (
              "Run Governance Scan"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
