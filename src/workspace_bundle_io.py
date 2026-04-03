"""Write IR flow scaffold or materialized projection tree into a user-chosen directory (core-side helper)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict


def materialize_bundle_to_workspace(
    workspace: str,
    bundle: Dict[str, Any],
    *,
    out_subdir: str = "generated_out",
    engine_mode: str = "python_only",
) -> Dict[str, Any]:
    """
    Same behavior as ``torqa project --root <workspace> --source <bundle> --out <out_subdir>``:
    validate, run orchestrator, write files under ``workspace/out_subdir``.
    """
    try:
        root = Path(workspace).resolve()
        if not root.is_dir():
            return {"ok": False, "error": "Workspace path is not a directory."}
        if not isinstance(bundle, dict):
            return {"ok": False, "error": "Bundle must be a JSON object."}

        from src.project_materialize import local_webapp_hint, materialize_project

        dest = root / out_subdir
        ok, summary, written = materialize_project(bundle, dest, engine_mode=engine_mode)
        diag = summary.get("diagnostics") or {}
        if not diag.get("ok", False):
            return {
                "ok": False,
                "error": "Validation failed.",
                "errors": summary.get("errors", []),
                "diagnostics": diag,
                "written_under": str(dest),
            }
        if not ok:
            return {
                "ok": False,
                "error": "Consistency errors: " + "; ".join(str(e) for e in summary.get("errors", [])[:5]),
                "written": written,
                "written_under": str(dest),
            }

        return {
            "ok": True,
            "written_under": str(dest),
            "written": written,
            "file_count": len(written),
            "local_webapp": local_webapp_hint(written, output_root=dest),
        }
    except OSError as ex:
        return {"ok": False, "error": str(ex)}


def write_flow_project(workspace: str, bundle: Dict[str, Any]) -> Dict[str, Any]:
    try:
        root = Path(workspace).resolve()
        if not root.is_dir():
            return {"ok": False, "error": "Workspace path is not a directory."}
        if not isinstance(bundle, dict):
            return {"ok": False, "error": "Bundle must be a JSON object."}

        out_dir = root / "torqa-flow"
        out_dir.mkdir(parents=True, exist_ok=True)
        bundle_path = out_dir / "ir_bundle.json"
        with open(bundle_path, "w", encoding="utf-8") as f:
            json.dump(bundle, f, indent=2, ensure_ascii=False)

        readme = out_dir / "README.txt"
        readme.write_text(
            "TORQA flow workspace\n"
            "====================\n\n"
            "ir_bundle.json — IR target for validation and runs\n\n"
            "Full console: torqa-console (repo root)\n"
            "Set OPENAI_API_KEY in .env for AI suggestions.\n",
            encoding="utf-8",
        )
        return {"ok": True, "dir": str(out_dir), "bundle": str(bundle_path)}
    except OSError as ex:
        return {"ok": False, "error": str(ex)}


def write_flow_project_json_str(workspace: str, ir_bundle_json: str) -> Dict[str, Any]:
    try:
        bundle = json.loads(ir_bundle_json)
    except json.JSONDecodeError as ex:
        return {"ok": False, "error": f"JSON error: {ex}"}
    return write_flow_project(workspace, bundle)


def materialize_bundle_json_str(
    workspace: str,
    ir_bundle_json: str,
    *,
    out_subdir: str = "generated_out",
    engine_mode: str = "python_only",
) -> Dict[str, Any]:
    try:
        bundle = json.loads(ir_bundle_json)
    except json.JSONDecodeError as ex:
        return {"ok": False, "error": f"JSON error: {ex}"}
    return materialize_bundle_to_workspace(
        workspace, bundle, out_subdir=out_subdir, engine_mode=engine_mode
    )
