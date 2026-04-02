import json
from pathlib import Path

from src.diagnostics.aem_codes import AEM_STATE_MISMATCH
from src.execution.ir_execution import (
    IRExecutionContext,
    default_ir_runtime_impls,
    execute_ir_goal,
    ir_execution_result_to_json,
)
from src.ir.canonical_ir import ir_goal_from_json
from src.semantics.ir_semantics import default_ir_function_registry

REPO = Path(__file__).resolve().parents[1]


def test_execution_result_includes_aem_codes_key():
    raw = json.loads((REPO / "examples/core/valid_minimal_flow.json").read_text(encoding="utf-8"))
    g = ir_goal_from_json(raw)
    res, _plan = execute_ir_goal(
        g, IRExecutionContext({"username": "a"}, {}), default_ir_function_registry(), default_ir_runtime_impls()
    )
    j = ir_execution_result_to_json(res)
    assert "aem_codes" in j
    assert j["success"] is True
    assert j["aem_codes"] == []


def test_session_postcondition_passes_after_start_session():
    raw = json.loads(
        (REPO / "examples/core/valid_session_postcondition_flow.json").read_text(encoding="utf-8")
    )
    g = ir_goal_from_json(raw)
    res, _plan = execute_ir_goal(
        g,
        IRExecutionContext({"username": "alice"}, {}),
        default_ir_function_registry(),
        default_ir_runtime_impls(),
    )
    assert res.success is True, res.errors


def test_second_transition_wrong_from_state_fails_aem():
    raw = json.loads((REPO / "examples/core/valid_login_flow.json").read_text(encoding="utf-8"))
    g = ir_goal_from_json(raw)
    # Break AEM: second transition must start from "after" once σ is after
    g.transitions[1].from_state = "before"
    res, _plan = execute_ir_goal(
        g,
        IRExecutionContext(
            {"username": "u", "password": "p", "ip_address": "1.1.1.1"}, {}
        ),
        default_ir_function_registry(),
        default_ir_runtime_impls(),
    )
    assert res.success is False
    assert AEM_STATE_MISMATCH in res.aem_codes
