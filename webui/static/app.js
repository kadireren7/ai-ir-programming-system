/**
 * TORQA Console — Monaco-backed JSON editors + pipeline actions.
 */
/* global require, monaco */

const MONACO_VS = "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs";

const DEFAULT_IR = `{
  "ir_goal": {
    "goal": "",
    "inputs": [],
    "preconditions": [],
    "forbids": [],
    "transitions": [],
    "postconditions": [],
    "result": null,
    "metadata": {
      "ir_version": "1.4",
      "source": "python_prototype",
      "canonical_language": "english",
      "source_map": { "available": true, "prototype_only": true }
    }
  }
}`;

let irEditor = null;
let mutationsEditor = null;
let monacoReady = false;
let useFallback = false;

/** @type {'ir' | 'tq'} */
let editorMode = "ir";
let savedIrText = "";
let savedTqText = "";

const DEFAULT_TQ_BOOT = `# TORQA surface — Load signin sample or paste .tq
module auth.signin
intent user_signin
requires username, password, ip_address
flow:
  validate username
`;

/** Active step 1–4; earlier steps show as done. */
let workflowActive = 1;

function refreshWorkflowUI() {
  document.querySelectorAll(".workflow-step").forEach((el) => {
    const n = parseInt(el.dataset.wf, 10);
    el.classList.toggle("active", n === workflowActive);
    el.classList.toggle("done", n < workflowActive);
  });
}

function advanceWorkflow(step) {
  workflowActive = Math.max(1, Math.min(4, step));
  refreshWorkflowUI();
}

function $(id) {
  return document.getElementById(id);
}

function setStatus(text, kind) {
  const el = $("status");
  el.textContent = text;
  el.className = "status-pill" + (kind === "ok" ? " ok" : kind === "bad" ? " bad" : "");
}

function hideParseHint() {
  const h = $("editor-parse-hint");
  h.hidden = true;
  h.textContent = "";
}

function showParseHint(msg) {
  const h = $("editor-parse-hint");
  h.hidden = false;
  h.textContent = msg;
}

function getIrText() {
  if (useFallback) return $("ir-editor-fallback").value;
  return irEditor ? irEditor.getValue() : "";
}

function setIrText(text) {
  hideParseHint();
  if (useFallback) {
    $("ir-editor-fallback").value = text;
    $("ir-editor-fallback").hidden = false;
    return;
  }
  if (irEditor) irEditor.setValue(text);
}

function getMutationsText() {
  if (useFallback) return $("mutations-fallback").value || "[]";
  return mutationsEditor ? mutationsEditor.getValue() : "[]";
}

function setMutationsText(text) {
  if (useFallback) $("mutations-fallback").value = text;
  else if (mutationsEditor) mutationsEditor.setValue(text);
}

function parseJsonLabel(raw, label) {
  try {
    return { ok: true, data: JSON.parse(raw) };
  } catch (e) {
    return { ok: false, error: `${label}: ${e.message}` };
  }
}

function formatIrEditor() {
  const r = parseJsonLabel(getIrText(), "IR JSON");
  if (!r.ok) {
    showParseHint(r.error);
    return;
  }
  hideParseHint();
  setIrText(JSON.stringify(r.data, null, 2));
}

function formatMutationsEditor() {
  const r = parseJsonLabel(getMutationsText(), "Mutations JSON");
  if (!r.ok) return;
  setMutationsText(JSON.stringify(r.data, null, 2));
}

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || res.statusText);
  }
  return res.json();
}

/** Diagnostics tab: show hint/doc + suggested_next above raw JSON when present. */
function formatDiagnosticsPanelText(diag) {
  if (diag == null || typeof diag !== "object") {
    return JSON.stringify(diag, null, 2);
  }
  const issues = Array.isArray(diag.issues) ? diag.issues : [];
  const lines = [];
  for (const i of issues) {
    if (i.hint || i.doc) {
      lines.push(`[${i.code || "?"}] ${i.message || ""}`);
      if (i.hint) lines.push(`  hint: ${i.hint}`);
      if (i.doc) lines.push(`  doc:  ${i.doc}`);
      lines.push("");
    }
  }
  if (diag.suggested_next && Array.isArray(diag.suggested_next) && diag.suggested_next.length) {
    lines.push("suggested_next:");
    for (const s of diag.suggested_next) lines.push(`  - ${s}`);
    lines.push("");
  }
  const head = lines.length ? `${lines.join("\n")}---\n\n` : "";
  return head + JSON.stringify(diag, null, 2);
}

