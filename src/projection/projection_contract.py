"""
P20: machine-readable projection / materialization contract summaries.

Used for JSON ``build`` / ``project`` output only; does not change generated file contents.

TODO(P18+): richer per-surface consistency signals may move next to a Rust projection core;
keep this module as a thin JSON contract over orchestrator artifacts.
"""

from __future__ import annotations

from typing import Any, Dict, List


def collect_top_level_paths(filenames: List[str]) -> List[str]:
    """Sorted unique first path segment (POSIX-style) for inspectability."""
    tops: set[str] = set()
    for fn in filenames:
        s = str(fn).replace("\\", "/").strip()
        if not s or s.startswith("/"):
            continue
        top = s.split("/")[0]
        if top:
            tops.add(top)
    return sorted(tops)


def normalize_projection_metadata(artifact: Dict[str, Any]) -> Dict[str, Any]:
    """Stable keys for each orchestrator artifact envelope (P20)."""
    tl = artifact.get("target_language")
    if not isinstance(tl, str) or not tl.strip():
        tl = "unknown"
    purp = artifact.get("purpose")
    if not isinstance(purp, str) or not purp.strip():
        purp = "unknown"
    raw = artifact.get("warnings")
    if raw is None:
        warnings: List[str] = []
    elif isinstance(raw, list):
        warnings = [str(x) for x in raw]
    else:
        warnings = [str(raw)]
    return {
        "target_language": tl.strip(),
        "purpose": purp.strip(),
        "warnings": warnings,
    }


def _emittable_file_entries(files: Any) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    if not isinstance(files, list):
        return out
    for f in files:
        if not isinstance(f, dict):
            continue
        fn = f.get("filename")
        content = f.get("content")
        if not fn or not isinstance(content, str):
            continue
        out.append(f)
    return out


def summarize_projection_surfaces(
    artifacts: List[Dict[str, Any]],
    *,
    consistency_errors: List[str],
) -> List[Dict[str, Any]]:
    """
    One summary dict per emitted surface (orchestrator artifact).

    ``consistency_ok`` reflects **global** projection consistency (same for all rows when
    ``consistency_errors`` is shared across the run).
    """
    global_ok = len(consistency_errors or []) == 0
    summaries: List[Dict[str, Any]] = []
    for raw in artifacts:
        if not isinstance(raw, dict):
            continue
        meta = normalize_projection_metadata(raw)
        entries = _emittable_file_entries(raw.get("files"))
        fnames = [str(e["filename"]).replace("\\", "/") for e in entries]
        summaries.append(
            {
                "target_language": meta["target_language"],
                "purpose": meta["purpose"],
                "file_count": len(entries),
                "top_level_paths": collect_top_level_paths(fnames),
                "warnings": list(meta["warnings"]),
                "consistency_ok": global_ok,
            }
        )
    return summaries
