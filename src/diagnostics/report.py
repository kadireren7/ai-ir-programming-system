from __future__ import annotations

# TODO(P18+ / Rust concentration): Structural + policy checks that are pure over IR may move to
# Rust; Python remains orchestration, hint attachment, and compatibility reporting.

from typing import Any, Dict, List, Optional

from src.diagnostics import codes as diag_codes
from src.diagnostics.formal_phases import annotate_with_formal, formal_phase_for_issue
from src.ir.canonical_ir import (
    IRGoal,
    validate_ir,
    validate_ir_handoff_compatibility,
    validate_ir_semantic_determinism,
)
from src.semantics.ir_semantics import build_ir_semantic_report, default_ir_function_registry

from src.diagnostics.summary import summarize_diagnostic_report
from src.diagnostics.user_hints import augment_issue


def build_full_diagnostic_report(
    ir_goal: IRGoal,
    *,
    bundle_envelope_errors: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Single structured report for CI, web UI, and AI self-correction loops.
    """
    structural = validate_ir(ir_goal)
    handoff = validate_ir_handoff_compatibility(ir_goal)
    determinism = validate_ir_semantic_determinism(ir_goal)
    reg = default_ir_function_registry()
    semantic = build_ir_semantic_report(ir_goal, reg)

    sem_err = list(semantic.get("errors") or [])
    sem_warn = list(semantic.get("warnings") or [])

    env_err = list(bundle_envelope_errors or [])

    issues: List[dict] = []
    issues.extend(annotate_with_formal(env_err, legacy_phase="envelope"))
    issues.extend(annotate_with_formal(structural, legacy_phase="structural"))
    issues.extend(annotate_with_formal(handoff, legacy_phase="handoff"))
    issues.extend(annotate_with_formal(determinism, legacy_phase="determinism"))
    issues.extend(annotate_with_formal(sem_err, legacy_phase="semantic"))
    warnings = annotate_with_formal(sem_warn, legacy_phase="semantic_warning")

    ok = (
        len(env_err) == 0
        and len(structural) == 0
        and len(handoff) == 0
        and len(determinism) == 0
        and len(sem_err) == 0
    )

    issues = [augment_issue(i) for i in issues]
    warnings = [augment_issue(i) for i in warnings]

    rep = {
        "ok": ok,
        "issues": issues,
        "warnings": warnings,
        "semantic_report": semantic,
    }
    rep["summary"] = summarize_diagnostic_report(rep)
    return rep


def build_ir_shape_error_report(exc: BaseException) -> Dict[str, Any]:
    """
    When ``ir_goal_from_json`` fails (KeyError/TypeError), emit the same top-level
    shape as ``build_full_diagnostic_report`` for CLI/web consumers.
    """
    code = diag_codes.PX_PARSE_FAILED
    issue = augment_issue(
        {
            "code": code,
            "phase": "structural",
            "formal_phase": formal_phase_for_issue(code, "structural"),
            "message": f"Bundle IR shape invalid ({type(exc).__name__}): {exc}",
        }
    )
    rep = {
        "ok": False,
        "issues": [issue],
        "warnings": [],
        "semantic_report": {"errors": [], "warnings": []},
    }
    rep["summary"] = summarize_diagnostic_report(rep)
    return rep