async function runFullDiagnosticsFromEditor() {
  setStatus("Running diagnostics…", "neutral");
  const ir = parseJsonLabel(getIrText(), "IR bundle");
  if (!ir.ok) {
    showParseHint(ir.error);
    setStatus("Fix JSON first.", "bad");
    return { ok: false };
  }
  hideParseHint();
  try {
    const out = await fetchJSON("/api/diagnostics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ir_bundle: ir.data }),
    });
    $("out-diagnostics").textContent = formatDiagnosticsPanelText(out);
    const nIssues = (out.issues && out.issues.length) || 0;
    setDiagnosticsVerdict(out);
    updateValidationBanner(
      true,
      !!out.ok,
      out.ok ? "Full diagnostics: pass" : "Full diagnostics: fail",
      out.ok ? "No blocking issues." : `${nIssues} issue(s) — see Diagnostics tab.`
    );
    setStatus(out.ok ? "Diagnostics clean" : "Issues found · see Diagnostics tab", out.ok ? "ok" : "bad");
    setTab("diagnostics");
    advanceWorkflow(3);
    return { ok: true, out };
  } catch (e) {
    setStatus(String(e.message || e), "bad");
    setDiagnosticsVerdict(null);
    return { ok: false };
  }
}

const CONSOLE_FIRST_RUN_KEY = "torqa-console-first-run-v1";

function showConsoleFirstRunOverlay() {
  const ov = $("console-first-run-overlay");
  if (ov) ov.hidden = false;
}

function hideConsoleFirstRunOverlay() {
  const ov = $("console-first-run-overlay");
  if (ov) ov.hidden = true;
}

function consoleFirstRunDone() {
  localStorage.setItem(CONSOLE_FIRST_RUN_KEY, "1");
  hideConsoleFirstRunOverlay();
}

async function loadConsoleSampleProject() {
  const bundle = await fetchJSON("/api/examples/valid_minimal_flow.json");
  const text = JSON.stringify(bundle, null, 2);
  setIrText(text);
  savedIrText = text;
  hideParseHint();
  if (editorMode !== "ir") setEditorMode("ir");
  setStatus("Loaded sample: valid_minimal_flow.json", "ok");
  advanceWorkflow(2);
}

async function consoleFirstRunQuickDemo() {
  await loadConsoleSampleProject();
  await runFullDiagnosticsFromEditor();
}

function fillPipelineOutputPanels(out) {
  $("out-validation").textContent = JSON.stringify(
    {
      ir_valid: out.ir_valid,
      validation_errors: out.validation_errors,
      handoff_errors: out.handoff_errors,
      fingerprint: out.fingerprint,
    },
    null,
    2
  );
  $("out-diagnostics").textContent = formatDiagnosticsPanelText(out.diagnostics || {});
  const diag = out.diagnostics || {};
  if (diag && typeof diag.ok === "boolean") setDiagnosticsVerdict(diag);
  else setDiagnosticsVerdict(!!out.ir_valid);
  $("out-semantic").textContent = JSON.stringify(out.semantic, null, 2);
  $("out-engine").textContent = JSON.stringify(out.engine, null, 2);
  const arts = out.orchestrator.artifacts || [];
  const byTargetLanguage = {};
  for (const a of arts) {
    const k = a.target_language || "unknown";
    byTargetLanguage[k] = (byTargetLanguage[k] || 0) + 1;
  }
  const summary = arts.map((a) => ({
    target_language: a.target_language,
    purpose: a.purpose,
    files: (a.files || []).map((f) => ({
      filename: f.filename,
      content_preview: (f.content || "").slice(0, 400),
    })),
  }));
  $("out-artifacts").textContent = JSON.stringify(
    {
      by_target_language: byTargetLanguage,
      note: "Not only website: check generated/sql, generated/rust, generated/python, etc. when using torqa demo emit.",
      artifacts: summary,
    },
    null,
    2
  );
  $("out-execution-trace").textContent = JSON.stringify(out.execution_trace || {}, null, 2);
  $("out-raw").textContent = JSON.stringify(out, null, 2);

  const verr = out.validation_errors || [];
  const vdetail =
    out.ir_valid === true
      ? `${arts.length} artifact group(s) — open Artifacts tab for file list.`
      : (Array.isArray(verr) ? verr : [])
          .slice(0, 3)
          .map((x) => (typeof x === "string" ? x : JSON.stringify(x)))
          .join("; ") || "See Validation tab.";
  updateValidationBanner(
    true,
    !!out.ir_valid,
    out.ir_valid ? "Pipeline: IR valid" : "Pipeline: validation failed",
    vdetail
  );
}

