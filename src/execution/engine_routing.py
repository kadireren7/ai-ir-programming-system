from __future__ import annotations

# TODO(P18+ / Rust concentration): Prefer moving validation + execution hot paths behind a
# stable Rust core API; keep Python as mode/routing glue and fallback only.

from typing import Any, Dict, List, Tuple

from src.ir.canonical_ir import (
    IRGoal,
    compute_ir_fingerprint,
    ir_goal_to_json,
    validate_ir,
    validate_ir_handoff_compatibility,
)
from src.execution.ir_execution import (
    IRExecutionContext,
    default_ir_runtime_impls,
    execute_ir_goal,
    ir_execution_plan_to_json,
    ir_execution_result_to_json,
)
from src.semantics.ir_semantics import build_ir_semantic_report, default_ir_function_registry
from src.bridge.rust_bridge import rust_full_pipeline


ENGINE_MODES = {"python_only", "rust_preferred", "rust_only"}


def route_to_engine(capability: str, mode: str = "rust_preferred") -> str:
    if mode not in ENGINE_MODES:
        raise ValueError(f"Unknown engine mode: {mode!r}")
    if mode == "python_only":
        return "python"
    if mode == "rust_only":
        return "rust"
    if capability in {
        "validation",
        "handoff_compatibility",
        "semantic_analysis",
        "guarantee_extraction",
        "execution_planning",
        "execution",
        "after_state_summary",
    }:
        return "rust"
    if capability == "projection_strategy":
        return "python"
    return "python"


def fallback_to_python(ir_goal: IRGoal, demo_inputs: Dict[str, Any]) -> Dict[str, Any]:
    reg = default_ir_function_registry()
    validation_errors = validate_ir(ir_goal)
    handoff_errors = validate_ir_handoff_compatibility(ir_goal)
    fingerprint = compute_ir_fingerprint(ir_goal)
    semantic_report = build_ir_semantic_report(ir_goal, reg)
    ir_ctx = IRExecutionContext(inputs=dict(demo_inputs), world_state={})
    ir_exec_result, ir_exec_plan = execute_ir_goal(
        ir_goal, ir_ctx, reg, default_ir_runtime_impls()
    )
    return {
        "ir_valid": len(validation_errors) == 0 and len(handoff_errors) == 0,
        "validation_errors": list(validation_errors + handoff_errors),
        "semantic_errors": list(semantic_report.get("errors") or []),
        "semantic_warnings": list(semantic_report.get("warnings") or []),
        "fingerprint": fingerprint,
        "semantic_report": semantic_report,
        "guarantee_table": semantic_report.get("guarantee_table", {}),
        "execution": {
            "execution_plan": ir_execution_plan_to_json(ir_exec_plan),
            "execution_result": ir_execution_result_to_json(ir_exec_result),
        },
    }


