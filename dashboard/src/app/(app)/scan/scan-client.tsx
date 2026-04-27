"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  Code2,
  FileJson2,
  Loader2,
  Play,
  Radar,
  ShieldAlert,
} from "lucide-react";
import { ScanReportView } from "@/components/scan-report-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { ScanApiSuccess, ScanSource } from "@/lib/scan-engine";
import { isScanApiSuccess } from "@/lib/scan-api-guards";
import { appendLocalScanNotifications } from "@/lib/notifications-local";
import { extractWorkflowName } from "@/lib/workflow-json";
import { localWorkflowGet } from "@/lib/workflow-templates-local";
import { hasPublicSupabaseUrl } from "@/lib/env";

const DOCS_TREE_URL = "https://github.com/kadireren7/Torqa/tree/main/docs";
const GITHUB_REPO_URL = "https://github.com/kadireren7/Torqa";

const hasSupabase = hasPublicSupabaseUrl();

function SummarySkeleton() {
  return (
    <div className="grid animate-pulse gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true" aria-label="Scanning">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-border/60 bg-muted/40 p-5 shadow-inner">
          <div className="mb-3 h-3 w-20 rounded bg-muted-foreground/20" />
          <div className="mb-2 h-8 w-28 rounded bg-muted-foreground/15" />
          <div className="h-2 w-full rounded bg-muted-foreground/10" />
        </div>
      ))}
    </div>
  );
}

async function persistScanToHistory(
  source: ScanSource,
  content: object,
  result: ScanApiSuccess
): Promise<{ ok: boolean; skipped?: boolean }> {
  if (!hasSupabase) {
    return { ok: true, skipped: true };
  }
  const workflowName = extractWorkflowName(content);
  try {
    const res = await fetch("/api/scans", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, result, workflowName }),
    });
    if (res.status === 401 || res.status === 503) return { ok: true, skipped: true };
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

