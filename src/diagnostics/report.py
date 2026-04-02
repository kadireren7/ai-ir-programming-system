from __future__ import annotations

from typing import Any, Dict, List, Optional

from src.diagnostics.formal_phases import annotate_with_formal
from src.ir.canonical_ir import (
    IRGoal,
    validate_ir,
    validate_ir_handoff_compatibility,
    validate_ir_semantic_determinism,
)
from src.semantics.ir_semantics import build_ir_semantic_report, default_ir_function_registry

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

    return {
        "ok": ok,
        "issues": issues,
        "warnings": warnings,
        "semantic_report": semantic,
    }
