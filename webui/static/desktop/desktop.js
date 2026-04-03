(function () {
  const $ = (id) => document.getElementById(id);

  const workspacePathEl = $("workspace-path");
  const readyList = $("ready-list");
  const promptInput = $("prompt-input");
  const bundlePreview = $("bundle-preview");
  const btnFolder = $("btn-folder");
  const btnSuggest = $("btn-suggest");
  const btnWrite = $("btn-write");
  const btnValidate = $("btn-validate");
  const btnMaterialize = $("btn-materialize");
  const msgEl = $("desk-message");
  const versionEl = $("desk-version");
  const deskDemoMetrics = $("desk-demo-metrics");
  const deskGateSummary = $("desk-gate-summary");
  const deskValidationChip = $("desk-validation-chip");
  const btnDeskFlagship = $("btn-desk-flagship");
  const btnDeskMinimalSample = $("btn-desk-minimal-sample");

  let workspace = "";
  let lastBundle = null;

  const DESKTOP_FIRST_RUN_KEY = "torqa-desktop-first-run-v1";

  function deskFirstRunState() {
    return localStorage.getItem(DESKTOP_FIRST_RUN_KEY) || "";
  }

  function deskFirstRunSetCollapsed() {
    localStorage.setItem(DESKTOP_FIRST_RUN_KEY, "collapsed");
  }

  function deskFirstRunSetHidden() {
    localStorage.setItem(DESKTOP_FIRST_RUN_KEY, "hidden");
  }

  function deskFirstRunClear() {
    localStorage.removeItem(DESKTOP_FIRST_RUN_KEY);
  }

  function applyDeskFirstRunLayout() {
    const root = $("desk-trial-welcome");
    const exp = $("desk-first-run-expanded");
    const col = $("desk-first-run-collapsed");
    if (!root || !exp) return;
    const st = deskFirstRunState();
    root.classList.toggle("ide-first-run-root--gone", st === "hidden");
    if (st === "hidden") return;
    const collapsed = st === "collapsed";
    exp.hidden = collapsed;
    if (col) col.hidden = !collapsed;
  }

  async function fetchMinimalSampleBundle() {
    const ir = await fetch("/api/examples/valid_minimal_flow.json");
    if (!ir.ok) throw new Error("examples API failed");
    return ir.json();
  }

  async function loadDeskSampleProjectOnly() {
    setMessage("");
    setDeskValidationChip("Loading sample…", "");
    const bundle = await fetchMinimalSampleBundle();
    lastBundle = bundle;
    bundlePreview.value = JSON.stringify(bundle, null, 2);
    setDeskValidationChip("Sample: in editor", "ok");
    setMessage("Sample loaded — click 1 · Validate IR, then Open folder… for Build.", "ok");
    setDiagnosticsPre("Editor has the sample bundle. Click 1 · Validate IR to run checks (no disk write).", null);
    selectBottomTab("output");
    syncActionButtons();
  }

  async function loadDeskMinimalWithDiagnostics(origin) {
    const isDemo = origin === "first-run-demo";
    setMessage("");
    setDeskValidationChip("Loading minimal sample…", "");
    const bundle = await fetchMinimalSampleBundle();
    const cr = await fetch("/api/diagnostics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ir_bundle: bundle }),
    });
    if (!cr.ok) {
      const t = await cr.text();
      throw new Error(t || "diagnostics failed");
    }
    const rep = await cr.json();
    const diagOk = !!rep.ok;
    lastBundle = bundle;
    bundlePreview.value = JSON.stringify(bundle, null, 2);
    setDeskValidationChip(
      diagOk
        ? isDemo
          ? "Quick demo: validation OK"
          : "Minimal IR: diagnostics pass"
        : isDemo
          ? "Quick demo: see Diagnostics"
          : "Minimal IR: check diagnostics",
      diagOk ? "ok" : "err"
    );
    setMessage(
      diagOk
        ? isDemo
          ? "Quick demo done — validation passed. Open a folder to run Build."
          : "Minimal sample loaded — run 1 · Validate IR or pick a folder and 2 · Build."
        : isDemo
          ? "Quick demo: validation reported issues — see Diagnostics."
          : "Minimal sample: see Diagnostics for issues.",
      diagOk ? "ok" : "err"
    );
    if (isDemo) selectBottomTab("diagnostics");
    else selectBottomTab(diagOk ? "output" : "diagnostics");
    setDiagnosticsPre(formatDiagnosticReport(rep), diagOk ? "ok" : "err");
    syncActionButtons();
  }

  function initDeskFirstRun() {
    const root = $("desk-trial-welcome");
    const exp = $("desk-first-run-expanded");
    const bSample = $("btn-desk-first-run-sample");
    const bDemo = $("btn-desk-first-run-demo");
    const bDismiss = $("btn-desk-first-run-dismiss");
    const bRestore = $("btn-desk-first-run-restore");
    if (!root || !exp) return;

    applyDeskFirstRunLayout();

    if (bRestore) {
      bRestore.addEventListener("click", () => {
        deskFirstRunClear();
        applyDeskFirstRunLayout();
      });
    }
    if (bDismiss) {
      bDismiss.addEventListener("click", () => {
        deskFirstRunSetCollapsed();
        applyDeskFirstRunLayout();
      });
    }
    if (bSample) {
      bSample.addEventListener("click", async () => {
        try {
          await loadDeskSampleProjectOnly();
          deskFirstRunSetHidden();
          applyDeskFirstRunLayout();
        } catch (e) {
          setDeskValidationChip("", "");
          setMessage(String(e), "err");
        }
      });
    }
    if (bDemo) {
      bDemo.addEventListener("click", async () => {
        try {
          await loadDeskMinimalWithDiagnostics("first-run-demo");
          deskFirstRunSetHidden();
          applyDeskFirstRunLayout();
        } catch (e) {
          setDeskValidationChip("", "");
          setMessage(String(e), "err");
        }
      });
    }
  }

  const hasPyWebview = () =>
    typeof window.pywebview !== "undefined" && window.pywebview.api;

  function setMessage(text, kind) {
    msgEl.textContent = text || "";
    msgEl.className = "desk-message" + (kind ? " " + kind : "");
  }

  function setDeskValidationChip(text, kind) {
    if (!deskValidationChip) return;
    deskValidationChip.textContent = text || "";
    deskValidationChip.className = "ide-chip" + (kind === "ok" ? " ok" : kind === "err" ? " err" : "");
  }

  function setDiagnosticsPre(text, kind) {
    const el = $("desk-diagnostics-pre");
    const verdict = $("desk-diagnostics-verdict");
    if (!el) return;
    el.textContent = text || "";
    el.classList.remove("diag-ok", "diag-err");
    if (kind === "ok") el.classList.add("diag-ok");
    else if (kind === "err") el.classList.add("diag-err");
    if (verdict) {
      if (kind === "ok") {
        verdict.hidden = false;
        verdict.className = "ide-diag-verdict ide-diag-verdict--pass";
        verdict.textContent = "PASS — validation OK (see details below)";
      } else if (kind === "err") {
        verdict.hidden = false;
        verdict.className = "ide-diag-verdict ide-diag-verdict--fail";
        verdict.textContent = "FAIL — validation issues (see details below)";
      } else {
        verdict.hidden = true;
        verdict.textContent = "";
        verdict.className = "ide-diag-verdict";
      }
    }
  }

  function formatDiagnosticReport(rep) {
    if (!rep || typeof rep !== "object") return "";
    const lines = [];
    lines.push("validation_ok: " + !!rep.ok);
    const summary = rep.summary;
    if (summary && typeof summary === "object" && Object.keys(summary).length)
      lines.push("summary: " + JSON.stringify(summary));
    const issues = rep.issues || [];
    if (issues.length) {
      lines.push("");
      lines.push("Issues (blocking):");
      issues.forEach((it, i) => {
        if (it && typeof it === "object") {
          const code = it.code || "?";
          const msg = it.message || "";
          const phase = it.phase || it.formal_phase || "";
          lines.push("  " + (i + 1) + ". [" + code + "] (" + phase + ") " + msg);
        } else lines.push("  " + (i + 1) + ". " + it);
      });
    }
    const warns = rep.warnings || [];
    if (warns.length) {
      lines.push("");
      lines.push("Warnings:");
      warns.forEach((w, i) => {
        if (w && typeof w === "object")
          lines.push("  " + (i + 1) + ". [" + (w.code || "?") + "] " + (w.message || w));
        else lines.push("  " + (i + 1) + ". " + w);
      });
    }
    if (!issues.length && !warns.length && rep.ok) {
      lines.push("");
      lines.push("No blocking issues.");
    }
    return lines.join("\n");
  }

  function syncActionButtons() {
    const raw = ((bundlePreview && bundlePreview.value) || "").trim();
    const hasBundle = !!lastBundle || raw.length > 0;
    if (btnValidate) btnValidate.disabled = !hasBundle;
    if (btnWrite) btnWrite.disabled = !workspace || !lastBundle;
    if (btnMaterialize) btnMaterialize.disabled = !workspace || !hasBundle;
  }

  function selectBottomTab(name) {
    document.querySelectorAll(".ide-panel-tab").forEach((b) => {
      const on = b.getAttribute("data-bottom-tab") === name;
      b.classList.toggle("active", on);
    });
    const out = $("ide-bottom-output");
    const diag = $("ide-bottom-diagnostics");
    if (out) out.classList.toggle("active", name === "output");
    if (diag) diag.classList.toggle("active", name === "diagnostics");
  }

  function initDesktopChrome() {
    const root = document.documentElement;
    if (root.getAttribute("data-torqa-surface") !== "desktop-editor") return;
    const KEY = "torqa-desktop-theme";
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);
    const th = $("ide-theme-toggle");
    if (th) {
      th.addEventListener("click", () => {
        const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        localStorage.setItem(KEY, next);
      });
    }
    document.querySelectorAll(".ide-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const n = tab.getAttribute("data-editor-tab");
        document.querySelectorAll(".ide-tab").forEach((t) => {
          const on = t === tab;
          t.classList.toggle("active", on);
          t.setAttribute("aria-selected", on ? "true" : "false");
        });
        const ir = $("ide-pane-ir");
        const pr = $("ide-pane-prompt");
        if (ir) ir.classList.toggle("active", n === "ir");
        if (pr) pr.classList.toggle("active", n === "prompt");
      });
    });
    document.querySelectorAll(".ide-panel-tab").forEach((b) => {
      b.addEventListener("click", () => selectBottomTab(b.getAttribute("data-bottom-tab") || "output"));
    });
  }

  async function loadDemoPanels() {
    if (deskDemoMetrics) {
      try {
        const r = await fetch("/api/demo/benchmark-report");
        const d = await r.json();
        if (
          typeof torqaRenderBenchmarkPanel === "function" &&
          d.ok &&
          d.report &&
          d.report.metrics
        ) {
          const html = torqaRenderBenchmarkPanel(d.report.metrics);
          deskDemoMetrics.innerHTML =
            html || '<p class="tq-bm-fallback">P32 · incomplete benchmark metrics</p>';
        } else if (!d.ok && d.message) {
          deskDemoMetrics.innerHTML =
            '<p class="tq-bm-fallback">P32 · ' + String(d.message).replace(/</g, "&lt;") + "</p>";
        } else {
          deskDemoMetrics.innerHTML =
            '<p class="tq-bm-fallback">P32 · benchmark report missing</p>';
        }
      } catch (e) {
        deskDemoMetrics.innerHTML = '<p class="tq-bm-fallback">P32 · could not load</p>';
      }
    }
    if (deskGateSummary) {
      try {
        const r = await fetch("/api/demo/gate-proof-report");
        const g = await r.json();
        if (g.ok && g.report && g.report.summary) {
          const s = g.report.summary;
          const by = s.rejections_by_stage || {};
          deskGateSummary.textContent =
            `P33 · gate: ${s.accepted} ok · ${s.rejected} rejected (parse ${by.parse || 0} · validate ${by.validate || 0} · project ${by.project || 0})\n` +
            `Expectation mismatches: ${s.mismatch_with_expectation}`;
        } else {
          deskGateSummary.textContent = "P33 · gate report missing";
        }
      } catch (e) {
        deskGateSummary.textContent = "P33 · could not load";
      }
    }
  }

  function statusRow(label, ok, warn) {
    const li = document.createElement("li");
    const dot = document.createElement("span");
    dot.className = "dot " + (ok ? "ok" : warn ? "warn" : "bad");
    li.appendChild(dot);
    li.appendChild(document.createTextNode(label));
    return li;
  }

  async function loadReady() {
    readyList.innerHTML = "";
    try {
      const r = await fetch("/api/desktop/ready");
      const d = await r.json();
      if (versionEl) {
        versionEl.textContent =
          "v" + (d.package_version || "?") + " · IR " + (d.canonical_ir_version || "?");
      }
      readyList.appendChild(
        statusRow(
          d.openai_configured ? "OpenAI API anahtarı tanımlı" : "OPENAI_API_KEY eksik (AI kapalı)",
          d.openai_configured,
          !d.openai_configured
        )
      );
      readyList.appendChild(
        statusRow(
          d.jsonschema_available
            ? "jsonschema yüklü (şema kontrolü)"
            : "jsonschema yok (şema kontrolü sınırlı)",
          d.jsonschema_available,
          !d.jsonschema_available
        )
      );
    } catch (e) {
      readyList.appendChild(statusRow("Durum alınamadı", false, false));
    }
  }

  if (bundlePreview) {
    bundlePreview.addEventListener("input", () => syncActionButtons());
  }

  btnFolder.addEventListener("click", async () => {
    setMessage("");
    if (!hasPyWebview()) {
      setMessage(
        "Klasör seçimi için native masaüstü: torqa-desktop (Electron) veya legacy: python -m desktop_legacy --tk",
        "err"
      );
      return;
    }
    try {
      const p = await window.pywebview.api.select_workspace_folder();
      if (p) {
        workspace = p;
        workspacePathEl.textContent = p;
        workspacePathEl.classList.add("mono");
        syncActionButtons();
      }
    } catch (e) {
      setMessage(String(e), "err");
    }
  });

  btnSuggest.addEventListener("click", async () => {
    setMessage("");
    bundlePreview.value = "";
    lastBundle = null;
    syncActionButtons();
    const prompt = (promptInput.value || "").trim();
    if (!prompt) {
      setMessage("Lütfen bir prompt yazın.", "err");
      return;
    }
    btnSuggest.disabled = true;
    try {
      const r = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, max_retries: 3 }),
      });
      const data = await r.json();
      if (data.ok && data.ir_bundle) {
        lastBundle = data.ir_bundle;
        bundlePreview.value = JSON.stringify(data.ir_bundle, null, 2);
        setDeskValidationChip("AI bundle: run Validate IR", "ok");
        setMessage(
          "IR ready. Use 1 · Validate IR (no disk write), then pick a folder and 2 · Build.",
          "ok"
        );
        setDiagnosticsPre("Run 1 · Validate IR to check this bundle before building.", null);
        selectBottomTab("output");
        syncActionButtons();
      } else {
        const issues = (data.issues || [])
          .map((i) => i.message || i.code || JSON.stringify(i))
          .join(" · ");
        setMessage(issues || "AI yanıtı başarısız.", "err");
        setDiagnosticsPre(issues || JSON.stringify(data, null, 2), "err");
        selectBottomTab("diagnostics");
        if (data.ir_bundle) {
          lastBundle = data.ir_bundle;
          bundlePreview.value = JSON.stringify(data.ir_bundle, null, 2);
        }
        syncActionButtons();
      }
    } catch (e) {
      setMessage(String(e), "err");
    } finally {
      btnSuggest.disabled = false;
    }
  });

  if (btnValidate) {
    btnValidate.addEventListener("click", async () => {
      setMessage("");
      let bundle = lastBundle;
      try {
        const raw = (bundlePreview.value || "").trim();
        if (raw) bundle = JSON.parse(raw);
      } catch (e) {
        setMessage("Invalid JSON in IR editor.", "err");
        setDiagnosticsPre(String(e), "err");
        selectBottomTab("diagnostics");
        return;
      }
      if (!bundle || typeof bundle !== "object") {
        setMessage("Load or paste an IR bundle first.", "err");
        return;
      }
      lastBundle = bundle;
      try {
        const r = await fetch("/api/diagnostics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ir_bundle: bundle }),
        });
        if (!r.ok) {
          const t = await r.text();
          setDeskValidationChip("Validate: request failed", "err");
          setMessage(t || "Diagnostics request failed.", "err");
          setDiagnosticsPre(t || "HTTP " + r.status, "err");
          selectBottomTab("diagnostics");
          return;
        }
        const rep = await r.json();
        const ok = !!rep.ok;
        setDeskValidationChip(ok ? "Validate: OK" : "Validate: failed — see Diagnostics", ok ? "ok" : "err");
        setMessage(ok ? "Validation passed. You can Build when a folder is selected." : "Validation failed — see Diagnostics tab.", ok ? "ok" : "err");
        setDiagnosticsPre(formatDiagnosticReport(rep), ok ? "ok" : "err");
        selectBottomTab("diagnostics");
      } catch (e) {
        setDeskValidationChip("Validate: error", "err");
        setMessage(String(e), "err");
        setDiagnosticsPre(String(e), "err");
        selectBottomTab("diagnostics");
      }
    });
  }

  btnWrite.addEventListener("click", async () => {
    setMessage("");
    if (!hasPyWebview()) {
      setMessage("Yazma için masaüstü uygulaması gerekir.", "err");
      return;
    }
    if (!workspace) {
      setMessage("Önce klasör seçin.", "err");
      return;
    }
    if (!lastBundle) {
      setMessage("Önce geçerli bir IR üretin.", "err");
      return;
    }
    try {
      const jsonStr = JSON.stringify(lastBundle);
      const res = await window.pywebview.api.write_flow_project(workspace, jsonStr);
      if (res.ok) {
        setMessage("Kaydedildi: " + (res.dir || ""), "ok");
      } else {
        setMessage(res.error || "Yazma hatası", "err");
      }
    } catch (e) {
      setMessage(String(e), "err");
    }
  });

  btnMaterialize.addEventListener("click", async () => {
    setMessage("");
    if (!hasPyWebview()) {
      setMessage("Yazma için masaüstü uygulaması gerekir.", "err");
      return;
    }
    if (!workspace) {
      setMessage("Önce klasör seçin.", "err");
      return;
    }
    let bundle = lastBundle;
    try {
      const raw = (bundlePreview.value || "").trim();
      if (raw) bundle = JSON.parse(raw);
    } catch (e) {
      setMessage("Önizlemede geçerli JSON yok.", "err");
      return;
    }
    if (!bundle || typeof bundle !== "object") {
      setMessage("Önce geçerli bir IR üretin.", "err");
      return;
    }
    try {
      const jsonStr = JSON.stringify(bundle);
      const res = await window.pywebview.api.materialize_project(workspace, jsonStr);
      if (res.ok) {
        setDeskValidationChip("Build: OK · " + (res.file_count || 0) + " files", "ok");
        selectBottomTab("output");
        setDiagnosticsPre(
          "Build succeeded.\nFiles written: " +
            (res.file_count || 0) +
            "\nPath:\n" +
            (res.written_under || ""),
          "ok"
        );
        setMessage(
          "Build: " + (res.written_under || "") + " (" + (res.file_count || 0) + " files)",
          "ok"
        );
      } else {
        const isVal = res.error && String(res.error).includes("Doğrulama");
        setDeskValidationChip(isVal ? "Build: validation rejected" : "Build: failed", "err");
        setMessage((res.error || "Build failed") + " — see Diagnostics.", "err");
        const parts = [];
        if (Array.isArray(res.errors) && res.errors.length)
          parts.push(res.errors.slice(0, 12).map(String).join("\n"));
        if (res.diagnostics && typeof res.diagnostics === "object")
          parts.push(formatDiagnosticReport(res.diagnostics));
        if (!parts.length) parts.push(String(res.error || ""));
        setDiagnosticsPre(parts.join("\n\n"), "err");
        selectBottomTab("diagnostics");
      }
    } catch (e) {
      setMessage(String(e), "err");
    }
  });

  function applyBundleFromCompile(j, label) {
    if (!j.ok) {
      setDeskValidationChip(label + ": rejected", "err");
      setMessage(j.message || j.code || "compile failed", "err");
      if (j.diagnostics && typeof j.diagnostics === "object")
        setDiagnosticsPre(formatDiagnosticReport(j.diagnostics), "err");
      else setDiagnosticsPre(JSON.stringify(j, null, 2), "err");
      selectBottomTab("diagnostics");
      bundlePreview.value = JSON.stringify(j, null, 2);
      syncActionButtons();
      return;
    }
    lastBundle = j.ir_bundle;
    bundlePreview.value = JSON.stringify(j.ir_bundle, null, 2);
    const diagOk = !!(j.diagnostics && j.diagnostics.ok);
    setDeskValidationChip(
      diagOk ? label + ": diagnostics pass" : label + ": check diagnostics",
      diagOk ? "ok" : "err"
    );
    setMessage(
      label + " loaded — run 1 · Validate IR or pick a folder and 2 · Build.",
      "ok"
    );
    if (j.diagnostics && typeof j.diagnostics === "object")
      setDiagnosticsPre(formatDiagnosticReport(j.diagnostics), diagOk ? "ok" : "err");
    selectBottomTab(diagOk ? "output" : "diagnostics");
    syncActionButtons();
  }

  if (btnDeskFlagship) {
    btnDeskFlagship.addEventListener("click", async () => {
      setMessage("");
      setDeskValidationChip("Loading flagship…", "");
      try {
        const fr = await fetch("/api/demo/flagship-tq");
        if (!fr.ok) throw new Error("flagship-tq failed");
        const tqData = await fr.json();
        const cr = await fetch("/api/compile-tq", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: tqData.source }),
        });
        const j = await cr.json();
        applyBundleFromCompile(j, "Flagship");
      } catch (e) {
        setDeskValidationChip("", "");
        setMessage(String(e), "err");
      }
    });
  }

  if (btnDeskMinimalSample) {
    btnDeskMinimalSample.addEventListener("click", async () => {
      try {
        await loadDeskMinimalWithDiagnostics("sidebar");
      } catch (e) {
        setDeskValidationChip("", "");
        setMessage(String(e), "err");
      }
    });
  }

  initDesktopChrome();
  initDeskFirstRun();
  loadReady();
  loadDemoPanels();
  syncActionButtons();
})();