function setTab(name) {
  document.querySelectorAll(".tab").forEach((b) => {
    const on = b.dataset.tab === name;
    b.classList.toggle("active", on);
    b.setAttribute("aria-selected", on ? "true" : "false");
  });
  document.querySelectorAll("pre.out").forEach((p) => {
    p.classList.toggle("active", p.id === `out-${name}`);
  });
}

document.querySelectorAll(".tab").forEach((b) => {
  b.addEventListener("click", () => setTab(b.dataset.tab));
});

function initMonaco() {
  return new Promise((resolve, reject) => {
    if (typeof require === "undefined") {
      reject(new Error("Monaco loader not found"));
      return;
    }
    require.config({ paths: { vs: MONACO_VS } });
    require(
      ["vs/editor/editor.main"],
      () => {
        monaco.editor.defineTheme("torqa", {
          base: "vs-dark",
          inherit: true,
          rules: [],
          colors: {
            "editor.background": "#0a0e14",
            "editor.foreground": "#d6dbe6",
            "editorLineNumber.foreground": "#5c677a",
            "editorLineNumber.activeForeground": "#8b96a8",
            "editorGutter.background": "#0a0e14",
            "minimap.background": "#0a0e14",
          },
        });
        monaco.editor.setTheme("torqa");

        const editorOpts = {
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 13,
          lineHeight: 20,
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: "smooth",
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true, indentation: true },
          padding: { top: 12, bottom: 12 },
          automaticLayout: true,
          wordWrap: "on",
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
            useShadows: false,
          },
          renderLineHighlight: "line",
          overviewRulerLanes: 0,
        };

        irEditor = monaco.editor.create($("monaco-ir"), {
          ...editorOpts,
          value: DEFAULT_IR,
          language: "json",
        });

        mutationsEditor = monaco.editor.create($("monaco-mutations"), {
          ...editorOpts,
          value: "[]",
          language: "json",
          minimap: { enabled: false },
          fontSize: 12,
        });

        irEditor.onDidChangeModelContent(() => hideParseHint());

        irEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
          formatIrEditor();
        });

        mutationsEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
          formatMutationsEditor();
        });

        monacoReady = true;
        resolve();
      },
      reject
    );
  });
}

function enableTextareaFallback(msg) {
  useFallback = true;
  $("monaco-ir").style.display = "none";
  $("monaco-mutations").style.display = "none";
  const ta = $("ir-editor-fallback");
  ta.hidden = false;
  ta.removeAttribute("readonly");
  ta.className = "textarea-fallback ir-editor-fallback";
  ta.value = DEFAULT_IR;
  ta.rows = 18;
  const mf = $("mutations-fallback");
  mf.hidden = false;
  setStatus(msg || "Monaco CDN unavailable — using basic text editor.", "bad");
}

function setEditorMode(mode) {
  editorMode = mode;
  const bIr = $("btn-mode-ir");
  const bTq = $("btn-mode-tq");
  if (bIr) bIr.classList.toggle("active", mode === "ir");
  if (bTq) bTq.classList.toggle("active", mode === "tq");
  const compileBtn = $("btn-compile-tq");
  const tqSam = $("btn-load-tq-sample");
  const fmt = $("btn-format-ir");
  if (compileBtn) compileBtn.hidden = mode !== "tq";
  if (tqSam) tqSam.hidden = mode !== "tq";
  if (fmt) fmt.hidden = mode === "tq";

  if (useFallback) {
    const ta = $("ir-editor-fallback");
    if (mode === "tq") {
      savedIrText = ta.value;
      ta.value = savedTqText || DEFAULT_TQ_BOOT;
    } else {
      savedTqText = ta.value;
      ta.value = savedIrText || DEFAULT_IR;
    }
    return;
  }
  if (!irEditor || !window.monaco) return;
  if (mode === "tq") {
    savedIrText = irEditor.getValue();
    window.monaco.editor.setModelLanguage(irEditor.getModel(), "plaintext");
    irEditor.setValue(savedTqText || DEFAULT_TQ_BOOT);
  } else {
    savedTqText = irEditor.getValue();
    window.monaco.editor.setModelLanguage(irEditor.getModel(), "json");
    irEditor.setValue(savedIrText || DEFAULT_IR);
  }
}

