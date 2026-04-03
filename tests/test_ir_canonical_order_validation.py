"""Structural IR rules: deterministic id ordering and unambiguous transition graph."""

from __future__ import annotations

import copy
from typing import Any, Dict

from src.diagnostics.codes import PX_IR_CANONICAL_ORDER, PX_IR_TRANSITION_AMBIGUOUS, classify_message
from src.ir.canonical_ir import ir_goal_from_json, validate_ir

_MD: Dict[str, Any] = {
    "ir_version": "1.4",
    "source": "python_prototype",
    "canonical_language": "english",
    "source_map": {"available": True, "prototype_only": True},
}

_EXISTS_U: Dict[str, Any] = {
    "type": "call",
    "name": "exists",
    "arguments": [{"type": "identifier", "name": "username"}],
}


def _base_ir_goal(**overrides: Any) -> Dict[str, Any]:
    g: Dict[str, Any] = {
        "goal": "TestGoal",
        "inputs": [{"name": "username", "type": "text"}],
        "preconditions": [
            {
                "condition_id": "c_req_0001",
                "kind": "require",
                "expr": _EXISTS_U,
            }
        ],
        "forbids": [],
        "transitions": [],
        "postconditions": [],
        "result": "OK",
        "metadata": copy.deepcopy(_MD),
    }
    g.update(overrides)
    return g


def test_validate_ir_rejects_preconditions_out_of_numeric_order() -> None:
    raw = _base_ir_goal(
        preconditions=[
            {
                "condition_id": "c_req_0002",
                "kind": "require",
                "expr": _EXISTS_U,
            },
            {
                "condition_id": "c_req_0001",
                "kind": "require",
                "expr": _EXISTS_U,
            },
        ]
    )
    g = ir_goal_from_json({"ir_goal": raw})
    errs = validate_ir(g)
    assert any("ascending by numeric suffix" in e for e in errs)
    assert classify_message(errs[0]) == PX_IR_CANONICAL_ORDER


def test_validate_ir_rejects_two_before_to_after_transitions() -> None:
    trans = [
        {
            "transition_id": "t_0001",
            "effect_name": "start_session",
            "arguments": [{"type": "identifier", "name": "username"}],
            "from_state": "before",
            "to_state": "after",
        },
        {
            "transition_id": "t_0002",
            "effect_name": "log_successful_login",
            "arguments": [
                {"type": "identifier", "name": "username"},
                {"type": "identifier", "name": "ip_address"},
            ],
            "from_state": "before",
            "to_state": "after",
        },
    ]
    raw = _base_ir_goal(
        inputs=[
            {"name": "username", "type": "text"},
            {"name": "password", "type": "text"},
            {"name": "ip_address", "type": "text"},
        ],
        preconditions=[
            {
                "condition_id": "c_req_0001",
                "kind": "require",
                "expr": _EXISTS_U,
            },
            {
                "condition_id": "c_req_0002",
                "kind": "require",
                "expr": {
                    "type": "call",
                    "name": "exists",
                    "arguments": [{"type": "identifier", "name": "password"}],
                },
            },
            {
                "condition_id": "c_req_0003",
                "kind": "require",
                "expr": {
                    "type": "call",
                    "name": "exists",
                    "arguments": [{"type": "identifier", "name": "ip_address"}],
                },
            },
        ],
        transitions=trans,
    )
    g = ir_goal_from_json({"ir_goal": raw})
    errs = validate_ir(g)
    amb = [e for e in errs if "at most one transition" in e]
    assert len(amb) == 1
    assert classify_message(amb[0]) == PX_IR_TRANSITION_AMBIGUOUS


def test_validate_ir_accepts_chained_after_state_transitions() -> None:
    trans = [
        {
            "transition_id": "t_0001",
            "effect_name": "start_session",
            "arguments": [{"type": "identifier", "name": "username"}],
            "from_state": "before",
            "to_state": "after",
        },
        {
            "transition_id": "t_0002",
            "effect_name": "log_successful_login",
            "arguments": [
                {"type": "identifier", "name": "username"},
                {"type": "identifier", "name": "ip_address"},
            ],
            "from_state": "after",
            "to_state": "after",
        },
    ]
    raw = _base_ir_goal(
        inputs=[
            {"name": "username", "type": "text"},
            {"name": "password", "type": "text"},
            {"name": "ip_address", "type": "text"},
        ],
        preconditions=[
            {
                "condition_id": "c_req_0001",
                "kind": "require",
                "expr": _EXISTS_U,
            },
            {
                "condition_id": "c_req_0002",
                "kind": "require",
                "expr": {
                    "type": "call",
                    "name": "exists",
                    "arguments": [{"type": "identifier", "name": "password"}],
                },
            },
            {
                "condition_id": "c_req_0003",
                "kind": "require",
                "expr": {
                    "type": "call",
                    "name": "exists",
                    "arguments": [{"type": "identifier", "name": "ip_address"}],
                },
            },
        ],
        transitions=trans,
    )
    g = ir_goal_from_json({"ir_goal": raw})
    errs = validate_ir(g)
    assert not any("at most one transition" in e for e in errs)
