"""
P23: compact machine-readable digests over diagnostic reports and pipeline stages.

Keeps narratives short; prefer numeric counts and small dicts for tooling.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional


def summarize_diagnostic_report(rep: Dict[str, Any]) -> Dict[str, Any]:
    """
    Build a stable-shape summary from ``build_full_diagnostic_report`` / shape-error payloads.

    Keys are intentionally fixed for tests and JSON consumers.
    """
    issues = list(rep.get("issues") or [])
    warnings = list(rep.get("warnings") or [])
    sem = rep.get("semantic_report") or {}
    sem_err = list(sem.get("errors") or [])
    sem_warn = list(sem.get("warnings") or [])

    phase_counts: Dict[str, int] = {}
    for item in issues + warnings:
        fp = str(item.get("formal_phase") or "unknown")
        phase_counts[fp] = phase_counts.get(fp, 0) + 1

    code_counts: Dict[str, int] = {}
    for item in issues:
        c = str(item.get("code") or "unknown")
        code_counts[c] = code_counts.get(c, 0) + 1

    return {
        "validation_ok": bool(rep.get("ok")),
        "blocking_issue_count": len(issues),
        "warning_row_count": len(warnings),
        "semantic": {
            "error_count": len(sem_err),
            "warning_count": len(sem_warn),
            "semantic_ok": bool(sem.get("semantic_ok")),
        },
        "formal_phase_counts": dict(sorted(phase_counts.items())),
        "blocking_code_counts": dict(sorted(code_counts.items())),
    }


def summarize_pipeline_stages(
    stages: List[Dict[str, Any]],
    validation_digest: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Map parse / validate / project stage flags plus optional validation summary from diagnostics.
    """
    out: Dict[str, Any] = {
        "parse_ok": None,
        "validate_ok": None,
        "project_ok": None,
    }
    for s in stages:
        st = s.get("stage")
        ok = s.get("stage_ok")
        if st == "parse":
            out["parse_ok"] = ok
        elif st == "validate":
            out["validate_ok"] = ok
        elif st == "project":
            out["project_ok"] = ok
    if validation_digest is not None:
        out["validation"] = validation_digest
    return out
