"""
Short fix hints + doc pointers for frequent diagnostic codes (web UI / CLI).
"""

from __future__ import annotations

from typing import Any, Dict, Optional, TypedDict


class HintPayload(TypedDict, total=False):
    hint: str
    doc: str


HINTS_BY_CODE: Dict[str, HintPayload] = {
    "PX_IR_GOAL_EMPTY": {
        "hint": "Set ir_goal.goal to a non-empty PascalCase ASCII identifier (e.g. UserLoginFlow).",
        "doc": "docs/FORMAL_CORE.md#42-kind--type-phase",
    },
    "PX_IR_METADATA": {
        "hint": "Ensure ir_goal.metadata includes ir_version (must match toolchain), source, and canonical_language.",
        "doc": "docs/FORMAL_CORE.md#42-kind--type-phase",
    },
    "PX_SEM_UNKNOWN_FUNCTION": {
        "hint": "Use only names from default_ir_function_registry; run `torqa language` for the current list.",
        "doc": "docs/FORMAL_CORE.md#42-kind--type-phase",
    },
    "PX_SEM_UNKNOWN_EFFECT": {
        "hint": "Transition effect_name must be a void builtin with matching arity; see `torqa language`.",
        "doc": "docs/FORMAL_CORE.md#42-kind--type-phase",
    },
    "PX_IR_CONDITION_ID_COLLISION": {
        "hint": "condition_id values must be unique across preconditions, forbids, and postconditions.",
        "doc": "docs/FORMAL_CORE.md#43-well-formedness-phase",
    },
}


def augment_issue(issue: Dict[str, Any]) -> Dict[str, Any]:
    code = issue.get("code")
    if not isinstance(code, str):
        return issue
    extra: Optional[HintPayload] = HINTS_BY_CODE.get(code)
    if not extra:
        return issue
    out = dict(issue)
    if "hint" not in out and "hint" in extra:
        out["hint"] = extra["hint"]
    if "doc" not in out and "doc" in extra:
        out["doc"] = extra["doc"]
    return out