export function ScanPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [jsonText, setJsonText] = useState("");
  const [source, setSource] = useState<ScanSource>("n8n");
  const [error, setError] = useState<string | null>(null);
  const [loadingSample, setLoadingSample] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanApiSuccess | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [policySelect, setPolicySelect] = useState("none");
  const [policyTemplates, setPolicyTemplates] = useState<{ slug: string; name: string }[]>([]);
  const [workspacePolicies, setWorkspacePolicies] = useState<{ id: string; name: string }[]>([]);

  const libraryId = searchParams.get("library")?.trim() ?? "";

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const tplRes = await fetch("/api/policy-templates");
        if (cancelled || !tplRes.ok) return;
        const j = (await tplRes.json()) as { templates?: { slug?: string; name?: string }[] };
        const list = Array.isArray(j.templates)
          ? j.templates
              .filter((t) => typeof t.slug === "string" && typeof t.name === "string")
              .map((t) => ({ slug: t.slug as string, name: t.name as string }))
          : [];
        setPolicyTemplates(list);
      } catch {
        /* ignore */
      }
      if (!hasSupabase || cancelled) return;
      try {
        const polRes = await fetch("/api/workspace-policies", { credentials: "include" });
        if (cancelled || !polRes.ok) return;
        const j = (await polRes.json()) as { policies?: { id?: string; name?: string }[] };
        const plist = Array.isArray(j.policies)
          ? j.policies
              .filter((p) => typeof p.id === "string" && typeof p.name === "string")
              .map((p) => ({ id: p.id as string, name: p.name as string }))
          : [];
        setWorkspacePolicies(plist);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!libraryId) return;
    let cancelled = false;
    void (async () => {
      let content: Record<string, unknown> | null = null;
      let src: ScanSource = "n8n";
      if (hasSupabase) {
        try {
          const res = await fetch(`/api/workflow-templates/${encodeURIComponent(libraryId)}`, {
            credentials: "include",
          });
          if (res.ok) {
            const d = (await res.json()) as {
              content?: unknown;
              source?: string;
            };
            if (d.content && typeof d.content === "object" && !Array.isArray(d.content)) {
              content = d.content as Record<string, unknown>;
              if (d.source === "n8n" || d.source === "generic") src = d.source;
            }
          }
        } catch {
          /* try local */
        }
      }
      if (!content) {
        const row = localWorkflowGet(libraryId);
        if (row) {
          content = row.content;
          src = row.source;
        }
      }
      if (cancelled) return;
      if (content) {
        setJsonText(JSON.stringify(content, null, 2));
        setSource(src);
        setError(null);
        setResult(null);
        setSaveNotice(null);
      } else {
        setError("Could not load that workflow from your library.");
      }
      router.replace("/scan", { scroll: false });
    })();
    return () => {
      cancelled = true;
    };
  }, [libraryId, router]);

  const runScan = useCallback(async () => {
    setError(null);
    setResult(null);
    setSaveNotice(null);
    const trimmed = jsonText.trim();
    if (!trimmed) {
      setError("Paste JSON or upload a file first.");
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      setError("Invalid JSON — fix syntax and try again.");
      return;
    }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      setError("Root JSON value must be an object (e.g. a workflow export), not an array or primitive.");
      return;
    }
    const contentObj = parsed as object;
    setIsScanning(true);
    try {
      const scanBody: Record<string, unknown> = { source, content: parsed };
      if (policySelect.startsWith("template:")) {
        scanBody.policyTemplateSlug = policySelect.slice("template:".length);
      } else if (policySelect.startsWith("workspace:")) {
        scanBody.workspacePolicyId = policySelect.slice("workspace:".length);
      }
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scanBody),
      });
      let data: unknown;
      try {
        data = await res.json();
      } catch {
        setError("Invalid response from server.");
        return;
      }
      if (!res.ok) {
        const msg =
          data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string"
            ? (data as { error: string }).error
            : `Scan failed (${res.status}).`;
        setError(msg);
        return;
      }
      if (!isScanApiSuccess(data)) {
        setError("Unexpected response shape from server.");
        return;
      }
      setResult(data);
      if (!hasSupabase) {
        appendLocalScanNotifications(data, source);
      }
      const persisted = await persistScanToHistory(source, contentObj, data);
      if (persisted.ok && !persisted.skipped) {
        setSaveNotice("Saved to your scan history.");
      }
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setIsScanning(false);
    }
  }, [jsonText, source, policySelect]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    setSaveNotice(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setJsonText(text);
    };
    reader.onerror = () => setError("Could not read the file.");
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  };

  const loadSample = async (name: "minimal_n8n" | "customer_support_n8n") => {
    setLoadingSample(name);
    setError(null);
    setResult(null);
    setSaveNotice(null);
    setSource("n8n");
    try {
      const res = await fetch(`/scan-samples/${name}.json`);
      if (!res.ok) throw new Error("fetch failed");
      const text = await res.text();
      setJsonText(text);
    } catch {
      setError("Could not load sample JSON.");
    } finally {
      setLoadingSample(null);
    }
  };

  const busy = isScanning || loadingSample !== null;

  return (
    <div className="space-y-10 pb-8 sm:space-y-12 sm:pb-12">
      <div className="space-y-3 border-b border-border/60 pb-8 sm:pb-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Workflow</p>
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Scan
            </h1>
            <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
              Upload or paste workflow JSON and run a deterministic scan via{" "}
              <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">POST /api/scan</code>
              . Results are saved to your account when Supabase is configured. For full Torqa validation, use the CLI.
            </p>
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <Link href="/workflow-library" className="font-medium text-primary hover:underline">
                Workflow library →
              </Link>
              <Link href="/scan/history" className="font-medium text-primary hover:underline">
                Scan history →
              </Link>
              <Link href="/policies" className="font-medium text-primary hover:underline">
                Policies →
              </Link>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-border/80 bg-muted/30 px-3 py-2 text-xs text-muted-foreground sm:max-w-[240px] sm:flex-col sm:items-stretch sm:text-left">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <Radar className="h-3.5 w-3.5 shrink-0 text-primary" />
              Server-side
            </span>
            <span className="leading-snug">
              Powered by server-side scan engine — JSON analyzed on the host. Sign in to persist reports.
            </span>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden border-border/80 shadow-md ring-1 ring-black/5 dark:ring-white/10">
        <CardHeader className="space-y-1 border-b border-border/60 bg-muted/20 px-5 py-5 sm:px-6 sm:py-6">
          <CardTitle className="text-lg font-semibold sm:text-xl">Input</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            JSON file, paste area, and source hint for heuristics.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-5 py-6 sm:space-y-8 sm:px-6 sm:py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="scan-file" className="text-sm font-medium">
                JSON file
              </Label>
              <input
                id="scan-file"
                type="file"
                accept="application/json,.json"
                onChange={onFile}
                disabled={busy}
                className="block w-full max-w-md cursor-pointer text-sm file:mr-3 file:rounded-lg file:border file:border-border file:bg-background file:px-3 file:py-2 file:text-xs file:font-semibold file:text-foreground hover:file:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 w-full justify-center sm:w-auto"
                disabled={busy}
                onClick={() => loadSample("minimal_n8n")}
              >
                {loadingSample === "minimal_n8n" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileJson2 className="mr-2 h-4 w-4" />
                )}
                Minimal n8n
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 w-full justify-center sm:w-auto"
                disabled={busy}
                onClick={() => loadSample("customer_support_n8n")}
              >
                {loadingSample === "customer_support_n8n" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShieldAlert className="mr-2 h-4 w-4" />
                )}
                Risky support example
              </Button>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="scan-source" className="text-sm font-medium">
                Source
              </Label>
              <select
                id="scan-source"
                value={source}
                disabled={busy}
                onChange={(e) => setSource(e.target.value as ScanSource)}
                className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="n8n">n8n workflow export</option>
                <option value="generic">Generic JSON</option>
              </select>
            </div>
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="scan-policy" className="text-sm font-medium">
                Policy (optional)
              </Label>
              <select
                id="scan-policy"
                value={policySelect}
                disabled={busy}
                onChange={(e) => setPolicySelect(e.target.value)}
                className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="none">None — engine scan only</option>
                {policyTemplates.length > 0 ? (
                  <optgroup label="Built-in templates">
                    {policyTemplates.map((t) => (
                      <option key={t.slug} value={`template:${t.slug}`}>
                        {t.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {workspacePolicies.length > 0 ? (
                  <optgroup label="Workspace policies">
                    {workspacePolicies.map((p) => (
                      <option key={p.id} value={`workspace:${p.id}`}>
                        {p.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
              <p className="text-xs leading-relaxed text-muted-foreground">
                When set, the API attaches a governance verdict (PASS / WARN / FAIL) without changing the underlying
                scan.{" "}
                <Link href="/policies" className="font-medium text-primary hover:underline">
                  Manage policies
                </Link>
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scan-json" className="text-sm font-medium">
              Paste JSON
            </Label>
            <textarea
              id="scan-json"
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              disabled={busy}
              placeholder='{ "name": "…", "nodes": [ … ] }'
              spellCheck={false}
              rows={12}
              className="min-h-[200px] w-full resize-y rounded-lg border border-input bg-background/50 px-3 py-3 font-mono text-[13px] leading-relaxed text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[240px] sm:text-sm"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-destructive/35 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              size="lg"
              onClick={() => void runScan()}
              disabled={busy}
              className="h-11 w-full gap-2 font-semibold sm:w-auto sm:min-w-[160px]"
            >
              {isScanning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Scanning…
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run scan
                </>
              )}
            </Button>
            {isScanning && (
              <p className="text-center text-xs text-muted-foreground sm:text-left">Calling server scan…</p>
            )}
          </div>
        </CardContent>
      </Card>

      {(isScanning || result) && (
        <section className="space-y-6 sm:space-y-8" aria-live="polite">
          {isScanning && (
            <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/10 via-background to-background px-4 py-3 sm:px-5 sm:py-4">
              <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
                <p className="text-center text-sm font-medium text-foreground">Analyzing workflow JSON on the server…</p>
              </div>
            </div>
          )}

          {isScanning && <SummarySkeleton />}

          {result && !isScanning && <ScanReportView result={result} notice={saveNotice} />}
        </section>
      )}

      <footer className="mt-4 border-t border-border/70 pt-8 sm:mt-6 sm:pt-10">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-center text-xs text-muted-foreground sm:text-left">
            Torqa dashboard · server-side scan (preview engine)
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium">
            <Link
              href={DOCS_TREE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <BookOpen className="h-4 w-4" aria-hidden />
              Docs
            </Link>
            <Link
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <Code2 className="h-4 w-4" aria-hidden />
              GitHub
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