def compare_rust_and_python_pipeline(
    ir_goal: IRGoal,
    demo_inputs: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    inputs = dict(demo_inputs or {})
    ir_env = ir_goal_to_json(ir_goal)
    py_result = fallback_to_python(ir_goal, inputs)
    rust_resp = rust_full_pipeline(ir_env, {"inputs": inputs, "world_state": {}})
    rust_result = rust_resp.get("result", {}) if rust_resp.get("ok") else {}
    rust_exec = rust_result.get("execution_result") or {}
    py_exec = (py_result.get("execution") or {}).get("execution_result") or {}

    checks = {
        "validation_pass_fail": bool(py_result.get("ir_valid")) == bool(rust_result.get("ir_valid")),
        "semantic_errors_warnings": (
            list(py_result.get("semantic_errors") or []) == list(rust_result.get("semantic_errors") or [])
            and list(py_result.get("semantic_warnings") or [])
            == list(rust_result.get("semantic_warnings") or [])
        ),
        "guarantee_tables": (
            py_result.get("guarantee_table", {})
            == (rust_result.get("semantic_report") or {}).get("guarantee_table", {})
        ),
        "execution_success_failure": bool(py_exec.get("success")) == bool(rust_exec.get("success")),
        "result_text": py_exec.get("result_text") == rust_exec.get("result_text"),
        "executed_transition_count": len(py_exec.get("executed_transitions") or [])
        == len(rust_exec.get("executed_transitions") or []),
        "after_state_summary_keys": sorted((py_exec.get("after_state_summary") or {}).keys())
        == sorted((rust_exec.get("after_state_summary") or {}).keys()),
    }

    return {
        "parity_ok": all(checks.values()),
        "checks": checks,
        "python": {
            "ir_valid": py_result.get("ir_valid"),
            "semantic_errors": py_result.get("semantic_errors"),
            "semantic_warnings": py_result.get("semantic_warnings"),
            "guarantee_table": py_result.get("guarantee_table"),
            "execution_result": py_exec,
        },
        "rust": {
            "bridge_ok": bool(rust_resp.get("ok")),
            "error": rust_resp.get("error"),
            "ir_valid": rust_result.get("ir_valid"),
            "semantic_errors": rust_result.get("semantic_errors"),
            "semantic_warnings": rust_result.get("semantic_warnings"),
            "guarantee_table": (rust_result.get("semantic_report") or {}).get("guarantee_table", {}),
            "execution_result": rust_exec,
        },
    }


def run_rust_pipeline_with_fallback(
    ir_goal: IRGoal,
    demo_inputs: Dict[str, Any],
    mode: str = "rust_preferred",
) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
    if mode not in ENGINE_MODES:
        raise ValueError(f"Unknown engine mode: {mode!r}")

    routing = {
        "mode": mode,
        "validation": route_to_engine("validation", mode),
        "handoff_compatibility": route_to_engine("handoff_compatibility", mode),
        "semantic_analysis": route_to_engine("semantic_analysis", mode),
        "guarantee_extraction": route_to_engine("guarantee_extraction", mode),
        "execution_planning": route_to_engine("execution_planning", mode),
        "execution": route_to_engine("execution", mode),
        "after_state_summary": route_to_engine("after_state_summary", mode),
        "projection_strategy": route_to_engine("projection_strategy", mode),
        "fallback": "python",
    }

    rust_output: Dict[str, Any] = {}
    fallback_status: Dict[str, Any] = {
        "used": False,
        "reason": "",
        "consistency_errors": [],
    }

    if routing["semantic_analysis"] == "rust" or routing["execution"] == "rust":
        rust_resp = rust_full_pipeline(
            ir_goal_to_json(ir_goal), {"inputs": dict(demo_inputs), "world_state": {}}
        )
        if rust_resp.get("ok"):
            rust_output = rust_resp.get("result", {})
        else:
            rust_output = {"error": rust_resp.get("error"), "detail": rust_resp.get("stderr")}

    rust_failed = not rust_output or "error" in rust_output
    if rust_failed and mode == "rust_only":
        fallback_status["used"] = False
        fallback_status["reason"] = "Rust failed and mode is rust_only."
        return routing, rust_output, fallback_status

    if rust_failed:
        fallback_status["used"] = True
        fallback_status["reason"] = "Rust failed, switched to Python fallback."
        py_result = fallback_to_python(ir_goal, demo_inputs)
        fallback_status["python_result"] = py_result
        return routing, rust_output, fallback_status

    if mode == "python_only":
        fallback_status["used"] = True
        fallback_status["reason"] = "Mode forced python_only."
        py_result = fallback_to_python(ir_goal, demo_inputs)
        fallback_status["python_result"] = py_result
        return routing, rust_output, fallback_status

    parity = compare_rust_and_python_pipeline(ir_goal, demo_inputs)
    fallback_status["parity_summary"] = {
        "parity_ok": parity["parity_ok"],
        "checks": parity["checks"],
    }
    fallback_status["consistency_errors"] = [
        key for key, passed in parity["checks"].items() if not passed
    ]
    return routing, rust_output, fallback_status
