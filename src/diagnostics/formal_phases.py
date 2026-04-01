"""
Map PX_* codes + legacy pipeline phases to FORMAL_CORE validation phase IDs.

Normative phase order: syntax → kind_type → wellformed → policy.
See docs/FORMAL_CORE.md §2 and §4.
"""

from __future__ import annotations

from typing import List

import src.diagnostics.codes as c

# syntax
_SYNTAX = frozenset({c.PX_PARSE_FAILED, c.PX_SCHEMA_INVALID, c.PX_IR_EXPR})

# wellformed (cross-field / determinism / guarantee rules)
_WELLFORMED = frozenset(
    {
        c.PX_IR_CONDITION_ID_COLLISION,
        c.PX_IR_SEMANTIC_DETERMINISM,
        c.PX_SEM_FORBID_GUARANTEE,
        c.PX_SEM_TRANSITION_READ,
    }
)

# kind_type: structural IR shape (KT*) + semantic registry (except wellformed overlap)
_KIND_TYPE_STRUCTURAL = frozenset(
    {
        c.PX_IR_GOAL_EMPTY,
        c.PX_IR_INPUT_DUPLICATE,
        c.PX_IR_INPUT_TYPE,
        c.PX_IR_PRECONDITION_KIND,
        c.PX_IR_PRECONDITION_ID,
        c.PX_IR_FORBID_KIND,
        c.PX_IR_FORBID_ID,
        c.PX_IR_POSTCONDITION_KIND,
        c.PX_IR_POSTCONDITION_ID,
        c.PX_IR_TRANSITION_ID,
        c.PX_IR_TRANSITION_DUPLICATE,
        c.PX_IR_TRANSITION_STATE,
        c.PX_IR_METADATA,
        c.PX_SEM_UNKNOWN_FUNCTION,
        c.PX_SEM_ARITY,
        c.PX_SEM_TYPE,
        c.PX_SEM_UNDEFINED_IDENT,
        c.PX_SEM_UNKNOWN_EFFECT,
        c.PX_SEM_LOGICAL_OPERAND,
        c.PX_SEM_COMPARISON,
    }
)


def formal_phase_for_issue(code: str, legacy_phase: str) -> str:
    """
    Return one of: syntax | kind_type | wellformed | policy.
    legacy_phase is the internal report bucket (structural, semantic, envelope, ...).
    """
    if legacy_phase == "envelope":
        return "policy"
    if legacy_phase == "handoff":
        return "policy"
    if legacy_phase == "ai":
        return "policy"
    if legacy_phase == "determinism":
        return "wellformed"

    if code in _SYNTAX:
        return "syntax"
    if code in _WELLFORMED:
        return "wellformed"
    if code in _KIND_TYPE_STRUCTURAL:
        return "kind_type"

    if legacy_phase in ("semantic", "semantic_warning"):
        return "kind_type"

    if legacy_phase == "structural":
        # Unclassified structural strings → kind_type per FORMAL_CORE KT bucket
        return "kind_type"

    return "kind_type"


def annotate_with_formal(messages: List[str], *, legacy_phase: str) -> List[dict]:
    from src.diagnostics.codes import classify_message

    out: List[dict] = []
    for msg in messages:
        code = classify_message(msg)
        out.append(
            {
                "code": code,
                "phase": legacy_phase,
                "formal_phase": formal_phase_for_issue(code, legacy_phase),
                "message": msg,
            }
        )
    return out