async function refreshExamples() {
  const data = await fetchJSON("/api/examples");
  const ul = $("example-list");
  ul.innerHTML = "";
  (data.examples || []).forEach((ex, i) => {
    const li = document.createElement("li");
    const id = `ex-${i}`;
    li.innerHTML = `<label><input type="radio" name="ex" id="${id}" value="${ex.name}" ${i === 0 ? "checked" : ""}/> <span class="ex-name">${escapeHtml(ex.name)}</span></label>`;
    ul.appendChild(li);
  });
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function updateValidationBanner(visible, ok, title, detail) {
  const el = $("validation-banner");
  if (!el) return;
  if (!visible) {
    el.hidden = true;
    el.innerHTML = "";
    el.className = "validation-banner";
    return;
  }
  el.hidden = false;
  el.className = "validation-banner" + (ok ? " ok" : " bad");
  const verdict = ok
    ? '<span class="vb-verdict vb-verdict-pass">PASS</span>'
    : '<span class="vb-verdict vb-verdict-fail">FAIL</span>';
  const d =
    detail != null && String(detail).trim() !== ""
      ? `<span class="vb-detail">${escapeHtml(String(detail))}</span>`
      : "";
  el.innerHTML =
    verdict +
    `<div class="vb-body"><span class="vb-title">${escapeHtml(String(title))}</span>${d}</div>`;
}

/** Latest full-diagnostics / IR diagnostics outcome for the Diagnostics tab strip. Pass null to hide. */
function setDiagnosticsVerdict(state) {
  const strip = $("diagnostics-verdict-strip");
  if (!strip) return;
  if (state == null) {
    strip.hidden = true;
    strip.className = "diagnostics-verdict-strip";
    strip.innerHTML = "";
    return;
  }
  const ok = typeof state === "boolean" ? state : !!state.ok;
  let issueCount = null;
  if (typeof state === "object" && state !== null && Array.isArray(state.issues)) {
    issueCount = state.issues.length;
  }
  strip.hidden = false;
  strip.className = "diagnostics-verdict-strip" + (ok ? " dv-ok" : " dv-fail");
  const badge = ok ? "PASS" : "FAIL";
  const sub =
    issueCount != null
      ? ok
        ? "No blocking issues in this report."
        : `${issueCount} blocking issue(s) — details below.`
      : ok
        ? "No blocking issues in this report."
        : "Blocking issues — details below.";
  strip.innerHTML =
    `<span class="dv-badge">${badge}</span>` +
    `<div class="dv-copy"><strong>Validation result</strong>` +
    `<span class="dv-sub">${escapeHtml(sub)}</span></div>`;
}

async function refreshDemoInsights() {
  const benchRoot = $("side-demo-benchmark");
  const gateEl = $("side-demo-gate");
  if (!benchRoot && !gateEl) return;

  let br = { ok: false };
  let gr = { ok: false };
  try {
    br = await fetchJSON("/api/demo/benchmark-report");
  } catch (e) {
    br = { ok: false };
  }
  try {
    gr = await fetchJSON("/api/demo/gate-proof-report");
  } catch (e) {
    gr = { ok: false };
  }

  if (benchRoot) {
    if (typeof torqaRenderBenchmarkPanel === "function" && br.ok && br.report && br.report.metrics) {
      const html = torqaRenderBenchmarkPanel(br.report.metrics);
      benchRoot.innerHTML =
        html || '<p class="tq-bm-fallback">P32 · incomplete benchmark metrics</p>';
    } else if (br.ok === false && br.message) {
      benchRoot.innerHTML =
        '<p class="tq-bm-fallback">P32 · ' + escapeHtml(String(br.message)) + "</p>";
    } else {
      benchRoot.innerHTML =
        '<p class="tq-bm-fallback">P32 · benchmark report not found or unavailable</p>';
    }
  }

  const gateLines = [];
  if (gr.ok && gr.report && gr.report.summary) {
    const s = gr.report.summary;
    const by = s.rejections_by_stage || {};
    gateLines.push(
      `P33 · gate: ${s.accepted} ok · ${s.rejected} rejected (parse ${by.parse || 0} · validate ${by.validate || 0} · project ${by.project || 0})`
    );
    gateLines.push(`Expectation mismatches: ${s.mismatch_with_expectation}`);
  } else {
    gateLines.push("P33 · gate report unavailable");
  }
  if (gateEl) gateEl.textContent = gateLines.join("\n");
}

function selectedExampleName() {
  const el = document.querySelector('input[name="ex"]:checked');
  return el ? el.value : null;
}

$("btn-format-ir").addEventListener("click", formatIrEditor);

const _irFileInput = $("ir-file-input");
const _btnOpenIr = $("btn-open-ir-file");
if (_btnOpenIr && _irFileInput) {
  _btnOpenIr.addEventListener("click", () => _irFileInput.click());
  _irFileInput.addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const chk = parseJsonLabel(text, "IR bundle");
      if (!chk.ok) {
        showParseHint(chk.error);
        setStatus("Geçersiz JSON dosyası.", "bad");
        return;
      }
      hideParseHint();
      savedIrText = text;
      if (editorMode !== "ir") setEditorMode("ir");
      else setIrText(text);
      setStatus("Dosya yüklendi: " + f.name, "ok");
    };
    reader.onerror = () => setStatus("Dosya okunamadı.", "bad");
    reader.readAsText(f, "UTF-8");
  });
}

