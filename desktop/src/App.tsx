import CodeMirror from "@uiw/react-codemirror";
import { vscodeDark, vscodeLight } from "@uiw/codemirror-theme-vscode";
import { EditorView } from "@codemirror/view";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TorqaRequest } from "./torqaApi";
import { tryParseTorqaJson } from "./parseTorqaJson";

type ThemeMode = "dark" | "light";

type BenchMetrics = Record<string, number | boolean | null | undefined>;

function getShell(): NonNullable<typeof window.torqaShell> {
  const s = window.torqaShell;
  if (!s) {
    throw new Error("TORQA shell yok — uygulama Electron içinde çalıştırılmalı (torqa-desktop veya cd desktop && npm run start).");
  }
  return s;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Readable diagnostics for the Diagnostics tab (core JSON shape). */
function formatDiagnosticsHuman(d: Record<string, unknown>): string {
  const lines: string[] = [];
  if (typeof d.ok === "boolean") lines.push(`ok: ${d.ok}`);
  const issues = d.issues;
  if (Array.isArray(issues) && issues.length) {
    lines.push("", "Issues:");
    for (const it of issues.slice(0, 48)) {
      if (it && typeof it === "object") {
        const o = it as Record<string, unknown>;
        const msg = o.message != null ? String(o.message) : JSON.stringify(o);
        lines.push(`  • ${msg}`);
        if (o.code != null) lines.push(`    code: ${String(o.code)}`);
      } else lines.push(`  • ${String(it)}`);
    }
    if (issues.length > 48) lines.push(`  … ${issues.length - 48} more`);
  }
  const warnings = d.warnings;
  if (Array.isArray(warnings) && warnings.length) {
    lines.push("", "Warnings:");
    for (const w of warnings.slice(0, 24)) {
      lines.push(`  • ${typeof w === "object" && w !== null ? JSON.stringify(w) : String(w)}`);
    }
  }
  const sem = d.semantic_report;
  if (isRecord(sem)) {
    const errs = sem.errors;
    const warns = sem.warnings;
    if (Array.isArray(errs) && errs.length) {
      lines.push("", "Semantic errors:");
      for (const e of errs.slice(0, 16)) lines.push(`  • ${JSON.stringify(e)}`);
    }
    if (Array.isArray(warns) && warns.length) {
      lines.push("", "Semantic warnings:");
      for (const w of warns.slice(0, 16)) lines.push(`  • ${JSON.stringify(w)}`);
    }
  }
  if (lines.length <= 1 && Object.keys(d).length) return JSON.stringify(d, null, 2);
  return lines.join("\n");
}

function summarizeBuildPayload(json: Record<string, unknown>): string {
  const parts: string[] = [];
  parts.push(`ok: ${Boolean(json.ok)}`);
  if (json.written_under != null) parts.push(`written_under: ${String(json.written_under)}`);
  if (json.local_webapp != null) parts.push(`local_webapp: ${String(json.local_webapp)}`);
  const w = json.written;
  if (Array.isArray(w)) parts.push(`files written: ${w.length}`);
  const err = json.errors;
  if (Array.isArray(err) && err.length) parts.push(`errors: ${err.map(String).join("; ")}`);
  return parts.join("\n");
}

function DesktopApp() {
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [workspace, setWorkspace] = useState<string | null>(null);
  const [paths, setPaths] = useState<{ repoRoot: string; pythonExe: string } | null>(null);
  const [tqFiles, setTqFiles] = useState<string[]>([]);
  const [activeRel, setActiveRel] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [bottomTab, setBottomTab] = useState<"output" | "diagnostics">("output");
  const [bottomOpen, setBottomOpen] = useState(true);
  const [rightTab, setRightTab] = useState<"ir" | "bench">("ir");
  const [rightOpen, setRightOpen] = useState(true);
  const [busy, setBusy] = useState<"idle" | "surface" | "build" | "bench">("idle");
  const [gate, setGate] = useState<"idle" | "ok" | "fail">("idle");
  const [outputText, setOutputText] = useState("");
  const [diagText, setDiagText] = useState("");
  const [irPreview, setIrPreview] = useState("");
  const [benchMetrics, setBenchMetrics] = useState<BenchMetrics | null>(null);
  const [pipelineStages, setPipelineStages] = useState<unknown[]>([]);
  const [pipelineSummary, setPipelineSummary] = useState<Record<string, unknown> | null>(null);
  const [written, setWritten] = useState<string[]>([]);
  const [lastTorqaCommand, setLastTorqaCommand] = useState("");
  const [buildSummaryLine, setBuildSummaryLine] = useState("");
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    void (async () => {
      try {
        const p = await getShell().getPaths();
        setPaths(p);
        const ws = await getShell().getWorkspace();
        setWorkspace(ws);
      } catch {
        setPaths(null);
      }
    })();
  }, []);

  const clearPanels = useCallback(() => {
    setGate("idle");
    setOutputText("");
    setDiagText("");
    setIrPreview("");
    setBenchMetrics(null);
    setPipelineStages([]);
    setPipelineSummary(null);
    setWritten([]);
    setLastTorqaCommand("");
    setBuildSummaryLine("");
  }, []);

  const refreshTree = useCallback(async (root: string) => {
    const list = await getShell().listTqFiles(root);
    setTqFiles(list);
  }, []);

  useEffect(() => {
    if (workspace) void refreshTree(workspace);
    else {
      setTqFiles([]);
      setActiveRel(null);
      setContent("");
    }
  }, [workspace, refreshTree]);

  useEffect(() => {
    const shell = window.torqaShell;
    if (!shell?.subscribeShellEvents) return undefined;
    return shell.subscribeShellEvents({
      onWorkspaceOpened: (dir) => {
        setWorkspace(dir);
        clearPanels();
      },
      onTqFileOpened: (r) => {
        void (async () => {
          if (dirtyRef.current && !confirm("Discard unsaved changes?")) return;
          setWorkspace(r.workspaceRoot);
          clearPanels();
          try {
            const list = await shell.listTqFiles(r.workspaceRoot);
            setTqFiles(list);
            const rd = await shell.readFile(r.workspaceRoot, r.relativePath);
            if (!rd.ok) {
              setBottomOpen(true);
              setBottomTab("output");
              setOutputText(`Read failed: ${rd.error}`);
              return;
            }
            setActiveRel(r.relativePath);
            setContent(rd.content);
            setDirty(false);
          } catch (e) {
            setBottomOpen(true);
            setBottomTab("output");
            setOutputText(String(e));
          }
        })();
      },
    });
  }, [clearPanels]);

  const openProject = async () => {
    try {
      const root = await getShell().openWorkspace();
      if (!root) return;
      setWorkspace(root);
      clearPanels();
    } catch (e) {
      setBottomOpen(true);
      setBottomTab("output");
      setOutputText(`Open folder failed: ${String(e)}`);
    }
  };

  const openTqFile = async () => {
    try {
      const r = await getShell().openTqFile();
      if (!r) return;
      if (dirty && !confirm("Discard unsaved changes?")) return;
      setWorkspace(r.workspaceRoot);
      clearPanels();
      const list = await getShell().listTqFiles(r.workspaceRoot);
      setTqFiles(list);
      const rd = await getShell().readFile(r.workspaceRoot, r.relativePath);
      if (!rd.ok) {
        setBottomOpen(true);
        setBottomTab("output");
        setOutputText(`Read failed: ${rd.error}`);
        return;
      }
      setActiveRel(r.relativePath);
      setContent(rd.content);
      setDirty(false);
    } catch (e) {
      setBottomOpen(true);
      setBottomTab("output");
      setOutputText(`Open .tq file failed: ${String(e)}`);
    }
  };

  const loadFile = async (rel: string, opts?: { skipDirtyCheck?: boolean; workspaceRoot?: string }) => {
    const ws = opts?.workspaceRoot ?? workspace;
    if (!ws) return;
    if (dirty && !opts?.skipDirtyCheck && !confirm("Discard unsaved changes?")) return;
    const r = await getShell().readFile(ws, rel);
    if (!r.ok) {
      setBottomOpen(true);
      setBottomTab("output");
      appendOutput(`Read file (${rel})`, { exitCode: 1, stdout: "", stderr: r.error });
      return;
    }
    setActiveRel(rel);
    setContent(r.content);
    setDirty(false);
  };

  const saveFile = async () => {
    if (!workspace || !activeRel) return;
    const r = await getShell().saveFile(workspace, activeRel, content);
    if (!r.ok) {
      setBottomOpen(true);
      setBottomTab("output");
      appendOutput(`Save (${activeRel})`, { exitCode: 1, stdout: "", stderr: r.error });
      return;
    }
    setDirty(false);
    setBottomOpen(true);
    setBottomTab("output");
    appendOutput(`Save (${activeRel})`, { exitCode: 0, stdout: "Saved to disk.", stderr: "" });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        void saveFile();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [workspace, activeRel, content, dirty]);

  const appendOutput = (
    label: string,
    res: { stdout: string; stderr: string; exitCode: number },
    cmd?: string,
  ) => {
    const block = [
      cmd ? `Command: ${cmd}` : "",
      `— ${label} — exit ${res.exitCode}`,
      res.stdout ? `stdout:\n${res.stdout}` : "",
      res.stderr ? `stderr:\n${res.stderr}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    setOutputText((prev) => (prev ? `${prev}\n\n${block}` : block));
  };

  const runValidateForRel = async (rel: string) => {
    if (!workspace) return;
    setBusy("surface");
    setGate("idle");
    setBottomOpen(true);
    setBottomTab("output");
    const cmd = `torqa --json surface "${workspace.replace(/\\/g, "/")}/${rel}"`;
    setLastTorqaCommand(cmd);
    const res = await getShell().torqaRun({
      kind: "surface",
      workspaceRoot: workspace,
      relativePath: rel,
    });
    appendOutput("Validate (surface → IR + diagnostics)", res, cmd);
    const json = tryParseTorqaJson(res.stdout, res.stderr) as Record<string, unknown> | null;
    if (json && isRecord(json.diagnostics as unknown)) {
      setDiagText(formatDiagnosticsHuman(json.diagnostics as Record<string, unknown>));
      setGate(Boolean(json.ok) && res.exitCode === 0 ? "ok" : "fail");
    } else if (json) {
      setDiagText(JSON.stringify(json, null, 2));
      setGate(Boolean(json.ok) && res.exitCode === 0 ? "ok" : "fail");
    } else {
      setDiagText(res.stderr || res.stdout || "(no JSON from core — see Output tab)");
      setGate(res.exitCode === 0 ? "ok" : "fail");
    }
    if (json?.ir_bundle) {
      setIrPreview(JSON.stringify(json.ir_bundle, null, 2));
      setRightOpen(true);
      setRightTab("ir");
    } else if (!json?.ir_bundle && res.exitCode !== 0) {
      setIrPreview("");
    }
    setPipelineStages([]);
    setPipelineSummary(null);
    setWritten([]);
    setBuildSummaryLine("");
    setBusy("idle");
  };

  const runValidate = async () => {
    if (!activeRel) return;
    await runValidateForRel(activeRel);
  };

  const seedSample = async (which: "minimal" | "flagship") => {
    if (!workspace) return;
    const r = await getShell().seedSampleTq(workspace, which);
    if (!r.ok) {
      appendOutput("Sample copy", { exitCode: 1, stdout: "", stderr: r.error });
      setBottomOpen(true);
      setBottomTab("output");
      return;
    }
    await refreshTree(workspace);
    await loadFile(r.relativePath, { skipDirtyCheck: true });
  };

  const quickDemo = async () => {
    if (!workspace) return;
    const r = await getShell().seedSampleTq(workspace, "minimal");
    if (!r.ok) {
      appendOutput("Quick demo", { exitCode: 1, stdout: "", stderr: r.error });
      setBottomOpen(true);
      setBottomTab("output");
      return;
    }
    await refreshTree(workspace);
    const rd = await getShell().readFile(workspace, r.relativePath);
    if (!rd.ok) {
      appendOutput("Quick demo (read)", { exitCode: 1, stdout: "", stderr: rd.error });
      return;
    }
    setActiveRel(r.relativePath);
    setContent(rd.content);
    setDirty(false);
    await runValidateForRel(r.relativePath);
  };

  const runBuild = async () => {
    if (!workspace || !activeRel) return;
    setBusy("build");
    setGate("idle");
    setBuildSummaryLine("");
    setBottomOpen(true);
    setBottomTab("output");
    const wsDisplay = workspace.replace(/\\/g, "/");
    const buildCmd = `torqa --json build "${wsDisplay}/${activeRel}" --root "${wsDisplay}" --out torqa_generated_out --engine-mode python_only`;
    setLastTorqaCommand(buildCmd);
    const res = await getShell().torqaRun({
      kind: "build",
      workspaceRoot: workspace,
      relativePath: activeRel,
      outDir: "torqa_generated_out",
      engineMode: "python_only",
    });
    appendOutput("Build (materialize project)", res, buildCmd);
    const json = tryParseTorqaJson(res.stdout, res.stderr) as Record<string, unknown> | null;
    if (json && isRecord(json.diagnostics as unknown)) {
      setDiagText(formatDiagnosticsHuman(json.diagnostics as Record<string, unknown>));
    } else if (json) {
      setDiagText(JSON.stringify(json, null, 2));
    } else {
      setDiagText(res.stderr || res.stdout || "(no JSON from core)");
    }
    const ok = json ? Boolean(json.ok) && res.exitCode === 0 : res.exitCode === 0;
    setGate(ok ? "ok" : "fail");
    const stages = (json?.pipeline_stages as unknown[]) || [];
    setPipelineStages(stages);
    setPipelineSummary((json?.pipeline_summary as Record<string, unknown>) || null);
    const w = json?.written;
    setWritten(Array.isArray(w) ? (w as string[]) : []);
    if (json) setBuildSummaryLine(summarizeBuildPayload(json));
    else setBuildSummaryLine("");
    if (json?.ir_bundle) {
      setIrPreview(JSON.stringify(json.ir_bundle, null, 2));
    }
    setBusy("idle");
  };

  const runBenchmark = async () => {
    setBusy("bench");
    setBottomOpen(true);
    setBottomTab("output");
    const hasOpenTq = Boolean(workspace && activeRel);
    const req: TorqaRequest = hasOpenTq
      ? { kind: "benchmark", workspaceRoot: workspace!, relativePath: activeRel! }
      : { kind: "benchmark" };
    const explain =
      "Core: if the open file sits in a P31 benchmark folder (BENCHMARK_TASK.md + app.tq + expected_output_summary.json), " +
      "runs `src.benchmarks.cli` on that directory with `--no-generated`. Otherwise runs `torqa --json demo benchmark` " +
      "(flagship baseline JSON shipped in the repo).";
    setLastTorqaCommand(hasOpenTq ? "benchmark (auto: P31 dir or flagship)" : "torqa --json demo benchmark");
    const res = await getShell().torqaRun(req);
    appendOutput("Benchmark", res, explain);
    const json = tryParseTorqaJson(res.stdout, res.stderr) as Record<string, unknown> | null;
    const m = json?.metrics as BenchMetrics | undefined;
    setBenchMetrics(m && typeof m === "object" ? m : null);
    setRightOpen(true);
    setRightTab("bench");
    setBusy("idle");
  };

  const cmTheme = theme === "dark" ? vscodeDark : vscodeLight;
  const extensions = useMemo(() => [EditorView.lineWrapping], []);

  const statusClass =
    busy !== "idle" ? "run" : gate === "ok" ? "ok" : gate === "fail" ? "fail" : "idle";
  const statusLabel =
    busy === "surface"
      ? "Validating…"
      : busy === "build"
        ? "Building…"
        : busy === "bench"
          ? "Benchmark…"
          : gate === "ok"
            ? "PASS"
            : gate === "fail"
              ? "FAIL"
              : "Ready";

  const workspaceShort =
    workspace && workspace.length > 48 ? `…${workspace.slice(-44)}` : workspace || "";

  return (
    <div className="shell">
      <header className="titlebar">
        <span className="brand">TORQA Desktop</span>
        <button type="button" className="btn" onClick={() => void openProject()}>
          Open folder…
        </button>
        <button type="button" className="btn" onClick={() => void openTqFile()} title="Ctrl+O — klasörü dosyanın bulunduğu dizin yapar">
          Open .tq file…
        </button>
        <span
          className="status-pill idle"
          style={{ marginLeft: 8, maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          title={workspace || undefined}
        >
          {workspace ? workspaceShort : "No workspace — Open folder veya Open .tq file (Ctrl+O)"}
        </span>
        <div className="toolbar-actions">
          <span className={`status-pill ${statusClass}`}>{statusLabel}</span>
          <button
            type="button"
            className="btn"
            disabled={!workspace || !activeRel || busy !== "idle"}
            onClick={() => void runValidate()}
          >
            Validate
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!workspace || !activeRel || busy !== "idle"}
            onClick={() => void runBuild()}
          >
            Build
          </button>
          <button type="button" className="btn" disabled={busy !== "idle"} onClick={() => void runBenchmark()}>
            Benchmark
          </button>
          <button
            type="button"
            className="btn"
            disabled={!activeRel}
            onClick={() => void saveFile()}
            title="Save (Ctrl/Cmd+S)"
          >
            Save
          </button>
          <button
            type="button"
            className="btn theme-toggle"
            onClick={() => setRightOpen((o) => !o)}
            title="Toggle right panel"
          >
            ⧉
          </button>
          <button type="button" className="btn theme-toggle" onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}>
            {theme === "dark" ? "◐" : "◑"}
          </button>
        </div>
      </header>

      <div className="body-row">
        <aside className="sidebar">
          <div className="sidebar-head">Explorer · .tq</div>
          <div className="sidebar-sub">Start here</div>
          <div className="sidebar-actions">
            <button
              type="button"
              className="btn btn-compact btn-primary"
              disabled={!workspace || busy !== "idle"}
              onClick={() => void quickDemo()}
              title="Copy minimal sample .tq and run Validate"
            >
              ① Quick demo (sample + validate)
            </button>
            <button
              type="button"
              className="btn btn-compact"
              disabled={!workspace || busy !== "idle"}
              onClick={() => void seedSample("minimal")}
            >
              ② Load minimal sample
            </button>
            <button
              type="button"
              className="btn btn-compact"
              disabled={!workspace || busy !== "idle"}
              onClick={() => void seedSample("flagship")}
            >
              ③ Load flagship sample
            </button>
          </div>
          <div className="file-tree">
            {!workspace && <div className="empty-hint">Open a folder to list .tq files.</div>}
            {workspace && tqFiles.length === 0 ? (
              <div className="empty-hint" style={{ padding: "8px 10px" }}>
                No <code>.tq</code> files found under this folder. Use a sample button above or add files, then refresh by
                re-opening the folder if needed.
              </div>
            ) : null}
            {workspace &&
              tqFiles.map((f) => (
                <div
                  key={f}
                  className={`file-item${f === activeRel ? " active" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => void loadFile(f)}
                  onKeyDown={(e) => e.key === "Enter" && void loadFile(f)}
                >
                  {f}
                </div>
              ))}
          </div>
        </aside>

        <section className="center">
          <div className="editor-head" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span>
              {activeRel || (workspace ? "Choose a .tq file from the list" : "Open a folder first")}{" "}
              {dirty ? "· modified" : ""}
            </span>
            {paths ? (
              <span
                style={{ opacity: 0.65, textAlign: "right", maxWidth: "42%", overflow: "hidden", textOverflow: "ellipsis" }}
                title={`${paths.repoRoot}\n${paths.pythonExe}`}
              >
                TORQA core connected
              </span>
            ) : null}
          </div>
          <div className="editor-wrap">
            {!workspace ? (
              <div className="empty-hint welcome-stack">
                <p className="welcome-title">Welcome to TORQA Desktop</p>
                <ol className="welcome-steps">
                  <li>
                    <strong>Open .tq file…</strong> (veya menü <em>File → Open .tq File</em>, <kbd>Ctrl+O</kbd>) ile doğrudan bir
                    dosya seçin — workspace otomatik ayarlanır.
                  </li>
                  <li>
                    Ya da <strong>Open folder…</strong> / <kbd>Ctrl+Shift+O</kbd> ile proje klasörü seçin.
                  </li>
                  <li>
                    Klasör açıksa <strong>Quick demo</strong> ile örnek ekleyip <strong>Validate</strong> / <strong>Build</strong>{" "}
                    kullanın; çıktı altta.
                  </li>
                </ol>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                  <button type="button" className="btn btn-primary welcome-cta" onClick={() => void openTqFile()}>
                    Open .tq file…
                  </button>
                  <button type="button" className="btn welcome-cta" onClick={() => void openProject()}>
                    Open folder…
                  </button>
                </div>
              </div>
            ) : !activeRel ? (
              <div className="empty-hint">
                Pick a <code>.tq</code> file in the sidebar, or run <strong>Quick demo</strong>. Then use{" "}
                <strong>Validate</strong> or <strong>Build</strong>. All checks run in TORQA core via the CLI.
              </div>
            ) : (
              <CodeMirror
                value={content}
                height="100%"
                theme={cmTheme}
                extensions={extensions}
                onChange={(v) => {
                  setContent(v);
                  setDirty(true);
                }}
                basicSetup={{ lineNumbers: true, foldGutter: true }}
              />
            )}
          </div>
        </section>

        <aside className={`insight${rightOpen ? "" : " collapsed"}`}>
          <div className="insight-tabs">
            <button type="button" className={rightTab === "ir" ? "on" : ""} onClick={() => setRightTab("ir")}>
              IR preview
            </button>
            <button type="button" className={rightTab === "bench" ? "on" : ""} onClick={() => setRightTab("bench")}>
              Benchmark
            </button>
          </div>
          <div className="insight-body">
            {rightTab === "ir" ? (
              irPreview ? (
                <pre style={{ margin: 0 }}>{irPreview}</pre>
              ) : (
                <div className="empty-hint">Run Validate on a .tq file to load IR JSON from core output.</div>
              )
            ) : benchMetrics ? (
              <div>
                <div className="bm-hero">
                  {typeof benchMetrics.semantic_compression_ratio === "number"
                    ? `${benchMetrics.semantic_compression_ratio.toFixed(2)}×`
                    : "—"}
                </div>
                <div style={{ color: "var(--text-dim)", marginBottom: 12 }}>
                  Token estimates (flagship baseline on disk, or P31 folder when applicable). See Output for the exact
                  command.
                </div>
                {(
                  [
                    ["task_prompt_token_estimate", "NL task (est.)"],
                    ["torqa_source_token_estimate", ".tq surface (est.)"],
                    ["ir_bundle_token_estimate", "IR bundle (est.)"],
                    ["generated_output_token_estimate", "Generated (est.)"],
                  ] as const
                ).map(([k, lab]) =>
                  typeof benchMetrics[k] === "number" ? (
                    <div key={k} className="bm-row">
                      <span>{lab}</span>
                      <span>{String(benchMetrics[k])}</span>
                    </div>
                  ) : null,
                )}
              </div>
            ) : (
              <div className="empty-hint">
                Run <strong>Benchmark</strong>. Results come from core (P31 directory around <code>app.tq</code> when
                available, otherwise flagship <code>compression_baseline_report.json</code>). If this stays empty, open the
                Output tab for stderr.
              </div>
            )}
          </div>
        </aside>
      </div>

      <footer className={`bottom${bottomOpen ? "" : " collapsed"}`}>
        <div className="bottom-tabs">
          <button type="button" className={bottomTab === "output" ? "on" : ""} onClick={() => setBottomTab("output")}>
            Output
          </button>
          <button
            type="button"
            className={bottomTab === "diagnostics" ? "on" : ""}
            onClick={() => setBottomTab("diagnostics")}
          >
            Diagnostics
          </button>
          {pipelineStages.length > 0 && (
            <div className="pipeline" style={{ marginLeft: 12 }}>
              {(pipelineStages as { stage?: string; stage_ok?: boolean }[]).map((s, i) => (
                <span
                  key={`${s.stage}-${i}`}
                  className={`pipe-step${s.stage_ok ? " ok" : s.stage_ok === false ? " fail" : ""}`}
                >
                  {s.stage ?? "?"}
                </span>
              ))}
            </div>
          )}
          {lastTorqaCommand ? (
            <span
              className="pipeline"
              style={{ marginLeft: 8, opacity: 0.75, fontSize: 11, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              title={lastTorqaCommand}
            >
              Last core: {lastTorqaCommand.length > 42 ? `${lastTorqaCommand.slice(0, 40)}…` : lastTorqaCommand}
            </span>
          ) : null}
          <button type="button" className="bottom-toggle" onClick={() => setBottomOpen((o) => !o)}>
            {bottomOpen ? "▼" : "▲"}
          </button>
        </div>
        {bottomOpen ? (
          <div className="bottom-body">
            {bottomTab === "output" ? (
              outputText || <span className="empty-hint">Command output from TORQA core will appear here.</span>
            ) : (
              <>
                {buildSummaryLine ? (
                  <pre style={{ margin: "0 0 8px", color: "var(--accent, #6cb3ff)" }}>{buildSummaryLine}</pre>
                ) : null}
                {pipelineSummary ? (
                  <pre style={{ margin: "0 0 8px" }}>{JSON.stringify(pipelineSummary, null, 2)}</pre>
                ) : null}
                {diagText || <span className="empty-hint">No diagnostics yet. Run Validate or Build on a .tq file.</span>}
                {written.length > 0 ? (
                  <div>
                    <strong>Generated paths</strong>
                    <ul className="written-list">
                      {written.slice(0, 80).map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                    {written.length > 80 ? <div>… {written.length - 80} more</div> : null}
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </footer>
    </div>
  );
}

function ElectronMissing() {
  useEffect(() => {
    document.documentElement.dataset.theme = "dark";
  }, []);
  return (
    <div
      className="shell electron-missing"
      data-theme="dark"
      style={{
        padding: "28px 32px",
        maxWidth: 760,
        margin: "0 auto",
        minHeight: "100vh",
        boxSizing: "border-box",
      }}
    >
      <h1 style={{ marginTop: 0 }}>Klasör / .tq açma bu görünümde çalışmaz</h1>
      <p style={{ lineHeight: 1.65 }}>
        <code>torqaShell</code> yüklenmedi — arayüz büyük ihtimalle <strong>tarayıcıda</strong> (ör.{" "}
        <code>http://localhost:5173</code>) açılıyor. Dosya diyaloğu yalnızca{" "}
        <strong>Electron masaüstü penceresinde</strong> çalışır; tarayıcıda güvenlik nedeniyle köprü yoktur.
      </p>
      <h2 style={{ marginBottom: 12 }}>Şunu yapın</h2>
      <ol style={{ lineHeight: 1.75 }}>
        <li>
          Bu tarayıcı sekmesini kapatın (adres çubuğunda <code>http://</code> görüyorsanız doğrudan bu hatadır).
        </li>
        <li>
          PowerShell / Terminal:{" "}
          <pre style={{ whiteSpace: "pre-wrap", padding: 12, borderRadius: 8, background: "var(--panel, #2d2d2d)" }}>
            {`cd desktop\nnpm install\nnpm run build\nnpm start`}
          </pre>
        </li>
        <li>
          Alternatif (repo kökü): <code>pip install -e .</code> ardından <code>torqa-desktop</code>
        </li>
        <li>
          <code>npm run dev</code> kullanıyorsanız: Vite’nin açtığı <strong>ayrı masaüstü penceresini</strong> kullanın;
          localhost URL’sini Chrome’a yapıştırmayın.
        </li>
      </ol>
      <p style={{ opacity: 0.85, fontSize: 13 }}>
        Doğru pencerede adres çubuğu yoktur; üstte “File” menüsü ve TORQA uygulaması görünür.
      </p>
    </div>
  );
}

export default function App() {
  if (typeof window !== "undefined" && !window.torqaShell) {
    return <ElectronMissing />;
  }
  return <DesktopApp />;
}
