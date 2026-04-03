"""
Tkinter masaüstü kabuğu: pywebview kurulamazsa veya ``--tk`` ile kullanılır.
Sunucu gerektirmez; AI ve dosya yazma doğrudan Python ile yapılır.
"""

from __future__ import annotations

import json
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, scrolledtext
from tkinter import font as tkfont

from src.ai.adapter import suggest_ir_bundle_from_prompt

from desktop_legacy.workspace_io import materialize_bundle_to_workspace, write_flow_project
from src.project_materialize import validate_stage

REPO_ROOT = Path(__file__).resolve().parents[1]
_FLAGSHIP_TQ = REPO_ROOT / "examples" / "benchmark_flagship" / "app.tq"
_MINIMAL_IR_JSON = REPO_ROOT / "examples" / "core" / "valid_minimal_flow.json"
_BENCH_JSON = REPO_ROOT / "examples" / "benchmark_flagship" / "compression_baseline_report.json"
_GATE_MANIFEST = REPO_ROOT / "examples" / "benchmark_flagship" / "gate_invalid" / "manifest.json"


def _format_diagnostic_report(rep: dict) -> str:
    """Human-readable summary for the diagnostics panel."""
    lines: list[str] = []
    lines.append(f"validation_ok: {rep.get('ok', False)}")
    summary = rep.get("summary") or {}
    if summary:
        lines.append(f"summary: {json.dumps(summary, ensure_ascii=False)}")
    issues = rep.get("issues") or []
    if issues:
        lines.append("")
        lines.append("Issues (blocking):")
        for i, it in enumerate(issues, 1):
            if isinstance(it, dict):
                code = it.get("code") or "?"
                msg = it.get("message") or ""
                phase = it.get("phase") or it.get("formal_phase") or ""
                lines.append(f"  {i}. [{code}] ({phase}) {msg}")
            else:
                lines.append(f"  {i}. {it}")
    warns = rep.get("warnings") or []
    if warns:
        lines.append("")
        lines.append("Warnings:")
        for i, w in enumerate(warns, 1):
            if isinstance(w, dict):
                lines.append(f"  {i}. [{w.get('code', '?')}] {w.get('message', w)}")
            else:
                lines.append(f"  {i}. {w}")
    if not issues and not warns and rep.get("ok"):
        lines.append("")
        lines.append("No blocking issues.")
    return "\n".join(lines)


