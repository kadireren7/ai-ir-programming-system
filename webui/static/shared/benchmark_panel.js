/**
 * P32: render flagship compression metrics with visible token reduction (console + desktop + site).
 */
(function (w) {
  "use strict";

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  /**
   * @param {Record<string, unknown>} m - report.metrics from /api/demo/benchmark-report
   * @returns {string} HTML fragment (numeric fields only — safe for innerHTML)
   */
  function torqaRenderBenchmarkPanel(m) {
    const task = Number(m.task_prompt_token_estimate);
    const tq = Number(m.torqa_source_token_estimate);
    if (!Number.isFinite(task) || !Number.isFinite(tq) || task < 1) return "";
    const ratioRaw = Number(m.semantic_compression_ratio);
    const ratio = Number.isFinite(ratioRaw) && ratioRaw > 0 ? ratioRaw : task / Math.max(1, tq);
    const saved = Math.max(0, Math.round(task - tq));
    const surfacePct = Math.min(100, Math.round((tq / task) * 100));
    const tqBarW = Math.min(100, (tq / task) * 100);
    const rStr = ratio >= 10 ? ratio.toFixed(1) : ratio.toFixed(2);
    const taskR = Math.round(task);
    const tqR = Math.round(tq);
    return (
      '<div class="tq-bm-panel">' +
      '<div class="tq-bm-head">P32 · Token reduction (est.)</div>' +
      '<div class="tq-bm-hero"><span class="tq-bm-ratio">' +
      esc(rStr) +
      '×</span> <span class="tq-bm-hero-sub">.tq vs NL task</span></div>' +
      '<p class="tq-bm-savings"><strong>' +
      esc(String(saved)) +
      '</strong> fewer tokens — surface is <strong>' +
      esc(String(surfacePct)) +
      '%</strong> of task size</p>' +
      '<div class="tq-bm-bars" aria-hidden="true">' +
      '<div class="tq-bm-bar-row"><span class="tq-bm-bar-lab">NL task</span><div class="tq-bm-track"><div class="tq-bm-fill tq-bm-fill-nl" style="width:100%"></div></div><span class="tq-bm-bar-num">' +
      esc(String(taskR)) +
      '</span></div>' +
      '<div class="tq-bm-bar-row"><span class="tq-bm-bar-lab">.tq</span><div class="tq-bm-track"><div class="tq-bm-fill tq-bm-fill-tq" style="width:' +
      esc(String(tqBarW)) +
      '%"></div></div><span class="tq-bm-bar-num">' +
      esc(String(tqR)) +
      "</span></div>" +
      "</div>" +
      '<p class="tq-bm-note">Flagship baseline · utf8÷4 token estimate</p>' +
      "</div>"
    );
  }

  w.torqaRenderBenchmarkPanel = torqaRenderBenchmarkPanel;
})(typeof window !== "undefined" ? window : globalThis);
