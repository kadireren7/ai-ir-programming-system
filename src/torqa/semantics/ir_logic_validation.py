"""
P112: Deterministic logic validation over canonical IR (beyond kind/type and registry checks).

Catches unreachable transitions, bad control-state ordering, missing supporting effects for
postconditions, non-terminating success paths, and contradictory equality preconditions.
"""

from __future__ import annotations

from typing import Any, Dict, List, Set, Tuple

from torqa.ir.canonical_ir import (
    IRBinary,
    IRBooleanLiteral,
    IRCall,
    IRGoal,
    IRIdentifier,
    IRLogical,
    IRNumberLiteral,
    IRStringLiteral,
    IRExpr,
)

# Postcondition calls that only make sense if listed effects ran (minimal built-in map).
_POSTCONDITION_IMPLIED_EFFECTS: Dict[str, Set[str]] = {
    "session_stored_for_user": {"start_session"},
}


def _literal_atom(expr: IRExpr) -> Any:
    if isinstance(expr, IRStringLiteral):
        return expr.value
    if isinstance(expr, IRNumberLiteral):
        v = expr.value
        if isinstance(v, float) and v.is_integer():
            return int(v)
        return v
    if isinstance(expr, IRBooleanLiteral):
        return bool(expr.value)
    return None


def _extract_eq_identifier_literal_pairs(expr: IRExpr) -> List[Tuple[str, Any]]:
    """Collect (identifier, literal) pairs from == subtrees (including under logical and)."""
    out: List[Tuple[str, Any]] = []
    if isinstance(expr, IRBinary) and expr.operator == "==":
        lit_l = _literal_atom(expr.left)
        lit_r = _literal_atom(expr.right)
        if isinstance(expr.left, IRIdentifier) and lit_r is not None:
            out.append((expr.left.name, lit_r))
        elif isinstance(expr.right, IRIdentifier) and lit_l is not None:
            out.append((expr.right.name, lit_l))
        return out
    if isinstance(expr, IRLogical) and expr.operator == "and":
        out.extend(_extract_eq_identifier_literal_pairs(expr.left))
        out.extend(_extract_eq_identifier_literal_pairs(expr.right))
        return out
    if isinstance(expr, IRCall):
        for a in expr.arguments:
            out.extend(_extract_eq_identifier_literal_pairs(a))
    return out


def _postcondition_top_calls(expr: IRExpr) -> List[str]:
    if isinstance(expr, IRCall):
        return [expr.name]
    if isinstance(expr, IRLogical) and expr.operator == "and":
        return _postcondition_top_calls(expr.left) + _postcondition_top_calls(expr.right)
    return []


def validate_transition_control_flow(ir_goal: IRGoal) -> List[str]:
    """
    Simulate σ through ordered transitions. Any from_state mismatch is unreachable (logic error).
    """
    errors: List[str] = []
    sigma = "before"
    for i, t in enumerate(ir_goal.transitions):
        p = f"transitions[{i}]({t.transition_id})"
        if t.from_state != sigma:
            errors.append(
                "IR logic: transition "
                f"{p} (effect_name={t.effect_name!r}) is unreachable: "
                f"requires from_state={t.from_state!r} but control state σ is {sigma!r}. "
                "Reorder transitions or fix from_state/to_state so each step matches the prior σ."
            )
        sigma = t.to_state
    return errors


def validate_success_path_terminates(ir_goal: IRGoal) -> List[str]:
    """
    If postconditions are checked at finish, execution requires σ=='after' (see ir_execution).
    Only runs when the control chain is consistent (no unreachable steps).
    """
    errors: List[str] = []
    if not ir_goal.postconditions:
        return errors
    sigma = "before"
    for t in ir_goal.transitions:
        if t.from_state != sigma:
            return errors
        sigma = t.to_state
    if sigma != "after":
        errors.append(
            "IR logic: postconditions are present but the transition chain does not end in state "
            f"'after' (final σ={sigma!r}). Add or reorder transitions so the success path reaches "
            "'after' before postconditions are evaluated."
        )
    return errors


def validate_login_audit_order(ir_goal: IRGoal) -> List[str]:
    """log_successful_login must come after start_session in the transition list."""
    errors: List[str] = []
    names = [t.effect_name for t in ir_goal.transitions]
    if "log_successful_login" not in names:
        return errors
    if "start_session" not in names:
        errors.append(
            "IR logic: transition log_successful_login is present but start_session is missing. "
            "Model a session before logging a successful login."
        )
        return errors
    i_log = names.index("log_successful_login")
    i_sess = names.index("start_session")
    if i_sess > i_log:
        errors.append(
            "IR logic: start_session must appear before log_successful_login in transitions[]. "
            f"Found start_session at index {i_sess} but log_successful_login at {i_log}."
        )
    return errors


