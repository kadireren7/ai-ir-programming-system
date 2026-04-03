import CodeMirror from "@uiw/react-codemirror";
import { vscodeDark, vscodeLight } from "@uiw/codemirror-theme-vscode";
import { EditorView } from "@codemirror/view";
import { useCallback, useEffect, useMemo, useState } from "react";
import { tryParseTorqaJson } from "./parseTorqaJson";

type ThemeMode = "dark" | "light";

type BenchMetrics = Record<string, number | boolean | null | undefined>;

function getShell() {
  return window.torqaShell;
}

export default function App() {
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

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    void (async () => {
      const p = await getShell().getPaths();
      setPaths(p);
      const ws = await getShell().getWorkspace();
      setWorkspace(ws);
    })();
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

  const openProject = async () => {
    const root = await getShell().openWorkspace();
    if (!root) return;
    setWorkspace(root);
    setGate("idle");
    setOutputText("");
    setDiagText("");
    setIrPreview("");
    setBenchMetrics(null);
    setPipelineStages([]);
    setPipelineSummary(null);
    setWritten([]);
  };

  const loadFile = async (rel: string, opts?: { skipDirtyCheck?: boolean }) => {
    if (!workspace) return;
    if (dirty && !opts?.skipDirtyCheck && !confirm("Discard unsaved changes?")) return;
    const text = await getShell().readFile(workspace, rel);
    setActiveRel(rel);
    setContent(text);
    setDirty(false);
  };

  const saveFile = async () => {
    if (!workspace || !activeRel) return;
    await getShell().saveFile(workspace, activeRel, content);
    setDirty(false);
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

  const appendOutput = (label: string, res: { stdout: string; stderr: string; exitCode: number }) => {
    const block = [
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
    const res = await getShell().torqaRun({
      kind: "surface",
      workspaceRoot: workspace,
      relativePath: rel,
    });
    appendOutput("Validate (torqa --json surface)", res);
    const json = tryParseTorqaJson(res.stdout, res.stderr) as Record<string, unknown> | null;
    if (json?.diagnostics) {
      setDiagText(JSON.stringify(json.diagnostics, null, 2));
      setGate(Boolean(json.ok) ? "ok" : "fail");
    } else {
      setDiagText(res.stderr || res.stdout || "(no JSON diagnostics)");
      setGate(res.exitCode === 0 ? "ok" : "fail");
    }
    if (json?.ir_bundle) {
      setIrPreview(JSON.stringify(json.ir_bundle, null, 2));
      setRightOpen(true);
      setRightTab("ir");
    }
    setPipelineStages([]);
    setPipelineSummary(null);
    setWritten([]);
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
    const text = await getShell().readFile(workspace, r.relativePath);
    setActiveRel(r.relativePath);
    setContent(text);
    setDirty(false);
    await runValidateForRel(r.relativePath);
  };

  const runBuild = async () => {
    if (!workspace || !activeRel) return;
    setBusy("build");
    setGate("idle");
    setBottomOpen(true);
    setBottomTab("output");
    const res = await getShell().torqaRun({
      kind: "build",
      workspaceRoot: workspace,
      relativePath: activeRel,
      outDir: "torqa_generated_out",
      engineMode: "python_only",
    });
    appendOutput("Build (torqa --json build)", res);
    const json = tryParseTorqaJson(res.stdout, res.stderr) as Record<string, unknown> | null;
    if (json?.diagnostics) {
      setDiagText(JSON.stringify(json.diagnostics, null, 2));
    } else {
      setDiagText(json ? JSON.stringify(json, null, 2) : res.stderr || res.stdout);
    }
    const ok = json ? Boolean(json.ok) && res.exitCode === 0 : res.exitCode === 0;
    setGate(ok ? "ok" : "fail");
    const stages = (json?.pipeline_stages as unknown[]) || [];
    setPipelineStages(stages);
    setPipelineSummary((json?.pipeline_summary as Record<string, unknown>) || null);
    const w = json?.written;
    setWritten(Array.isArray(w) ? (w as string[]) : []);
    if (json?.ir_bundle) {
      setIrPreview(JSON.stringify(json.ir_bundle, null, 2));
    }
    setBusy("idle");
  };

  const runBenchmark = async () => {
    setBusy("bench");
    setBottomOpen(true);
    setBottomTab("output");
    const res = await getShell().torqaRun({ kind: "benchmark" });
    appendOutput("Benchmark (torqa --json demo benchmark)", res);
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

  return (
    <div className="shell">
      <header className="titlebar">
        <span className="brand">TORQA Desktop</span>
        <button type="button" className="btn" onClick={() => void openProject()}>
          Open folder…
        </button>
        <span className="status-pill idle" style={{ marginLeft: 8, maxWidth: 360, overflow: "hidden" }}>
          {workspace ? workspace : "No folder"}
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
          <div className="sidebar-sub">First run</div>
          <div className="sidebar-actions">
            <button
              type="button"
              className="btn btn-compact"
              disabled={!workspace || busy !== "idle"}
              onClick={() => void quickDemo()}
              title="Copy minimal sample .tq and run Validate"
            >
              Quick demo (sample + validate)
            </button>
            <button
              type="button"
              className="btn btn-compact"
              disabled={!workspace || busy !== "idle"}
              onClick={() => void seedSample("minimal")}
            >
              Load minimal sample
            </button>
            <button
              type="button"
              className="btn btn-compact"
              disabled={!workspace || busy !== "idle"}
              onClick={() => void seedSample("flagship")}
            >
              Load flagship sample
            </button>
          </div>
          <div className="file-tree">
            {!workspace && <div className="empty-hint">Open a folder to list .tq files.</div>}
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
              {activeRel || "No file"} {dirty ? "· modified" : ""}
            </span>
            {paths ? (
              <span style={{ opacity: 0.65, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis" }}>
                core: {paths.repoRoot} · {paths.pythonExe}
              </span>
            ) : null}
          </div>
          <div className="editor-wrap">
            {!activeRel ? (
              <div className="empty-hint">
                Select a <code>.tq</code> file, then Validate or Build. All checks run via <code>torqa</code> in the TORQA
                repo — no duplicated logic in this shell.
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
                <div style={{ color: "var(--text-dim)", marginBottom: 12 }}>.tq vs NL task (flagship baseline)</div>
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
              <div className="empty-hint">Run Benchmark to load flagship metrics from core (`torqa --json demo benchmark`).</div>
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
          <button type="button" className="bottom-toggle" onClick={() => setBottomOpen((o) => !o)}>
            {bottomOpen ? "▼" : "▲"}
          </button>
        </div>
        {bottomOpen ? (
          <div className="bottom-body">
            {bottomTab === "output" ? (
              outputText || <span className="empty-hint">Command output from torqa will appear here.</span>
            ) : (
              <>
                {pipelineSummary ? (
                  <pre style={{ margin: "0 0 8px" }}>{JSON.stringify(pipelineSummary, null, 2)}</pre>
                ) : null}
                {diagText || <span className="empty-hint">No diagnostics yet.</span>}
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
