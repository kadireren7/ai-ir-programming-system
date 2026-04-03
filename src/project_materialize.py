"""
Load .tq / JSON bundles and materialize orchestrator artifacts under a project root.

Pipeline (P19): **parse** (surface → bundle dict) → **validate** (envelope + IR shape + semantics) →
**project** (orchestrator + artifact write). Parse is invoked separately via ``parse_stage`` before
``materialize_project``; validation never runs on a failed parse, and projection never runs if
validation fails.

**Stable projection:** before summarize/write, ``stabilize_projection_artifacts`` sorts each artifact's
``files`` by path and orders artifact blocks by ``(target_language, purpose)``. ``_write_artifacts``
applies the same ordering so the same validated bundle always yields the same relative paths and
file bytes (see ``compute_projection_output_digest``).

Shared by ``torqa project`` and tooling (HTTP zip API, desktop). See docs/PACKAGE_SPLIT.md.
"""

from __future__ import annotations

import hashlib
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

from src.diagnostics.report import build_full_diagnostic_report, build_ir_shape_error_report
from src.diagnostics.user_hints import suggested_next_from_report
from src.ir.canonical_ir import ir_goal_from_json, validate_bundle_envelope
from src.orchestrator.system_orchestrator import SystemOrchestrator
from src.projection.projection_contract import summarize_projection_surfaces
from src.projection.projection_strategy import ProjectionContext
from src.surface.parse_pxir import parse_pxir_source
from src.surface.parse_tq import TQParseError, parse_tq_source


def load_bundle_from_source(path: Path) -> Dict[str, Any]:
    """Load a bundle envelope from ``.json``, ``.tq``, or ``.pxir``."""
    path = path.resolve()
    if not path.is_file():
        raise FileNotFoundError(f"Source not found: {path}")
    suf = path.suffix.lower()
    raw = path.read_text(encoding="utf-8")
    if suf == ".tq":
        return parse_tq_source(raw, tq_path=path)
    if suf == ".pxir":
        return parse_pxir_source(raw)
    if suf == ".json":
        return json.loads(raw)
    raise ValueError(f"Unsupported source extension {suf!r} (use .json, .tq, .pxir)")


def parse_stage(path: Path) -> Tuple[Optional[Dict[str, Any]], Optional[BaseException], Dict[str, Any]]:
    """
    Stage 1: surface file → canonical IR bundle dict (``.tq`` / ``.pxir`` / ``.json``).

    Returns ``(bundle, error, stage_info)``. Exactly one of ``bundle`` or ``error`` is set.
    On success, ``error`` is ``None`` and the bundle must not be passed to validation if ``error`` is set.
    """
    try:
        b = load_bundle_from_source(path)
        suf = path.suffix.lower()
        return (
            b,
            None,
            {
                "stage": "parse",
                "stage_ok": True,
                "stage_summary": f"loaded {suf} source",
            },
        )
    except TQParseError as ex:
        return (
            None,
            ex,
            {
                "stage": "parse",
                "stage_ok": False,
                "stage_summary": f"tq_parse:{ex.code}",
            },
        )
    except (OSError, ValueError, json.JSONDecodeError, UnicodeDecodeError) as ex:
        return (
            None,
            ex,
            {
                "stage": "parse",
                "stage_ok": False,
                "stage_summary": type(ex).__name__,
            },
        )


@dataclass(frozen=True)
class ValidateStageResult:
    """Result of validate_stage (envelope + ``ir_goal_from_json`` + full diagnostics)."""

    ok: bool
    goal: Any
    diagnostics: Dict[str, Any]
    stage_info: Dict[str, Any]
    failure_payload: Optional[Dict[str, Any]]


def validate_stage(
    bundle: Dict[str, Any],
    *,
    pipeline_trace: Optional[List[Dict[str, Any]]] = None,
) -> ValidateStageResult:
    """
    Stage 2: IR bundle dict → envelope check, shape, semantics (no projection).

    Must not be called with a ``None`` bundle or with output of a failed ``parse_stage``.
    """
    env_e = validate_bundle_envelope(bundle)
    try:
        g = ir_goal_from_json(bundle)
    except (KeyError, TypeError) as ex:
        rep = build_ir_shape_error_report(ex)
        rep["suggested_next"] = suggested_next_from_report(rep)
        err_msgs = [str(i.get("message", "")) for i in rep.get("issues", [])]
        stage_info = {
            "stage": "validate",
            "stage_ok": False,
            "stage_summary": f"shape_error issues={len(rep.get('issues') or [])}",
        }
        if pipeline_trace is not None:
            pipeline_trace.append(stage_info)
        fp = {
            "diagnostics": rep,
            "written": [],
            "errors": err_msgs,
            "consistency_errors": [],
            "suggested_next": rep["suggested_next"],
        }
        return ValidateStageResult(False, None, rep, stage_info, fp)

    try:
        rep = build_full_diagnostic_report(g, bundle_envelope_errors=env_e)
    except ValueError as ex:
        # e.g. duplicate input names before semantic issues are collected as a list
        rep = build_ir_shape_error_report(ex)
    n_issues = len(rep.get("issues") or [])
    n_warn = len(rep.get("warnings") or [])
    if not rep["ok"]:
        err_msgs = [str(i.get("message", "")) for i in rep.get("issues", [])]
        sn = suggested_next_from_report(rep)
        rep = dict(rep)
        rep["suggested_next"] = sn
        stage_info = {
            "stage": "validate",
            "stage_ok": False,
            "stage_summary": f"diagnostics issues={n_issues} warnings={n_warn}",
        }
        if pipeline_trace is not None:
            pipeline_trace.append(stage_info)
        fp = {
            "diagnostics": rep,
            "written": [],
            "errors": err_msgs,
            "consistency_errors": [],
            "suggested_next": sn,
        }
        return ValidateStageResult(False, None, rep, stage_info, fp)

    stage_info = {
        "stage": "validate",
        "stage_ok": True,
        "stage_summary": f"ok issues={n_issues} warnings={n_warn}",
    }
    if pipeline_trace is not None:
        pipeline_trace.append(stage_info)
    return ValidateStageResult(True, g, rep, stage_info, None)


