"""
Load .tq / JSON bundles and materialize orchestrator artifacts under a project root.

Shared by ``torqa project`` and tooling (webui zip, desktop). See docs/PACKAGE_SPLIT.md.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Tuple

from src.diagnostics.report import build_full_diagnostic_report
from src.ir.canonical_ir import ir_goal_from_json, validate_bundle_envelope
from src.orchestrator.system_orchestrator import SystemOrchestrator
from src.projection.projection_strategy import ProjectionContext
from src.surface.parse_pxir import parse_pxir_source
from src.surface.parse_tq import parse_tq_source


def load_bundle_from_source(path: Path) -> Dict[str, Any]:
    """Load a bundle envelope from ``.json``, ``.tq``, or ``.pxir``."""
    path = path.resolve()
    if not path.is_file():
        raise FileNotFoundError(f"Source not found: {path}")
    suf = path.suffix.lower()
    raw = path.read_text(encoding="utf-8")
    if suf == ".tq":
        return parse_tq_source(raw)
    if suf == ".pxir":
        return parse_pxir_source(raw)
    if suf == ".json":
        return json.loads(raw)
    raise ValueError(f"Unsupported source extension {suf!r} (use .json, .tq, .pxir)")


def _write_artifacts(artifacts: List[Dict[str, Any]], dest_root: Path) -> List[str]:
    written: List[str] = []
    for art in artifacts:
        for fi in art.get("files") or []:
            fn = fi.get("filename")
            content = fi.get("content")
            if not fn or not isinstance(content, str):
                continue
            safe = sanitize_archive_path(str(fn))
            out = dest_root / safe
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(content, encoding="utf-8")
            written.append(safe.replace("\\", "/"))
    return sorted(set(written))


def local_webapp_hint(
    written: List[str],
    *,
    output_root: Path | None = None,
) -> Dict[str, Any] | None:
    """
    If the materialized tree includes Vite webapp files, return copy-paste steps for localhost.

    When ``output_root`` is set (disk materialize), Windows commands use the **absolute**
    ``…/generated/webapp`` path so PowerShell açılış dizininden bağımsız çalışır.
    ZIP çıkarımı için ``output_root`` verilmez; komutlar çıkarılan kökten görecelidir.
    """
    norm = [p.replace("\\", "/") for p in written]
    if not any(p.startswith("generated/webapp/") for p in norm):
        return None
    rel = "generated/webapp"
    out: Dict[str, Any] = {
        "relative_dir": rel,
        "default_dev_url": "http://localhost:5173",
        "requires_node": True,
        "commands_from_materialize_root": f"cd {rel} && npm install && npm run dev",
        "commands_from_materialize_root_windows": f"cd {rel.replace('/', os.sep)} && npm install && npm run dev",
    }
    if output_root is not None:
        abs_web = (Path(output_root) / "generated" / "webapp").resolve()
        w = str(abs_web)
        out["webapp_dir_absolute"] = w
        out["commands_posix"] = f'cd "{w}" && npm install && npm run dev'
        out["commands_windows_cmd"] = f'cd /d "{w}" && npm install && npm run dev'
        out["commands_powershell"] = f'Set-Location -LiteralPath "{w}"; npm install; npm run dev'
    else:
        out["commands_posix"] = f"cd {rel} && npm install && npm run dev"
        out["commands_windows_cmd"] = out["commands_from_materialize_root_windows"]
        out["commands_powershell"] = "cd generated/webapp; npm install; npm run dev"
    return out


def sanitize_archive_path(name: str) -> str:
    """
    Reject zip-slip / path traversal in projected filenames (must stay under output root).

    Raises ValueError if the path escapes the root.
    """
    from pathlib import PurePosixPath

    if not name or not str(name).strip():
        raise ValueError("Unsafe artifact path: empty")
    p = PurePosixPath(name.replace("\\", "/"))
    if p.is_absolute() or ".." in p.parts:
        raise ValueError(f"Unsafe artifact path: {name!r}")
    return str(p)


def materialize_project(
    bundle: Dict[str, Any],
    dest_root: Path,
    *,
    engine_mode: str = "python_only",
) -> Tuple[bool, Dict[str, Any], List[str]]:
    """
    Validate bundle, run orchestrator, write files under ``dest_root``.

    Returns (success, summary_dict, written_paths).
    """
    dest_root = dest_root.resolve()
    env_e = validate_bundle_envelope(bundle)
    g = ir_goal_from_json(bundle)
    rep = build_full_diagnostic_report(g, bundle_envelope_errors=env_e)
    if not rep["ok"]:
        err_msgs = [str(i.get("message", "")) for i in rep.get("issues", [])]
        return (
            False,
            {
                "diagnostics": rep,
                "written": [],
                "errors": err_msgs,
                "written_under": str(dest_root),
                "consistency_errors": [],
            },
            [],
        )

    orch = SystemOrchestrator(g, context=ProjectionContext(), engine_mode=engine_mode)
    out = orch.run_v4() if hasattr(orch, "run_v4") else orch.run()
    consistency = list(out.get("consistency_errors") or [])
    written = _write_artifacts(out.get("artifacts") or [], dest_root)
    ok = len(consistency) == 0
    summary = {
        "written": written,
        "errors": consistency,
        "written_under": str(dest_root),
        "consistency_errors": consistency,
        "diagnostics": rep,
        "local_webapp": local_webapp_hint(written, output_root=dest_root),
    }
    return ok, summary, written


def validate_bundle_dict(bundle: Dict[str, Any]) -> Dict[str, Any]:
    """Return full diagnostic report for a bundle envelope (see ``torqa_public`` / PACKAGE_SPLIT)."""
    env_e = validate_bundle_envelope(bundle)
    g = ir_goal_from_json(bundle)
    return build_full_diagnostic_report(g, bundle_envelope_errors=env_e)


def build_zip_bytes(bundle: Dict[str, Any], *, engine_mode: str = "python_only") -> Tuple[bytes, Dict[str, Any]]:
    """Build a zip in memory; paths inside zip are sanitized. Returns (zip_bytes, meta_summary)."""
    import io
    import tempfile
    import zipfile

    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        ok, summary, written = materialize_project(bundle, root, engine_mode=engine_mode)
        if not summary.get("diagnostics", {}).get("ok", False):
            return b"", {
                "ok": False,
                "written": [],
                "errors": summary.get("errors", []),
                "reason": "diagnostics_failed",
            }
        if not ok:
            return b"", {
                "ok": False,
                "written": written,
                "errors": summary.get("errors", []),
                "reason": "consistency_errors",
            }
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for rel in written:
                fp = root / rel
                if fp.is_file():
                    zf.write(fp, arcname=rel)
        meta = {
            "ok": True,
            "written": written,
            "errors": [],
            "local_webapp": local_webapp_hint(written),
        }
        return buf.getvalue(), meta
