"""
Stable Python API for embedding TORQA core operations (parse, load, validate, materialize).

This module is the supported programmatic counterpart to the ``torqa`` CLI
(``src.cli.main:main``). End users run ``torqa``; libraries import from here instead of
deep ``src.*`` where possible.

Contract and function list: ``docs/PACKAGE_SPLIT.md``. These five names are the public
surface; everything else under ``src/`` is implementation detail unless documented otherwise.
"""

from __future__ import annotations

__all__ = [
    "parse_tq",
    "load_bundle_from_path",
    "validate_bundle",
    "materialize_to_directory",
    "build_generated_zip",
]

from pathlib import Path
from typing import Any, Dict, Tuple

from src.project_materialize import (
    build_zip_bytes as _build_zip_bytes,
    load_bundle_from_source as _load_bundle_from_source,
    materialize_project as _materialize_project,
    validate_bundle_dict as _validate_bundle_dict,
)
from src.surface.parse_tq import parse_tq_source


def parse_tq(text: str) -> Dict[str, Any]:
    """Parse `.tq` surface text to a bundle envelope ``{"ir_goal": ...}``."""
    return parse_tq_source(text)


def load_bundle_from_path(path: str | Path) -> Dict[str, Any]:
    """Load bundle from ``.json``, ``.tq``, or ``.pxir`` path."""
    return _load_bundle_from_source(Path(path))


def validate_bundle(bundle: Dict[str, Any]) -> Dict[str, Any]:
    """
    Full diagnostic report for an already-parsed bundle dict (``ok``, ``issues``, …).

    Pass a dict from ``load_bundle_from_path`` or JSON ``json.loads``, not raw ``.tq`` text
    (use ``parse_tq`` first).
    """
    return _validate_bundle_dict(bundle)


def materialize_to_directory(
    bundle: Dict[str, Any],
    dest_root: str | Path,
    *,
    engine_mode: str = "python_only",
) -> Tuple[bool, Dict[str, Any]]:
    """
    Same pipeline as ``torqa project``: validate, orchestrator, write artifacts under ``dest_root``.

    ``dest_root`` is the directory that will contain emitted paths (equivalent to CLI
    ``--root``/``--out`` combined target). Returns ``(success, summary)`` with ``written``,
    ``errors``, ``written_under``, etc.
    """
    ok, summary, _ = _materialize_project(bundle, Path(dest_root), engine_mode=engine_mode)
    return ok, summary


def build_generated_zip(
    bundle: Dict[str, Any],
    *,
    engine_mode: str = "python_only",
) -> Tuple[bytes, Dict[str, Any]]:
    """Build an in-memory zip of generated files (safe paths only)."""
    return _build_zip_bytes(bundle, engine_mode=engine_mode)