def project_stage(
    goal: Any,
    dest_root: Path,
    *,
    engine_mode: str,
    diagnostics_rep: Dict[str, Any],
    pipeline_trace: Optional[List[Dict[str, Any]]] = None,
) -> Tuple[bool, Dict[str, Any], List[str]]:
    """
    Stage 3: validated ``IRGoal`` → orchestrator run + artifact writes.

    Call only after ``validate_stage`` returned ``ok=True``. Never run on failed validation.
    """
    if goal is None:
        raise RuntimeError("P19: project_stage requires a validated IR goal (validation failed or skipped)")

    dest_root = dest_root.resolve()
    orch = SystemOrchestrator(goal, context=ProjectionContext(), engine_mode=engine_mode)
    out = orch.run_v4() if hasattr(orch, "run_v4") else orch.run()
    consistency = list(out.get("consistency_errors") or [])
    artifacts = list(out.get("artifacts") or [])
    stabilize_projection_artifacts(artifacts)
    projection_surfaces = summarize_projection_surfaces(artifacts, consistency_errors=consistency)
    written = _write_artifacts(artifacts, dest_root)
    ok = len(consistency) == 0
    stage_info = {
        "stage": "project",
        "stage_ok": ok,
        "stage_summary": f"artifacts={len(written)} consistency_errors={len(consistency)}",
    }
    if pipeline_trace is not None:
        pipeline_trace.append(stage_info)
    summary = {
        "written": written,
        "errors": consistency,
        "written_under": str(dest_root),
        "consistency_errors": consistency,
        "diagnostics": diagnostics_rep,
        "local_webapp": local_webapp_hint(written, output_root=dest_root),
        "projection_surfaces": projection_surfaces,
    }
    return ok, summary, written


def stabilize_projection_artifacts(artifacts: List[Dict[str, Any]]) -> None:
    """
    In-place deterministic ordering: sort each artifact's ``files`` by ``filename``, then sort
    artifact blocks by ``(target_language, purpose)``. Same IR input therefore yields the same
    write order regardless of dict/list construction order upstream.
    """
    for art in artifacts:
        if not isinstance(art, dict):
            continue
        files = art.get("files")
        if isinstance(files, list):
            art["files"] = sorted(
                [f for f in files if isinstance(f, dict)],
                key=lambda f: str(f.get("filename") or ""),
            )
    artifacts.sort(
        key=lambda a: (
            str(a.get("target_language") or "").lower(),
            str(a.get("purpose") or "").lower(),
        )
        if isinstance(a, dict)
        else ("", ""),
    )


def compute_projection_output_digest(dest_root: Path, written: Sequence[str]) -> str:
    """
    SHA-256 over sorted relative paths and raw file bytes (UTF-8 on-disk as written).
    Empty ``written`` yields a fixed digest of repeated separators only.
    """
    h = hashlib.sha256()
    root = dest_root.resolve()
    for rel in sorted(str(p).replace("\\", "/") for p in written):
        h.update(rel.encode("utf-8"))
        h.update(b"\0")
        fp = root / rel
        if fp.is_file():
            h.update(fp.read_bytes())
        h.update(b"\0")
    return h.hexdigest()


def _write_artifacts(artifacts: List[Dict[str, Any]], dest_root: Path) -> List[str]:
    written: List[str] = []
    # Defense in depth: stable artifact and file order even if stabilize_projection_artifacts omitted.
    ordered_arts = sorted(
        (a for a in artifacts if isinstance(a, dict)),
        key=lambda a: (
            str(a.get("target_language") or "").lower(),
            str(a.get("purpose") or "").lower(),
        ),
    )
    for art in ordered_arts:
        files = art.get("files") or []
        sorted_files = sorted(
            (f for f in files if isinstance(f, dict)),
            key=lambda f: str(f.get("filename") or ""),
        )
        for fi in sorted_files:
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
    pipeline_trace: Optional[List[Dict[str, Any]]] = None,
) -> Tuple[bool, Dict[str, Any], List[str]]:
    """
    Validate bundle, run orchestrator, write files under ``dest_root``.

    Stages: ``validate_stage`` then ``project_stage`` only if validation passes.
    If ``pipeline_trace`` is a list, append ``validate`` / ``project`` stage dicts (for JSON CLI).

    Returns (success, summary_dict, written_paths).
    """
    dest_root = dest_root.resolve()
    vr = validate_stage(bundle, pipeline_trace=pipeline_trace)
    if not vr.ok:
        assert vr.failure_payload is not None
        fp = dict(vr.failure_payload)
        fp["written_under"] = str(dest_root)
        return False, fp, []
    ok, summary, written = project_stage(
        vr.goal,
        dest_root,
        engine_mode=engine_mode,
        diagnostics_rep=vr.diagnostics,
        pipeline_trace=pipeline_trace,
    )
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