def validate_postcondition_support(ir_goal: IRGoal) -> List[str]:
    """Ensure postcondition calls have required backing transitions."""
    errors: List[str] = []
    present = {t.effect_name for t in ir_goal.transitions}
    for c in ir_goal.postconditions:
        for call_name in _postcondition_top_calls(c.expr):
            needed = _POSTCONDITION_IMPLIED_EFFECTS.get(call_name)
            if not needed:
                continue
            missing = sorted(needed - present)
            if missing:
                errors.append(
                    f"IR logic: postcondition {c.condition_id} uses {call_name!r} but required "
                    f"effect(s) are missing from transitions: {', '.join(missing)}."
                )
    return errors


def validate_contradictory_preconditions(ir_goal: IRGoal) -> List[str]:
    """Detect incompatible == constraints on the same identifier across preconditions."""
    errors: List[str] = []
    merged: Dict[str, Any] = {}
    for c in ir_goal.preconditions:
        for ident, val in _extract_eq_identifier_literal_pairs(c.expr):
            if ident in merged and merged[ident] != val:
                errors.append(
                    "IR logic: contradictory preconditions on "
                    f"{ident!r}: {merged[ident]!r} vs {val!r} "
                    f"(conditions include {ident!r} == both values; all preconditions must hold)."
                )
            else:
                merged[ident] = val
    return errors


def _source_map(ir_goal: IRGoal) -> Dict[str, Any]:
    sm = ir_goal.metadata.get("source_map")
    return sm if isinstance(sm, dict) else {}


def validate_optional_metadata_constraints(ir_goal: IRGoal) -> List[str]:
    """
    Optional ``metadata.source_map.logic_required_effects``: list of effect_name strings that
    must each appear at least once in ``transitions[]`` (for generated bundles / policies).
    """
    errors: List[str] = []
    sm = _source_map(ir_goal)
    raw = sm.get("logic_required_effects")
    if not isinstance(raw, list) or not raw:
        return errors
    present = {t.effect_name for t in ir_goal.transitions}
    for item in raw:
        if not isinstance(item, str) or not item.strip():
            errors.append(
                "IR logic: metadata.source_map.logic_required_effects must be a list of "
                "non-empty strings (effect_name values)."
            )
            continue
        name = item.strip()
        if name not in present:
            errors.append(
                f"IR logic: required effect {name!r} from metadata.source_map.logic_required_effects "
                "is missing from transitions[]."
            )
    return errors


def validate_tq_model_matches_inputs(ir_goal: IRGoal) -> List[str]:
    """
    If ``metadata.source_map.tq_model`` lists field dicts with ``name``, every name must exist
    in ``inputs[]`` (prevents stale or typo field specs on generated bundles).
    """
    errors: List[str] = []
    sm = _source_map(ir_goal)
    raw = sm.get("tq_model")
    if not isinstance(raw, list) or not raw:
        return errors
    input_names = {inp.name for inp in ir_goal.inputs}
    for i, row in enumerate(raw):
        if not isinstance(row, dict):
            errors.append(
                f"IR logic: metadata.source_map.tq_model[{i}] must be an object with at least "
                f"a 'name' field; got {type(row).__name__}."
            )
            continue
        n = row.get("name")
        if not isinstance(n, str) or not n.strip():
            errors.append(
                f"IR logic: metadata.source_map.tq_model[{i}] has missing or invalid 'name'."
            )
            continue
        if n not in input_names:
            errors.append(
                f"IR logic: metadata.source_map.tq_model references unknown input {n!r}; "
                "each model field name must match an ir_goal.inputs[].name."
            )
    return errors


def validate_ir_goal_logic(ir_goal: IRGoal) -> List[str]:
    """Run all P112 logic checks; messages are stable prefixes for ``classify_message``."""
    out: List[str] = []
    out.extend(validate_transition_control_flow(ir_goal))
    out.extend(validate_success_path_terminates(ir_goal))
    out.extend(validate_login_audit_order(ir_goal))
    out.extend(validate_postcondition_support(ir_goal))
    out.extend(validate_contradictory_preconditions(ir_goal))
    out.extend(validate_optional_metadata_constraints(ir_goal))
    out.extend(validate_tq_model_matches_inputs(ir_goal))
    return out


__all__ = [
    "validate_ir_goal_logic",
    "validate_transition_control_flow",
    "validate_success_path_terminates",
    "validate_login_audit_order",
    "validate_postcondition_support",
    "validate_contradictory_preconditions",
    "validate_optional_metadata_constraints",
    "validate_tq_model_matches_inputs",
]
