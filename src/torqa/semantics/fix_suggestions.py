"""Structured fix hints for common semantic failures (mutation-oriented where possible)."""

from __future__ import annotations

import re
from typing import Any, Dict, List

from torqa.ir.canonical_ir import IRGoal


def build_semantic_fix_suggestions(_ir_goal: IRGoal, semantic_report: Dict[str, Any]) -> List[Dict[str, Any]]:
    errors = list(semantic_report.get("errors") or [])
    suggestions: List[Dict[str, Any]] = []

    for msg in errors:
        s: Dict[str, Any] = {"trigger_message": msg, "kind": "unspecified"}

        if "without a before-state guarantee" in msg and "forbid" in msg:
            m = re.search(r"identifier '([^']+)'", msg)
            ident = m.group(1) if m else None
            s["kind"] = "forbid_missing_before_guarantee"
            s["hint"] = (
                "Add a require precondition that establishes this identifier in before-state "
                "(e.g. exists(...) or a predicate that registers a before guarantee)."
            )
            if ident:
                s["example_mutation"] = {
                    "mutation_type": "add_precondition",
                    "target": None,
                    "payload": {
                        "condition_id": "c_req_NEW",
                        "expr": {"type": "call", "name": "exists", "arguments": [{"type": "identifier", "name": ident}]},
                    },
                }

        elif "read by transition" in msg and "no before-state guarantee" in msg:
            m = re.search(r"identifier '([^']+)'", msg)
            ident = m.group(1) if m else None
            s["kind"] = "transition_read_missing_guarantee"
            s["hint"] = "Ensure a precondition provides a before guarantee for identifiers read by this effect."
            if ident:
                s["example_mutation"] = {
                    "mutation_type": "add_precondition",
                    "target": None,
                    "payload": {
                        "condition_id": "c_req_NEW",
                        "expr": {"type": "call", "name": "exists", "arguments": [{"type": "identifier", "name": ident}]},
                    },
                }

        elif "wrong arity" in msg:
            s["kind"] = "wrong_arity"
            s["hint"] = "Adjust call/effect arguments to match the function registry signature."

        elif "unknown function" in msg or "unknown effect" in msg:
            s["kind"] = "unknown_symbol"
            s["hint"] = "Register the function in the semantic registry or rename to a known builtin."

        elif "duplicate equivalent" in msg or "Semantic determinism" in msg:
            s["kind"] = "duplicate_condition_or_transition"
            s["hint"] = "Remove or merge duplicate conditions/transitions under normalized equality."

        elif "transitions are defined but result text is empty" in msg:
            s["kind"] = "missing_result"
            s["hint"] = "Set ir_goal.result to a non-empty human-readable outcome label."

        suggestions.append(s)

    return suggestions
