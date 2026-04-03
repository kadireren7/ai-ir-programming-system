"""
``torqa validate`` open-file failures: static ``suggested_next`` lines from TORQA bundle (P26).

Source: ``examples/torqa_self/cli_validate_open_hints.tq`` → committed bundle.
Predicates and diagnostics stay in ``src.cli.main``; only ordered hint strings are self-hosted.
"""

from __future__ import annotations

from pathlib import Path
from typing import List, Optional

from src.torqa_self.bundle_io import ir_goal_input_names, load_bundle_ir_goal, repo_root

_REPO_ROOT = repo_root()
_DEFAULT_BUNDLE = _REPO_ROOT / "examples" / "torqa_self" / "cli_validate_open_hints_bundle.json"

_CORE = 3

# Expected slug order in bundle ``requires`` (after core session inputs).
_SLUG_TQ = ("open_hint_tq_surface", "open_hint_tq_build")
_SLUG_BADEXT = ("open_hint_badext_surface", "open_hint_badext_build")
_SLUG_BADJSON = ("open_hint_badjson_minimal", "open_hint_badjson_schema")
_SLUG_NOTDICT = ("open_hint_notdict_minimal",)

_TEMPLATE = {
    "open_hint_tq_surface": "torqa surface {path} --out ir_bundle.json",
    "open_hint_tq_build": "torqa build {path}",
    "open_hint_badext_surface": "torqa surface FILE.tq --out ir_bundle.json",
    "open_hint_badext_build": "torqa build FILE.tq",
    "open_hint_badjson_minimal": "torqa language --minimal-json",
    "open_hint_badjson_schema": "spec/IR_BUNDLE.schema.json",
    "open_hint_notdict_minimal": "torqa language --minimal-json",
}


def _expected_slugs() -> List[str]:
    return list(_SLUG_TQ + _SLUG_BADEXT + _SLUG_BADJSON + _SLUG_NOTDICT)


def _lines_for_slugs(slugs: tuple[str, ...], *, path: Optional[Path] = None) -> List[str]:
    out: List[str] = []
    for s in slugs:
        t = _TEMPLATE[s]
        if "{path}" in t:
            assert path is not None
            out.append(t.format(path=path))
        else:
            out.append(t)
    return out


def _fallback_lines(kind: str, *, path: Optional[Path] = None) -> List[str]:
    if kind == "tq":
        return _lines_for_slugs(_SLUG_TQ, path=path)
    if kind == "badext":
        return _lines_for_slugs(_SLUG_BADEXT)
    if kind == "badjson":
        return _lines_for_slugs(_SLUG_BADJSON)
    if kind == "notdict":
        return _lines_for_slugs(_SLUG_NOTDICT)
    raise ValueError(kind)


def _slice_from_bundle(ig: dict, start: int, slugs: tuple[str, ...]) -> bool:
    names = ir_goal_input_names(ig)
    need = start + len(slugs)
    if len(names) < need:
        return False
    return names[start : need] == list(slugs)


def validate_open_hints_for_tq_path(path: Path, *, bundle_path: Optional[Path] = None) -> List[str]:
    """Two lines when user passed ``.tq`` / ``.pxir`` to ``validate``."""
    p = bundle_path or _DEFAULT_BUNDLE
    ig = load_bundle_ir_goal(p)
    if not ig or not _slice_from_bundle(ig, _CORE, _SLUG_TQ):
        return _fallback_lines("tq", path=path)
    return _lines_for_slugs(_SLUG_TQ, path=path)


def validate_open_hints_for_bad_extension(*, bundle_path: Optional[Path] = None) -> List[str]:
    """Two lines when extension is not ``.json`` (and not .tq/.pxir)."""
    p = bundle_path or _DEFAULT_BUNDLE
    ig = load_bundle_ir_goal(p)
    start = _CORE + len(_SLUG_TQ)
    if not ig or not _slice_from_bundle(ig, start, _SLUG_BADEXT):
        return _fallback_lines("badext")
    return _lines_for_slugs(_SLUG_BADEXT)


def validate_open_hints_for_bad_json(*, bundle_path: Optional[Path] = None) -> List[str]:
    """Two lines when JSON parse fails."""
    p = bundle_path or _DEFAULT_BUNDLE
    ig = load_bundle_ir_goal(p)
    start = _CORE + len(_SLUG_TQ) + len(_SLUG_BADEXT)
    if not ig or not _slice_from_bundle(ig, start, _SLUG_BADJSON):
        return _fallback_lines("badjson")
    return _lines_for_slugs(_SLUG_BADJSON)


def validate_open_hints_for_not_dict(*, bundle_path: Optional[Path] = None) -> List[str]:
    """One line when root JSON is not an object."""
    p = bundle_path or _DEFAULT_BUNDLE
    ig = load_bundle_ir_goal(p)
    start = _CORE + len(_SLUG_TQ) + len(_SLUG_BADEXT) + len(_SLUG_BADJSON)
    if not ig or not _slice_from_bundle(ig, start, _SLUG_NOTDICT):
        return _fallback_lines("notdict")
    return _lines_for_slugs(_SLUG_NOTDICT)
