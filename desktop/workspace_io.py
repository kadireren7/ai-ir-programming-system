"""Shared: write IR flow scaffold into a user-chosen directory."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict


def write_flow_project(workspace: str, bundle: Dict[str, Any]) -> Dict[str, Any]:
    try:
        root = Path(workspace).resolve()
        if not root.is_dir():
            return {"ok": False, "error": "Seçilen yol bir klasör değil."}
        if not isinstance(bundle, dict):
            return {"ok": False, "error": "IR paketi bir JSON nesnesi olmalı."}

        out_dir = root / "torqa-flow"
        out_dir.mkdir(parents=True, exist_ok=True)
        bundle_path = out_dir / "ir_bundle.json"
        with open(bundle_path, "w", encoding="utf-8") as f:
            json.dump(bundle, f, indent=2, ensure_ascii=False)

        readme = out_dir / "README.txt"
        readme.write_text(
            "TORQA flow workspace\n"
            "====================\n\n"
            "ir_bundle.json — IR hedefi (doğrulama ve çalıştırma için)\n\n"
            "Tam konsol: proje kökünde `python -m webui` veya `torqa-console`\n"
            "AI önerileri için .env içinde OPENAI_API_KEY tanımlayın.\n",
            encoding="utf-8",
        )
        return {"ok": True, "dir": str(out_dir), "bundle": str(bundle_path)}
    except OSError as ex:
        return {"ok": False, "error": str(ex)}


def write_flow_project_json_str(workspace: str, ir_bundle_json: str) -> Dict[str, Any]:
    try:
        bundle = json.loads(ir_bundle_json)
    except json.JSONDecodeError as ex:
        return {"ok": False, "error": f"JSON hatası: {ex}"}
    return write_flow_project(workspace, bundle)