const _bmIr = $("btn-mode-ir");
const _bmTq = $("btn-mode-tq");
if (_bmIr) _bmIr.addEventListener("click", () => setEditorMode("ir"));
if (_bmTq) _bmTq.addEventListener("click", () => setEditorMode("tq"));

const _bLts = $("btn-load-tq-sample");
if (_bLts) {
  _bLts.addEventListener("click", async () => {
    try {
      const data = await fetchJSON("/api/examples/tq/signin_flow.tq");
      savedTqText = data.source || "";
      if (useFallback) {
        $("ir-editor-fallback").value = savedTqText;
      } else if (irEditor) {
        irEditor.setValue(savedTqText);
      }
      setEditorMode("tq");
      setStatus("Loaded signin_flow.tq", "ok");
    } catch (e) {
      setStatus(String(e.message || e), "bad");
    }
  });
}

const _bCtq = $("btn-compile-tq");
if (_bCtq) {
  _bCtq.addEventListener("click", async () => {
    const src = getIrText();
    try {
      const j = await fetchJSON("/api/compile-tq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: src }),
      });
      $("out-diagnostics").textContent = j.diagnostics
        ? formatDiagnosticsPanelText(j.diagnostics)
        : JSON.stringify(j, null, 2);
      setTab("diagnostics");
      if (!j.ok) {
        const hint = j.hint ? ` · ${j.hint}` : "";
        setStatus(`${j.code || "tq"}: ${j.message || "compile failed"}${hint}`, "bad");
        updateValidationBanner(true, false, ".tq compile: rejected", j.message || j.code || "");
        return;
      }
      savedIrText = JSON.stringify(j.ir_bundle, null, 2);
      setEditorMode("ir");
      const diagOk = !!(j.diagnostics && j.diagnostics.ok);
      updateValidationBanner(
        true,
        diagOk,
        diagOk ? ".tq → IR: diagnostics pass" : ".tq → IR: diagnostics report issues",
        diagOk ? "Run pipeline or download ZIP." : "See Diagnostics tab."
      );
      setStatus("Compiled .tq → IR", "ok");
      advanceWorkflow(2);
    } catch (e) {
      setStatus(String(e.message || e), "bad");
    }
  });
}

$("btn-load-example").addEventListener("click", async () => {
  const name = selectedExampleName();
  if (!name) return;
  try {
    const bundle = await fetchJSON(`/api/examples/${encodeURIComponent(name)}`);
    setIrText(JSON.stringify(bundle, null, 2));
    hideParseHint();
    setStatus(`Loaded ${name}`, "ok");
    advanceWorkflow(2);
  } catch (e) {
    setStatus(String(e.message || e), "bad");
  }
});

$("btn-run").addEventListener("click", async () => {
  setStatus("Running pipeline…", "neutral");
  const demo = parseJsonLabel($("demo-inputs").value || "{}", "Demo inputs");
  if (!demo.ok) {
    setStatus(demo.error, "bad");
    return;
  }
  const ir = parseJsonLabel(getIrText(), "IR bundle");
  if (!ir.ok) {
    showParseHint(ir.error);
    setStatus("Fix JSON before running.", "bad");
    return;
  }
  hideParseHint();
  try {
    const out = await fetchJSON("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ir_bundle: ir.data,
        demo_inputs: demo.data,
        engine_mode: $("engine-mode").value,
      }),
    });
    setStatus(
      out.ir_valid
        ? "IR valid · review Semantic tab for verifier details"
        : "Validation failed · see Validation tab",
      out.ir_valid ? "ok" : "bad"
    );

    fillPipelineOutputPanels(out);
    setTab("validation");
    advanceWorkflow(4);
  } catch (e) {
    setStatus(String(e.message || e), "bad");
  }
});

