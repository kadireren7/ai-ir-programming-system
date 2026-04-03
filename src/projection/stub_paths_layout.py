"""
P28: projection stub **relative paths** — TORQA policy bundle + per-goal IR metadata.

Default layout: ``examples/torqa/projection_stub_paths_policy_bundle.json`` (from
``projection_stub_paths_policy.tq``). Per-flow overrides: ``ir_goal.metadata.source_map.projection_stub_paths``.
Heavy codegen stays in Python; paths are declarative.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Optional

from src.ir.canonical_ir import IRGoal

_REPO_ROOT = Path(__file__).resolve().parents[2]
_POLICY_BUNDLE = _REPO_ROOT / "examples" / "torqa" / "projection_stub_paths_policy_bundle.json"

# Last-resort if policy bundle is missing or incomplete (keep in sync with policy .tq intent).
_FALLBACK_STUB_PATHS: Dict[str, str] = {
    "rust": "generated/rust/main.rs",
    "python": "generated/python/main.py",
    "sql": "generated/sql/schema.sql",
    "typescript": "generated/typescript/index.ts",
    "go": "generated/go/main.go",
    "kotlin": "generated/kotlin/Main.kt",
    "cpp": "generated/cpp/main.cpp",
}

_policy_cache: Optional[Dict[str, str]] = None


def _normalize_stub_paths_dict(raw: Any) -> Optional[Dict[str, str]]:
    if not isinstance(raw, dict):
        return None
    out: Dict[str, str] = {}
    for k, v in raw.items():
        if isinstance(k, str) and isinstance(v, str) and v.strip():
            out[k.lower()] = v.strip().replace("\\", "/")
    return out or None


def policy_projection_stub_paths(*, bundle_path: Optional[Path] = None) -> Dict[str, str]:
    """Load default stub paths from committed policy bundle (TORQA surface output)."""
    global _policy_cache
    path = bundle_path or _POLICY_BUNDLE
    if bundle_path is None and _policy_cache is not None:
        return dict(_policy_cache)
    base = dict(_FALLBACK_STUB_PATHS)
    if not path.is_file():
        if bundle_path is None:
            _policy_cache = dict(base)
        return base
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        if bundle_path is None:
            _policy_cache = dict(base)
        return base
    ig = data.get("ir_goal") if isinstance(data, dict) else None
    md = ig.get("metadata") if isinstance(ig, dict) else None
    sm = md.get("source_map") if isinstance(md, dict) else None
    paths = _normalize_stub_paths_dict(sm.get("projection_stub_paths") if isinstance(sm, dict) else None)
    if paths:
        base.update(paths)
    if bundle_path is None:
        _policy_cache = dict(base)
    return base


def effective_stub_paths_for_goal(goal: IRGoal) -> Dict[str, str]:
    """Policy defaults merged with ``goal.metadata.source_map.projection_stub_paths`` overrides."""
    merged = policy_projection_stub_paths()
    sm = goal.metadata.get("source_map")
    if not isinstance(sm, dict):
        return merged
    custom = _normalize_stub_paths_dict(sm.get("projection_stub_paths"))
    if not custom:
        return merged
    out = dict(merged)
    out.update(custom)
    return out


def clear_policy_stub_paths_cache() -> None:
    """Test hook."""
    global _policy_cache
    _policy_cache = None