def run_tk_desktop() -> None:
    workspace: list[str] = [""]
    last_bundle: list[dict | None] = [None]

    root = tk.Tk()
    root.title("TORQA Desktop (Tk)")
    root.minsize(880, 560)
    root.geometry("1100x720")
    root.configure(bg="#1e1e1e")

    mono = tkfont.nametofont("TkFixedFont")
    try:
        mono.configure(family="Consolas", size=10)
    except tk.TclError:
        pass

    # —— Sol panel ——
    side = tk.Frame(root, bg="#252526", width=280)
    side.pack(side=tk.LEFT, fill=tk.Y)
    side.pack_propagate(False)

    tk.Label(
        side,
        text="TORQA",
        fg="#cccccc",
        bg="#252526",
        font=("Segoe UI", 14, "bold"),
    ).pack(anchor=tk.W, padx=14, pady=(16, 4))
    tk.Label(
        side,
        text="Desktop · Tk modu",
        fg="#858585",
        bg="#252526",
        font=("Segoe UI", 9),
    ).pack(anchor=tk.W, padx=14, pady=(0, 8))

    tk.Label(
        side,
        text="FIRST RUN",
        fg="#858585",
        bg="#252526",
        font=("Segoe UI", 8, "bold"),
    ).pack(anchor=tk.W, padx=14, pady=(4, 4))

    btn_tk_first_sample = tk.Button(
        side,
        text="Sample project",
        state=tk.DISABLED,
        bg="#3c3c3c",
        fg="#cccccc",
        activebackground="#505050",
        activeforeground="#cccccc",
        relief=tk.FLAT,
        padx=12,
        pady=6,
    )
    btn_tk_first_sample.pack(fill=tk.X, padx=12, pady=(0, 4))

    btn_tk_first_demo = tk.Button(
        side,
        text="Quick demo (load + validate)",
        state=tk.DISABLED,
        bg="#0e639c",
        fg="white",
        activebackground="#1177bb",
        activeforeground="white",
        relief=tk.FLAT,
        padx=12,
        pady=6,
    )
    btn_tk_first_demo.pack(fill=tk.X, padx=12, pady=(0, 8))

    tk.Label(
        side,
        text="ÇALIŞMA KLASÖRÜ",
        fg="#858585",
        bg="#252526",
        font=("Segoe UI", 8, "bold"),
    ).pack(anchor=tk.W, padx=14)

    path_var = tk.StringVar(value="Henüz seçilmedi")

    def pick_folder() -> None:
        p = filedialog.askdirectory(title="Proje klasörü seçin")
        if p:
            workspace[0] = p
            path_var.set(p)

    tk.Button(
        side,
        text="Klasör seç…",
        command=pick_folder,
        bg="#0e639c",
        fg="white",
        activebackground="#1177bb",
        activeforeground="white",
        relief=tk.FLAT,
        padx=12,
        pady=8,
    ).pack(fill=tk.X, padx=12, pady=8)

    tk.Label(
        side,
        textvariable=path_var,
        fg="#858585",
        bg="#252526",
        font=mono,
        wraplength=250,
        justify=tk.LEFT,
    ).pack(anchor=tk.W, padx=12, pady=(0, 20))

    tk.Label(
        side,
        text="DEMO (P31 · P33)",
        fg="#858585",
        bg="#252526",
        font=("Segoe UI", 8, "bold"),
    ).pack(anchor=tk.W, padx=14, pady=(12, 4))

    demo_status = tk.StringVar(value="")

    def load_flagship_tq_to_ir() -> None:
        if not _FLAGSHIP_TQ.is_file():
            demo_status.set("Flagship app.tq bulunamadı.")
            return
        from src.surface.parse_tq import TQParseError, parse_tq_source

        raw = _FLAGSHIP_TQ.read_text(encoding="utf-8")
        try:
            bundle = parse_tq_source(raw, tq_path=_FLAGSHIP_TQ)
        except TQParseError as ex:
            demo_status.set(f"Parse reddedildi: {ex}")
            return
        last_bundle[0] = bundle
        json_box.delete("1.0", tk.END)
        json_box.insert(tk.END, json.dumps(bundle, indent=2, ensure_ascii=False))
        demo_status.set("Flagship IR yüklendi → «Üretim ağacı yaz» ile generated_out")
        status_var.set("Flagship demo IR editörde.")

    def show_bench_metrics() -> None:
        if not _BENCH_JSON.is_file():
            demo_status.set("compression_baseline_report.json yok.")
            return
        data = json.loads(_BENCH_JSON.read_text(encoding="utf-8"))
        m = data.get("metrics") or {}
        demo_status.set(
            f"P32: task≈{m.get('task_prompt_token_estimate')} tok · "
            f".tq≈{m.get('torqa_source_token_estimate')} tok · "
            f"compression≈{float(m.get('semantic_compression_ratio', 0)):.2f}×"
        )

    def show_gate_summary() -> None:
        if not _GATE_MANIFEST.is_file():
            demo_status.set("gate manifest yok.")
            return
        from src.benchmarks.gate_proof import run_gate_proof_manifest

        rep = run_gate_proof_manifest(_GATE_MANIFEST)
        s = rep.get("summary") or {}
        demo_status.set(
            f"P33 gate: {s.get('accepted')} ok · {s.get('rejected')} red · "
            f"mismatch {s.get('mismatch_with_expectation')}"
        )

    tk.Button(
        side,
        text="Flagship .tq → IR",
        command=load_flagship_tq_to_ir,
        bg="#0e639c",
        fg="white",
        activebackground="#1177bb",
        activeforeground="white",
        relief=tk.FLAT,
        padx=12,
        pady=6,
    ).pack(fill=tk.X, padx=12, pady=(0, 4))
    tk.Button(
        side,
        text="P32 metrik özeti",
        command=show_bench_metrics,
        bg="#3c3c3c",
        fg="#cccccc",
        activebackground="#505050",
        activeforeground="#cccccc",
        relief=tk.FLAT,
        padx=12,
        pady=4,
    ).pack(fill=tk.X, padx=12, pady=2)
    tk.Button(
        side,
        text="P33 gate özeti",
        command=show_gate_summary,
        bg="#3c3c3c",
        fg="#cccccc",
        activebackground="#505050",
        activeforeground="#cccccc",
        relief=tk.FLAT,
        padx=12,
        pady=4,
    ).pack(fill=tk.X, padx=12, pady=(2, 6))
    tk.Label(
        side,
        textvariable=demo_status,
        fg="#89d185",
        bg="#252526",
        font=("Segoe UI", 9),
        wraplength=250,
        justify=tk.LEFT,
    ).pack(anchor=tk.W, padx=14, pady=(0, 8))

    tk.Label(
        side,
        text="İPUCU",
        fg="#858585",
        bg="#252526",
        font=("Segoe UI", 8, "bold"),
    ).pack(anchor=tk.W, padx=14)
    tk.Label(
        side,
        text="AI için .env içinde\nOPENAI_API_KEY ayarlayın.",
        fg="#858585",
        bg="#252526",
        font=("Segoe UI", 9),
        justify=tk.LEFT,
    ).pack(anchor=tk.W, padx=14, pady=(4, 0))

    # —— Ana alan ——
    main = tk.Frame(root, bg="#1e1e1e")
    main.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

    tk.Label(
        main,
        text="Pipeline: load or edit IR (below) → Validate → Build to generated_out",
        fg="#858585",
        bg="#1e1e1e",
        font=("Segoe UI", 9),
        wraplength=760,
        justify=tk.LEFT,
    ).pack(anchor=tk.W, padx=16, pady=(12, 2))

    tk.Label(
        main,
        text="Prompt",
        fg="#858585",
        bg="#1e1e1e",
        font=("Segoe UI", 8, "bold"),
    ).pack(anchor=tk.W, padx=16, pady=(8, 4))

    prompt_box = scrolledtext.ScrolledText(
        main,
        height=6,
        bg="#3c3c3c",
        fg="#cccccc",
        insertbackground="#cccccc",
        relief=tk.FLAT,
        font=mono,
        wrap=tk.WORD,
    )
    prompt_box.pack(fill=tk.X, padx=16, pady=(0, 8))

    status_var = tk.StringVar(value="")

    def do_suggest() -> None:
        text = prompt_box.get("1.0", tk.END).strip()
        if not text:
            status_var.set("Prompt yazın.")
            return
        status_var.set("AI çalışıyor…")
        root.update_idletasks()
        res = suggest_ir_bundle_from_prompt(text, max_retries=3)
        if res.get("ok") and res.get("ir_bundle"):
            last_bundle[0] = res["ir_bundle"]
            out = json.dumps(res["ir_bundle"], indent=2, ensure_ascii=False)
            json_box.delete("1.0", tk.END)
            json_box.insert(tk.END, out)
            status_var.set(
                "IR üretildi. Web dosyaları için «Üretim ağacı yaz» — yalnızca JSON yedek için «Projeyi klasöre yaz»."
            )
        else:
            last_bundle[0] = res.get("ir_bundle")
            issues = res.get("issues") or []
            msg = " · ".join(
                str(i.get("message", i)) if isinstance(i, dict) else str(i) for i in issues[:5]
            )
            status_var.set(msg or "AI başarısız.")
            if last_bundle[0]:
                json_box.delete("1.0", tk.END)
                json_box.insert(tk.END, json.dumps(last_bundle[0], indent=2, ensure_ascii=False))

    def do_write() -> None:
        if not workspace[0]:
            messagebox.showwarning("Klasör", "Önce klasör seçin.")
            return
        if not last_bundle[0]:
            messagebox.showwarning("IR", "Önce geçerli bir IR üretin.")
            return
        r = write_flow_project(workspace[0], last_bundle[0])
        if r.get("ok"):
            status_var.set("Kaydedildi: " + r.get("dir", ""))
            messagebox.showinfo("Tamam", "Dosyalar yazıldı:\n" + r.get("dir", ""))
        else:
            messagebox.showerror("Hata", r.get("error", "Yazılamadı"))

    def _set_diag_style(*, ok: bool | None) -> None:
        if ok is True:
            diag_box.configure(fg="#89d185", bg="#1e2d1e")
        elif ok is False:
            diag_box.configure(fg="#f48771", bg="#2d1f1f")
        else:
            diag_box.configure(fg="#cccccc", bg="#2a2a2a")

    def _show_diagnostics_text(text: str, *, ok: bool | None) -> None:
        _set_diag_style(ok=ok)
        if ok is True:
            diag_verdict_lbl.configure(
                text="PASS — Validation OK",
                fg="#89d185",
                bg="#1e2d1e",
            )
        elif ok is False:
            diag_verdict_lbl.configure(
                text="FAIL — See diagnostics below",
                fg="#f48771",
                bg="#2d1f1f",
            )
        else:
            diag_verdict_lbl.configure(text="", fg="#858585", bg="#1e1e1e")
        diag_box.configure(state=tk.NORMAL)
        diag_box.delete("1.0", tk.END)
        diag_box.insert(tk.END, text)
        diag_box.configure(state=tk.DISABLED)

    def do_validate() -> None:
        """Run validate stage only; show all issues in Diagnostics (no disk write)."""
        try:
            raw = json_box.get("1.0", tk.END).strip()
            bundle = json.loads(raw) if raw else last_bundle[0]
        except json.JSONDecodeError as ex:
            _show_diagnostics_text(f"JSON parse error:\n{ex}", ok=False)
            status_var.set("Fix JSON in the IR editor, then Validate again.")
            return
        if not isinstance(bundle, dict):
            _show_diagnostics_text("Bundle must be a JSON object.", ok=False)
            status_var.set("Invalid bundle.")
            return
        last_bundle[0] = bundle
        vr = validate_stage(bundle)
        rep = vr.diagnostics
        body = _format_diagnostic_report(rep)
        if not vr.ok and vr.failure_payload:
            err_msgs = vr.failure_payload.get("errors") or []
            if err_msgs:
                body = "\n".join(str(e) for e in err_msgs[:12]) + "\n\n" + body
        _show_diagnostics_text(body, ok=bool(vr.ok and rep.get("ok")))
        if vr.ok and rep.get("ok"):
            status_var.set("Validation passed. Choose a folder, then Build to generated_out.")
        else:
            status_var.set("Validation failed — see Diagnostics panel below.")

    def do_materialize() -> None:
        """Same as ``torqa project``: validate and write tree under generated_out."""
        if not workspace[0]:
            messagebox.showwarning("Workspace", "Choose a workspace folder first.")
            return
        try:
            raw = json_box.get("1.0", tk.END).strip()
            bundle = json.loads(raw) if raw else last_bundle[0]
        except json.JSONDecodeError as ex:
            _show_diagnostics_text(f"JSON parse error:\n{ex}", ok=False)
            messagebox.showerror("JSON", f"Invalid JSON: {ex}")
            return
        if not isinstance(bundle, dict):
            messagebox.showerror("Bundle", "IR bundle must be a JSON object.")
            return
        last_bundle[0] = bundle
        r = materialize_bundle_to_workspace(workspace[0], bundle, engine_mode="python_only")
        if r.get("ok"):
            n = r.get("file_count", 0)
            _show_diagnostics_text(
                f"Build succeeded.\nFiles written: {n}\nPath:\n{r.get('written_under', '')}",
                ok=True,
            )
            status_var.set(f"Build OK — {n} files → {r.get('written_under', '')}")
            lines = [
                f"Folder: {r.get('written_under', '')}",
                f"File count: {n}",
            ]
            hint = r.get("local_webapp")
            if hint:
                lines.append("")
                lines.append("Local web preview:")
                lines.append(hint.get("commands_windows_cmd") or hint.get("commands_posix", ""))
                lines.append(f"Browser: {hint.get('default_dev_url', '')}")
            messagebox.showinfo("Build complete", "\n".join(lines))
        else:
            diag = r.get("diagnostics")
            parts = [r.get("error", "Build failed.")]
            if r.get("errors"):
                parts.append("")
                parts.extend(str(e) for e in (r.get("errors") or [])[:10])
            if isinstance(diag, dict):
                parts.append("")
                parts.append(_format_diagnostic_report(diag))
            _show_diagnostics_text("\n".join(parts), ok=False)
            status_var.set("Build failed — see Diagnostics.")
            messagebox.showerror("Build failed", r.get("error", "See Diagnostics panel."))

    btn_row = tk.Frame(main, bg="#1e1e1e")
    btn_row.pack(fill=tk.X, padx=16, pady=8)

    tk.Button(
        btn_row,
        text="IR öner (AI)",
        command=do_suggest,
        bg="#0078d4",
        fg="white",
        activebackground="#1a8cff",
        activeforeground="white",
        relief=tk.FLAT,
        padx=16,
        pady=6,
    ).pack(side=tk.LEFT, padx=(0, 8))

    tk.Button(
        btn_row,
        text="Save flow JSON only",
        command=do_write,
        bg="#3c3c3c",
        fg="#cccccc",
        activebackground="#505050",
        activeforeground="#cccccc",
        relief=tk.FLAT,
        padx=12,
        pady=6,
    ).pack(side=tk.LEFT)

    tk.Button(
        btn_row,
        text="1 · Validate IR",
        command=do_validate,
        bg="#3c3c3c",
        fg="#cccccc",
        activebackground="#505050",
        activeforeground="#cccccc",
        relief=tk.FLAT,
        padx=12,
        pady=6,
    ).pack(side=tk.LEFT, padx=(8, 0))

    tk.Button(
        btn_row,
        text="2 · Build (generated_out)",
        command=do_materialize,
        bg="#0e639c",
        fg="white",
        activebackground="#1177bb",
        activeforeground="white",
        relief=tk.FLAT,
        padx=14,
        pady=6,
    ).pack(side=tk.LEFT, padx=(8, 0))

    tk.Label(
        main,
        textvariable=status_var,
        fg="#89d185",
        bg="#1e1e1e",
        font=("Segoe UI", 9),
        wraplength=760,
        justify=tk.LEFT,
    ).pack(anchor=tk.W, padx=16, pady=(0, 4))

    tk.Label(
        main,
        text="Diagnostics (validation & build errors)",
        fg="#858585",
        bg="#1e1e1e",
        font=("Segoe UI", 8, "bold"),
    ).pack(anchor=tk.W, padx=16, pady=(4, 2))

    diag_verdict_lbl = tk.Label(
        main,
        text="",
        fg="#858585",
        bg="#1e1e1e",
        font=("Segoe UI", 11, "bold"),
        anchor=tk.W,
    )
    diag_verdict_lbl.pack(anchor=tk.W, fill=tk.X, padx=16, pady=(0, 2))

    diag_box = scrolledtext.ScrolledText(
        main,
        height=5,
        bg="#2a2a2a",
        fg="#cccccc",
        insertbackground="#cccccc",
        relief=tk.FLAT,
        font=mono,
        wrap=tk.WORD,
        state=tk.DISABLED,
    )
    diag_box.pack(fill=tk.X, padx=16, pady=(0, 6))

    tk.Label(
        main,
        text="IR bundle (JSON)",
        fg="#858585",
        bg="#1e1e1e",
        font=("Segoe UI", 8, "bold"),
    ).pack(anchor=tk.W, padx=16, pady=(4, 4))

    json_box = scrolledtext.ScrolledText(
        main,
        bg="#3c3c3c",
        fg="#cccccc",
        insertbackground="#cccccc",
        relief=tk.FLAT,
        font=mono,
        wrap=tk.NONE,
    )
    json_box.pack(fill=tk.BOTH, expand=True, padx=16, pady=(0, 16))

    def tk_load_sample_project() -> None:
        if not _MINIMAL_IR_JSON.is_file():
            messagebox.showerror("Sample", f"Missing file:\n{_MINIMAL_IR_JSON}")
            return
        bundle = json.loads(_MINIMAL_IR_JSON.read_text(encoding="utf-8"))
        last_bundle[0] = bundle
        json_box.delete("1.0", tk.END)
        json_box.insert(tk.END, json.dumps(bundle, indent=2, ensure_ascii=False))
        _show_diagnostics_text(
            "Sample loaded (examples/core/valid_minimal_flow.json).\n"
            "Click 1 · Validate IR to run checks (no disk write).",
            ok=None,
        )
        status_var.set("Sample project in editor — Validate, then pick folder for Build.")
        demo_status.set("")

    def tk_quick_demo_first_run() -> None:
        tk_load_sample_project()
        do_validate()

    btn_tk_first_sample.configure(command=tk_load_sample_project, state=tk.NORMAL)
    btn_tk_first_demo.configure(command=tk_quick_demo_first_run, state=tk.NORMAL)

    root.mainloop()