$("btn-download-zip").addEventListener("click", async () => {
  setStatus("Building ZIP…", "neutral");
  const ir = parseJsonLabel(getIrText(), "IR bundle");
  if (!ir.ok) {
    showParseHint(ir.error);
    setStatus("Fix JSON before download.", "bad");
    return;
  }
  hideParseHint();
  try {
    const res = await fetch("/api/materialize-project-zip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ir_bundle: ir.data,
        demo_inputs: null,
        engine_mode: $("engine-mode").value,
      }),
    });
    if (!res.ok) {
      let t = await res.text();
      try {
        const j = JSON.parse(t);
        t = j.message || j.detail || t;
      } catch (_) {
        /* plain text */
      }
      updateValidationBanner(true, false, "ZIP not built", String(t).slice(0, 400));
      throw new Error(t || res.statusText);
    }
    const metaB64 = res.headers.get("X-TORQA-Materialize-Meta");
    let meta = { written_count: 0, local_webapp: null };
    if (metaB64) {
      try {
        const pad = "=".repeat((4 - (metaB64.length % 4)) % 4);
        const norm = (metaB64 + pad).replace(/-/g, "+").replace(/_/g, "/");
        meta = JSON.parse(atob(norm));
      } catch (_) {
        /* ignore */
      }
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "torqa-generated.zip";
    a.click();
    URL.revokeObjectURL(url);
    const hintEl = $("zip-demo-hint");
    const pre = $("zip-demo-commands");
    const urlA = $("zip-demo-url");
    const cnt = $("zip-demo-count");
    if (hintEl && pre && urlA && cnt) {
      hintEl.hidden = false;
      cnt.textContent = String(meta.written_count ?? 0);
      const lw = meta.local_webapp;
      if (lw && lw.commands_posix) {
        pre.textContent = lw.commands_posix;
        urlA.href = lw.default_dev_url || "#";
        urlA.textContent = lw.default_dev_url || "http://localhost:5173";
      } else {
        pre.textContent =
          "# Bu pakette generated/webapp yok (farklı IR örneği seçin, örn. login flow).\n# ZIP içindeki diğer klasörleri inceleyin.";
        urlA.textContent = "—";
        urlA.removeAttribute("href");
      }
    }
    updateValidationBanner(
      true,
      true,
      "ZIP ready",
      `${meta.written_count ?? 0} file(s) — extract and use commands below for Vite when present.`
    );
    setStatus("ZIP indirildi · altta localhost komutları", "ok");
  } catch (e) {
    setStatus(String(e.message || e), "bad");
  }
});

$("btn-diagnostics").addEventListener("click", () => {
  runFullDiagnosticsFromEditor();
});

$("btn-preview-patch").addEventListener("click", async () => {
  setStatus("Previewing patch…", "neutral");
  const ir = parseJsonLabel(getIrText(), "IR bundle");
  const mut = parseJsonLabel(getMutationsText(), "Mutations");
  if (!ir.ok) {
    showParseHint(ir.error);
    setStatus("Fix IR JSON.", "bad");
    return;
  }
  if (!mut.ok) {
    setStatus(mut.error, "bad");
    return;
  }
  if (!Array.isArray(mut.data)) {
    setStatus("Mutations must be a JSON array.", "bad");
    return;
  }
  hideParseHint();
  try {
    const out = await fetchJSON("/api/preview-patch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ir_bundle: ir.data, mutations: mut.data }),
    });
    $("out-patch-preview").textContent = JSON.stringify(out, null, 2);
    setStatus(out.ok ? "Patch preview ready" : "Preview: issues reported", out.ok ? "ok" : "bad");
    setTab("patch-preview");
  } catch (e) {
    setStatus(String(e.message || e), "bad");
  }
});

