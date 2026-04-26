"""Shared filesystem discovery for scan/report-style commands."""

from __future__ import annotations

from pathlib import Path
from typing import List, Optional, Tuple


def discover_spec_files(
    root: Path, *, suffixes: Optional[Tuple[str, ...]] = None
) -> List[Path]:
    """
    All matching files under ``root``, sorted by resolved path.

    ``suffixes`` defaults to ``(\".tq\", \".json\")``; use ``(\".json\",)`` for n8n-only scans.
    """
    want = suffixes if suffixes is not None else (".tq", ".json")
    out: List[Path] = []
    for p in root.rglob("*"):
        if not p.is_file():
            continue
        suf = p.suffix.lower()
        if suf in want:
            out.append(p.resolve())
    return sorted(out)


def display_path_relative(scan_root: Path, file_path: Path) -> str:
    """Best-effort repo-relative display path."""
    try:
        return str(file_path.resolve().relative_to(scan_root.resolve()))
    except ValueError:
        return str(file_path)
