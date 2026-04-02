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
  $("out-diagnostics").textContent = JSON.stringify(out.diagnostics || {}, null, 2);
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
      note: "Not only website: check generated/sql, generated/rust, generated/python, etc. when using torqa demo.",
      artifacts: summary,
    },
    null,
    2
  );
  $("out-execution-trace").textContent = JSON.stringify(out.execution_trace || {}, null, 2);
  $("out-raw").textContent = JSON.stringify(out, null, 2);
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
      $("out-diagnostics").textContent = JSON.stringify(j, null, 2);
      setTab("diagnostics");
      if (!j.ok) {
        setStatus(`${j.code || "tq"}: ${j.message || "compile failed"}`, "bad");
        return;
      }
      savedIrText = JSON.stringify(j.ir_bundle, null, 2);
      setEditorMode("ir");
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
      const t = await res.text();
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
    setStatus("ZIP indirildi · altta localhost komutları", "ok");
  } catch (e) {
    setStatus(String(e.message || e), "bad");
  }
});

$("btn-diagnostics").addEventListener("click", async () => {
  setStatus("Running diagnostics…", "neutral");
  const ir = parseJsonLabel(getIrText(), "IR bundle");
  if (!ir.ok) {
    showParseHint(ir.error);
    setStatus("Fix JSON first.", "bad");
    return;
  }
  hideParseHint();
  try {
    const out = await fetchJSON("/api/diagnostics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ir_bundle: ir.data }),
    });
    $("out-diagnostics").textContent = JSON.stringify(out, null, 2);
    setStatus(out.ok ? "Diagnostics clean" : "Issues found · see Diagnostics tab", out.ok ? "ok" : "bad");
    setTab("diagnostics");
    advanceWorkflow(3);
  } catch (e) {
    setStatus(String(e.message || e), "bad");
  }
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
    $("out-diagnostics").textContent = JSON.stringify(out.diagnostics, null, 2);
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
    $("out-diagnostics").textContent = JSON.stringify(diag, null, 2);
    setTab("diagnostics");
    advanceWorkflow(3);
    if (!diag.ok) {
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

async function boot() {
  try {
    await initMonaco();
  } catch (e) {
    console.error(e);
    enableTextareaFallback("Monaco editor could not load (network/CDN). Using plain textarea.");
  }

  try {
    await refreshExamples();
    const first = selectedExampleName();
    if (first && !useFallback) {
      const bundle = await fetchJSON(`/api/examples/${encodeURIComponent(first)}`);
      setIrText(JSON.stringify(bundle, null, 2));
      advanceWorkflow(2);
    }
    refreshWorkflowUI();
    setStatus("Ready", "ok");
  } catch (e) {
    setStatus(String(e.message || e), "bad");
  }
}

boot();
