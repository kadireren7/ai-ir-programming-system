"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  FileJson2,
  Loader2,
  Pencil,
  Play,
  Search,
  Trash2,
  Upload,
  Library,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ScanSource } from "@/lib/scan-engine";
import type { WorkflowTemplateListItem } from "@/lib/workflow-template-types";
import { extractWorkflowName } from "@/lib/workflow-json";
import {
  localWorkflowCreate,
  localWorkflowDelete,
  localWorkflowListItems,
  localWorkflowRename,
} from "@/lib/workflow-templates-local";
import { hasPublicSupabaseUrl } from "@/lib/env";

const useCloudLibrary = hasPublicSupabaseUrl();

export default function WorkflowLibraryPage() {
  const router = useRouter();
  const [items, setItems] = useState<WorkflowTemplateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [pendingSave, setPendingSave] = useState<{
    content: Record<string, unknown>;
    defaultName: string;
    source: ScanSource;
  } | null>(null);
  const [saveName, setSaveName] = useState("");
  const [saveSource, setSaveSource] = useState<ScanSource>("n8n");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoadError(null);
    if (useCloudLibrary) {
      try {
        const res = await fetch("/api/workflow-templates", { credentials: "include" });
        if (res.status === 503) {
          setItems([]);
          setLoadError("Supabase is not configured on the server.");
          return;
        }
        if (res.status === 401) {
          setItems([]);
          setLoadError("Sign in to use the cloud workflow library.");
          return;
        }
        const data = (await res.json()) as { items?: WorkflowTemplateListItem[]; error?: string };
        if (!res.ok) {
          setItems([]);
          setLoadError(data.error ?? `Could not load (${res.status}).`);
          return;
        }
        setItems(data.items ?? []);
      } catch {
        setItems([]);
        setLoadError("Network error while loading templates.");
      }
    } else {
      setItems(localWorkflowListItems());
    }
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, search]);

  const recentUploads = useMemo(() => [...items].slice(0, 5), [items]);

  const onUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoadError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        setLoadError("Invalid JSON in file.");
        e.target.value = "";
        return;
      }
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        setLoadError("Root JSON must be an object.");
        e.target.value = "";
        return;
      }
      const content = parsed as Record<string, unknown>;
      const suggested = extractWorkflowName(content) ?? file.name.replace(/\.json$/i, "") ?? "Workflow";
      setPendingSave({ content, defaultName: suggested, source: "n8n" });
      setSaveName(suggested);
      setSaveSource("n8n");
      e.target.value = "";
    };
    reader.onerror = () => setLoadError("Could not read the file.");
    reader.readAsText(file, "utf-8");
  };

  const closeSavePanel = () => {
    setPendingSave(null);
    setSaveName("");
    setSaving(false);
  };

  const submitSaveTemplate = async () => {
    if (!pendingSave) return;
    const name = saveName.trim() || pendingSave.defaultName;
    setSaving(true);
    setLoadError(null);
    try {
      if (useCloudLibrary) {
        const res = await fetch("/api/workflow-templates", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            source: saveSource,
            content: pendingSave.content,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setLoadError(data.error ?? "Save failed.");
          setSaving(false);
          return;
        }
      } else {
        localWorkflowCreate({
          name,
          source: saveSource,
          content: pendingSave.content,
        });
      }
      closeSavePanel();
      await refresh();
    } catch {
      setLoadError("Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const startRename = (row: WorkflowTemplateListItem) => {
    setRenameId(row.id);
    setRenameValue(row.name);
  };

  const commitRename = async (id: string) => {
    const name = renameValue.trim();
    if (!name) return;
    setBusyId(id);
    setLoadError(null);
    try {
      if (useCloudLibrary) {
        const res = await fetch(`/api/workflow-templates/${id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setLoadError(data.error ?? "Rename failed.");
          setBusyId(null);
          return;
        }
      } else {
        localWorkflowRename(id, name);
      }
      setRenameId(null);
      await refresh();
    } catch {
      setLoadError("Rename failed.");
    } finally {
      setBusyId(null);
    }
  };

  const removeRow = async (id: string) => {
    if (!window.confirm("Delete this workflow template?")) return;
    setBusyId(id);
    setLoadError(null);
    try {
      if (useCloudLibrary) {
        const res = await fetch(`/api/workflow-templates/${id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setLoadError(data.error ?? "Delete failed.");
          setBusyId(null);
          return;
        }
      } else {
        localWorkflowDelete(id);
      }
      await refresh();
    } catch {
      setLoadError("Delete failed.");
    } finally {
      setBusyId(null);
    }
  };

  const runScan = (id: string) => {
    router.push(`/scan?library=${encodeURIComponent(id)}`);
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card to-primary/[0.06] p-6 shadow-lg ring-1 ring-white/[0.05] sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Library</p>
            <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
                <Library className="h-5 w-5" aria-hidden />
              </span>
              Workflow library
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Upload JSON, save templates, and jump to{" "}
              <Link href="/scan" className="font-medium text-primary underline-offset-4 hover:underline">
                Scan
              </Link>{" "}
              with one click.{" "}
              {useCloudLibrary
                ? "Templates sync to your Supabase account."
                : "Templates stay in this browser (localStorage) until you connect Supabase."}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline" className="border-border/80 bg-background/60 backdrop-blur">
              <Link href="/scan">Open scan</Link>
            </Button>
          </div>
        </div>
      </div>

      {loadError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-destructive/35 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/80 shadow-md ring-1 ring-black/5 dark:ring-white/10 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Upload JSON</CardTitle>
            <CardDescription>Parse a file, then name and save it as a template.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wf-upload" className="text-sm font-medium">
                JSON file
              </Label>
              <div className="flex items-center gap-2">
                <input
                  id="wf-upload"
                  type="file"
                  accept="application/json,.json"
                  onChange={onUploadFile}
                  className="block w-full max-w-md cursor-pointer text-sm file:mr-3 file:rounded-lg file:border file:border-border file:bg-background file:px-3 file:py-2 file:text-xs file:font-semibold file:text-foreground hover:file:bg-muted/80"
                />
                <Upload className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-md ring-1 ring-black/5 dark:ring-white/10 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Recent uploads</CardTitle>
            <CardDescription>Newest templates first — quick access to what you added last.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : recentUploads.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No templates yet. Upload a JSON file to create one.
              </p>
            ) : (
              <ul className="divide-y divide-border/60 rounded-xl border border-border/60">
                {recentUploads.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm first:rounded-t-xl last:rounded-b-xl hover:bg-muted/30"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.updatedAt).toLocaleString()} ·{" "}
                        <Badge variant="secondary" className="align-middle capitalize">
                          {r.source}
                        </Badge>
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="gap-1"
                        onClick={() => runScan(r.id)}
                      >
                        <Play className="h-3.5 w-3.5" />
                        Scan
                      </Button>
                      {useCloudLibrary ? (
                        <Button type="button" size="sm" variant="outline" className="gap-1" asChild>
                          <Link href={`/schedules?template=${encodeURIComponent(r.id)}`}>
                            <CalendarClock className="h-3.5 w-3.5" />
                            Schedule
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {pendingSave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md border-border/80 shadow-2xl ring-1 ring-primary/15">
            <CardHeader>
              <CardTitle className="text-lg">Save workflow template</CardTitle>
              <CardDescription>Stored {useCloudLibrary ? "in your workspace" : "in this browser only"}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="save-name">Name</Label>
                <Input
                  id="save-name"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="My workflow"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="save-source">Source</Label>
                <select
                  id="save-source"
                  value={saveSource}
                  onChange={(e) => setSaveSource(e.target.value as ScanSource)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="n8n">n8n workflow export</option>
                  <option value="generic">Generic JSON</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeSavePanel} disabled={saving}>
                  Cancel
                </Button>
                <Button type="button" onClick={() => void submitSaveTemplate()} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save template"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-border/80 shadow-md ring-1 ring-black/5 dark:ring-white/10">
        <CardHeader className="flex flex-col gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <CardTitle className="text-lg font-semibold">All templates</CardTitle>
            <CardDescription>Search, rename, delete, or run a scan.</CardDescription>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name…"
              className="pl-9"
              aria-label="Search workflows"
            />
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-2 pt-0">
          {loading ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead className="pl-6">Name</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="pr-6 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="px-6 py-12 text-center text-sm text-muted-foreground">
                        {items.length === 0
                          ? "No templates saved yet."
                          : "No templates match your search."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((row) => (
                      <TableRow key={row.id} className="border-border/60">
                        <TableCell className="pl-6">
                          {renameId === row.id ? (
                            <div className="flex max-w-md items-center gap-2">
                              <Input
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                className="h-9"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") void commitRename(row.id);
                                  if (e.key === "Escape") setRenameId(null);
                                }}
                                autoFocus
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                disabled={busyId === row.id}
                                onClick={() => void commitRename(row.id)}
                              >
                                Save
                              </Button>
                            </div>
                          ) : (
                            <span className="font-medium text-foreground">{row.name}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {row.source}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(row.updatedAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="Rename"
                              disabled={busyId === row.id}
                              onClick={() => startRename(row)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              title="Delete"
                              disabled={busyId === row.id}
                              onClick={() => void removeRow(row.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="default"
                              className="ml-1 gap-1"
                              onClick={() => runScan(row.id)}
                            >
                              <Play className="h-3.5 w-3.5" />
                              Scan
                            </Button>
                            {useCloudLibrary ? (
                              <Button type="button" size="sm" variant="outline" className="gap-1" asChild>
                                <Link href={`/schedules?template=${encodeURIComponent(row.id)}`}>
                                  <CalendarClock className="h-3.5 w-3.5" />
                                  Schedule
                                </Link>
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <FileJson2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          JSON is stored as data only. Scans still run through{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">POST /api/scan</code> when you choose
          Scan.
          {!useCloudLibrary ? (
            <>
              {" "}
              <Link href="/schedules" className="font-medium text-primary underline-offset-4 hover:underline">
                Scheduled scans
              </Link>{" "}
              require cloud Supabase.
            </>
          ) : null}
        </span>
      </p>
    </div>
  );
}
