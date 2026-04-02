(function () {
  const $ = (id) => document.getElementById(id);

  const workspacePathEl = $("workspace-path");
  const readyList = $("ready-list");
  const promptInput = $("prompt-input");
  const bundlePreview = $("bundle-preview");
  const btnFolder = $("btn-folder");
  const btnSuggest = $("btn-suggest");
  const btnWrite = $("btn-write");
  const btnMaterialize = $("btn-materialize");
  const msgEl = $("desk-message");
  const versionEl = $("desk-version");

  let workspace = "";
  let lastBundle = null;

  const hasPyWebview = () =>
    typeof window.pywebview !== "undefined" && window.pywebview.api;

  function setMessage(text, kind) {
    msgEl.textContent = text || "";
    msgEl.className = "desk-message" + (kind ? " " + kind : "");
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

  btnFolder.addEventListener("click", async () => {
    setMessage("");
    if (!hasPyWebview()) {
      setMessage(
        "Klasör seçimi için masaüstü uygulamasını kullanın: python -m desktop",
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
        btnWrite.disabled = !lastBundle;
        btnMaterialize.disabled = !lastBundle;
      }
    } catch (e) {
      setMessage(String(e), "err");
    }
  });

  btnSuggest.addEventListener("click", async () => {
    setMessage("");
    bundlePreview.value = "";
    lastBundle = null;
    btnWrite.disabled = true;
    btnMaterialize.disabled = true;
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
        setMessage(
          "IR üretildi. Klasör seçtiyseniz «Projeyi klasöre yaz» veya «Üretim ağacı yaz».",
          "ok"
        );
        btnWrite.disabled = !workspace;
        btnMaterialize.disabled = !workspace;
      } else {
        const issues = (data.issues || [])
          .map((i) => i.message || i.code || JSON.stringify(i))
          .join(" · ");
        setMessage(issues || "AI yanıtı başarısız.", "err");
        if (data.ir_bundle) {
          lastBundle = data.ir_bundle;
          bundlePreview.value = JSON.stringify(data.ir_bundle, null, 2);
        }
      }
    } catch (e) {
      setMessage(String(e), "err");
    } finally {
      btnSuggest.disabled = false;
    }
  });

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
        setMessage(
          "Üretim ağacı: " + (res.written_under || "") + " (" + (res.file_count || 0) + " dosya)",
          "ok"
        );
      } else {
        setMessage(res.error || "Materialize hatası", "err");
      }
    } catch (e) {
      setMessage(String(e), "err");
    }
  });

  loadReady();
})();
