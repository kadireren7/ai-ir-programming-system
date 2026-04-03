"""
Coarse TORQA failure buckets for reporting: syntax vs structure vs semantic.

These are **product-facing** labels (not identical to FORMAL_CORE phase IDs). They group how an
author should think about the fix (surface text vs IR shape vs meaning).
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from src.diagnostics.formal_phases import formal_phase_for_issue

BUCKET_SYNTAX = "syntax_failure"
BUCKET_STRUCTURE = "structure_failure"
BUCKET_SEMANTIC = "semantic_failure"
BUCKET_NONE = None  # accepted / no failure

_PUBLIC_BUCKETS = (BUCKET_SYNTAX, BUCKET_STRUCTURE, BUCKET_SEMANTIC)


def is_public_bucket(name: Optional[str]) -> bool:
    return name in _PUBLIC_BUCKETS


def classify_from_diagnostic_issue(issue: Dict[str, Any]) -> str:
    """
    Classify the **primary** diagnostic issue (first blocking row from ``build_full_diagnostic_report``
    or ``build_ir_shape_error_report``).
    """
    code = str(issue.get("code") or "")
    phase = str(issue.get("phase") or "")
    msg = str(issue.get("message") or "")
    formal = str(issue.get("formal_phase") or formal_phase_for_issue(code, phase))

    # IR shape / symbol errors surfaced as PX_PARSE_FAILED (ir_goal_from_json ValueError path)
    if code == "PX_PARSE_FAILED":
        if "Bundle IR shape invalid" in msg or "IR symbol table" in msg or "duplicate" in msg.lower():
            return BUCKET_STRUCTURE
        return BUCKET_SYNTAX

    if code.startswith("PX_SEM_"):
        return BUCKET_SEMANTIC

    if formal == "syntax":
        return BUCKET_SYNTAX

    if phase in ("semantic", "semantic_warning"):
        return BUCKET_SEMANTIC

    if formal == "wellformed":
        if code.startswith("PX_SEM_"):
            return BUCKET_SEMANTIC
        return BUCKET_STRUCTURE

    if phase in ("envelope", "handoff") or formal == "policy":
        return BUCKET_STRUCTURE

    if formal == "kind_type":
        if code.startswith("PX_IR_"):
            return BUCKET_STRUCTURE
        if code.startswith("PX_SEM_"):
            return BUCKET_SEMANTIC
        return BUCKET_STRUCTURE

    if phase == "structural":
        if code.startswith("PX_IR_"):
            return BUCKET_STRUCTURE
        return BUCKET_STRUCTURE

    if phase == "determinism":
        return BUCKET_STRUCTURE

    return BUCKET_STRUCTURE


def classify_parse_stage_exception(exc: BaseException) -> str:
    """``.tq`` / JSON / pxir load failures before IR validation."""
    from src.surface.parse_tq import TQParseError

    if isinstance(exc, TQParseError):
        return BUCKET_SYNTAX
    # json.JSONDecodeError, UnicodeDecodeError, ValueError from load
    return BUCKET_SYNTAX
