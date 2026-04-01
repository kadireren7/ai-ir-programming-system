"""
Tkinter masaüstü kabuğu: pywebview kurulamazsa veya ``--tk`` ile kullanılır.
Sunucu gerektirmez; AI ve dosya yazma doğrudan Python ile yapılır.
"""

from __future__ import annotations

import json
import tkinter as tk
from tkinter import filedialog, messagebox, scrolledtext
from tkinter import font as tkfont

from src.ai.adapter import suggest_ir_bundle_from_prompt

from desktop.workspace_io import write_flow_project


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
    ).pack(anchor=tk.W, padx=14, pady=(0, 12))

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
        text="Prompt",
        fg="#858585",
        bg="#1e1e1e",
        font=("Segoe UI", 8, "bold"),
    ).pack(anchor=tk.W, padx=16, pady=(16, 4))

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
            status_var.set("IR üretildi. «Projeyi klasöre yaz» ile kaydedin.")
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
        text="Projeyi klasöre yaz",
        command=do_write,
        bg="#3c3c3c",
        fg="#cccccc",
        activebackground="#505050",
        activeforeground="#cccccc",
        relief=tk.FLAT,
        padx=16,
        pady=6,
    ).pack(side=tk.LEFT)

    tk.Label(
        main,
        textvariable=status_var,
        fg="#89d185",
        bg="#1e1e1e",
        font=("Segoe UI", 9),
        wraplength=760,
        justify=tk.LEFT,
    ).pack(anchor=tk.W, padx=16, pady=(0, 6))

    tk.Label(
        main,
        text="IR bundle önizleme",
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

    root.mainloop()