$("btn-patch").addEventListener("click", async () => {
  setStatus("Applying mutations…", "neutral");
  const ir = parseJsonLabel(getIrText(), "IR bundle");
  const mut = parseJsonLabel(getMutationsText(), "Mutations");
  if (!ir.ok) {
    showParseHint(ir.error);
    setStatus("Fix IR JSON.", "bad");
    return;
  }
  if (!mut.ok) {
    setStatus(mut.error, "bad");
    return;
  }
  if (!Array.isArray(mut.data)) {
    setStatus("Mutations must be a JSON array.", "bad");
    return;
  }
  hideParseHint();
  try {
    const out = await fetchJSON("/api/ir/patch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ir_bundle: ir.data, mutations: mut.data }),
    });
    setIrText(JSON.stringify(out.ir_bundle, null, 2));
    $("out-diagnostics").textContent = formatDiagnosticsPanelText(out.diagnostics);
    setDiagnosticsVerdict(out.diagnostics || { ok: out.ok, issues: [] });
    setStatus(
      out.ok ? "Mutations applied · IR updated" : "Applied · diagnostics still failing",
      out.ok ? "ok" : "bad"
    );
    setTab("diagnostics");
  } catch (e) {
    setStatus(String(e.message || e), "bad");
  }
});

$("btn-ai").addEventListener("click", async () => {
  const prompt = ($("ai-prompt").value || "").trim();
  if (!prompt) {
    setStatus("Enter a prompt.", "bad");
    return;
  }
  setStatus("Requesting AI bundle…", "neutral");
  try {
    const out = await fetchJSON("/api/ai/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, max_retries: 3 }),
    });
    if (out.ok && out.ir_bundle) {
      setIrText(JSON.stringify(out.ir_bundle, null, 2));
      setStatus("AI bundle loaded into editor", "ok");
    } else {
      $("out-raw").textContent = JSON.stringify(out, null, 2);
      setStatus(
        out.code === "PX_AI_NO_KEY" ? "No OPENAI_API_KEY on server" : "AI did not return a valid bundle",
        "bad"
      );
      setTab("raw");
    }
  } catch (e) {
    setStatus(String(e.message || e), "bad");
  }
});

$("btn-guided").addEventListener("click", async () => {
  setStatus("Guided: diagnostics then pipeline…", "neutral");
  const demo = parseJsonLabel($("demo-inputs").value || "{}", "Demo inputs");
  if (!demo.ok) {
    setStatus(demo.error, "bad");
    return;
  }
  const ir = parseJsonLabel(getIrText(), "IR bundle");
  if (!ir.ok) {
    showParseHint(ir.error);
    setStatus("Fix JSON before guided run.", "bad");
    return;
  }
  hideParseHint();
  advanceWorkflow(2);
  try {
    const diag = await fetchJSON("/api/diagnostics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ir_bundle: ir.data }),
    });
    $("out-diagnostics").textContent = formatDiagnosticsPanelText(diag);
    setDiagnosticsVerdict(diag);
    setTab("diagnostics");
    advanceWorkflow(3);
    if (!diag.ok) {
      updateValidationBanner(
        true,
        false,
        "Guided: stopped at diagnostics",
        "Fix issues, then run pipeline or guided again."
      );
      setStatus("Guided stopped: fix diagnostics, then Run pipeline.", "bad");
      return;
    }
    const out = await fetchJSON("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ir_bundle: ir.data,
        demo_inputs: demo.data,
        engine_mode: $("engine-mode").value,
      }),
    });
    fillPipelineOutputPanels(out);
    setTab("validation");
    advanceWorkflow(4);
    setStatus(
      out.ir_valid ? "Guided complete · IR valid" : "Guided complete · validation issues in tab",
      out.ir_valid ? "ok" : "bad"
    );
  } catch (e) {
    setStatus(String(e.message || e), "bad");
  }
});

const _btnDemoTq = $("btn-demo-flagship-tq");
const _btnDemoIr = $("btn-demo-flagship-ir");
if (_btnDemoTq) {
  _btnDemoTq.addEventListener("click", async () => {
    try {
      const data = await fetchJSON("/api/demo/flagship-tq");
      savedTqText = data.source || "";
      setEditorMode("tq");
      if (useFallback) $("ir-editor-fallback").value = savedTqText;
      else if (irEditor) irEditor.setValue(savedTqText);
      setStatus("Flagship app.tq loaded", "ok");
      updateValidationBanner(
        true,
        true,
        "Flagship surface loaded",
        "Use “Compile → IR bundle” to run the validation gate on this demo."
      );
      advanceWorkflow(1);
    } catch (e) {
      setStatus(String(e.message || e), "bad");
    }
  });
}
if (_btnDemoIr) {
  _btnDemoIr.addEventListener("click", async () => {
    setStatus("Loading flagship…", "neutral");
    try {
      const data = await fetchJSON("/api/demo/flagship-tq");
      const j = await fetchJSON("/api/compile-tq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: data.source }),
      });
      $("out-diagnostics").textContent = j.diagnostics
        ? formatDiagnosticsPanelText(j.diagnostics)
        : JSON.stringify(j, null, 2);
      if (j.diagnostics && typeof j.diagnostics === "object") setDiagnosticsVerdict(j.diagnostics);
      else setDiagnosticsVerdict(j.ok);
      setTab("diagnostics");
      if (!j.ok) {
        const hint = j.hint ? ` ${j.hint}` : "";
        updateValidationBanner(true, false, "Flagship compile rejected", (j.message || j.code || "") + hint);
        setStatus(`${j.code || "tq"}: ${j.message || "failed"}`, "bad");
        return;
      }
      savedIrText = JSON.stringify(j.ir_bundle, null, 2);
      setEditorMode("ir");
      setIrText(savedIrText);
      const diagOk = !!(j.diagnostics && j.diagnostics.ok);
      updateValidationBanner(
        true,
        diagOk,
        "Flagship IR ready",
        diagOk ? "Run pipeline or Download ZIP for artifact tree." : "Review Diagnostics tab."
      );
      setStatus("Flagship compiled to IR", "ok");
      advanceWorkflow(2);
    } catch (e) {
      setStatus(String(e.message || e), "bad");
    }
  });
}

function initConsoleTheme() {
  const root = document.documentElement;
  if (root.getAttribute("data-torqa-surface") !== "web-console") return;
  const KEY = "torqa-web-console-theme";
  const saved = localStorage.getItem(KEY);
  if (saved === "light" || saved === "dark") {
    root.setAttribute("data-theme", saved);
  }
  const btn = $("btn-theme-toggle");
  if (btn) {
    btn.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      localStorage.setItem(KEY, next);
    });
  }
}

async function boot() {
  initConsoleTheme();
  try {
    await initMonaco();
  } catch (e) {
    console.error(e);
    enableTextareaFallback("Monaco editor could not load (network/CDN). Using plain textarea.");
  }

  try {
    await refreshDemoInsights();
    await refreshExamples();
    const firstRunDone = localStorage.getItem(CONSOLE_FIRST_RUN_KEY) === "1";
    if (firstRunDone) {
      const first = selectedExampleName();
      if (first && !useFallback) {
        const bundle = await fetchJSON(`/api/examples/${encodeURIComponent(first)}`);
        setIrText(JSON.stringify(bundle, null, 2));
        advanceWorkflow(2);
      }
    } else {
      showConsoleFirstRunOverlay();
    }
    refreshWorkflowUI();
    setStatus("Ready", "ok");
  } catch (e) {
    setStatus(String(e.message || e), "bad");
  }
}

(function initConsoleFirstRunUi() {
  const bSample = $("btn-console-first-run-sample");
  const bDemo = $("btn-console-first-run-demo");
  const bDismiss = $("btn-console-first-run-dismiss");
  if (!bSample || !bDemo || !bDismiss) return;

  bSample.addEventListener("click", async () => {
    try {
      await loadConsoleSampleProject();
      updateValidationBanner(
        true,
        true,
        "Sample loaded",
        "Use Full diagnostics or Run pipeline from the toolbar."
      );
      consoleFirstRunDone();
      setStatus("Sample in editor · try Full diagnostics or Run pipeline", "ok");
    } catch (e) {
      setStatus(String(e.message || e), "bad");
    }
  });

  bDemo.addEventListener("click", async () => {
    try {
      await consoleFirstRunQuickDemo();
      consoleFirstRunDone();
    } catch (e) {
      setStatus(String(e.message || e), "bad");
    }
  });

  bDismiss.addEventListener("click", async () => {
    consoleFirstRunDone();
    try {
      const first = selectedExampleName();
      if (first && !useFallback) {
        const bundle = await fetchJSON(`/api/examples/${encodeURIComponent(first)}`);
        setIrText(JSON.stringify(bundle, null, 2));
        hideParseHint();
        advanceWorkflow(2);
      }
    } catch (e) {
      setStatus(String(e.message || e), "bad");
      return;
    }
    setStatus("Ready · examples in the sidebar", "ok");
  });
})();

boot();
