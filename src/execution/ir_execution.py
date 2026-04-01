"""
IR-native execution semantics (V1.4).

Depends only on canonical IR + IR semantic registry/guarantees.
No parser AST, CoreGoal, or CLI bindings.
Used as Python fallback/debug parity path while Rust is preferred execution engine.
"""

from __future__ import annotations

import inspect
from typing import Any, Dict, List, Optional, Set, Tuple

from src.ir.canonical_ir import (
    IRBinary,
    IRBooleanLiteral,
    IRCall,
    IRExpr,
    IRGoal,
    IRIdentifier,
    IRLogical,
    IRNumberLiteral,
    IRStringLiteral,
    IRTransition,
)
from src.diagnostics.aem_codes import (
    AEM_EFFECT_EXN,
    AEM_EFFECT_REJECT,
    AEM_FORBID_TRUE,
    AEM_POSTCOND_FALSE,
    AEM_PRECOND_FALSE,
    AEM_STATE_MISMATCH,
)
from src.semantics.ir_semantics import (
    IRFunctionSignature,
    build_ir_guarantee_table,
    default_ir_function_registry,
    extract_ir_identifiers_from_args,
)


class IRExecutionContext:
    def __init__(self, inputs: dict, world_state: Optional[dict] = None):
        self.inputs = inputs
        self.world_state = world_state or {}


class IRExecutionStep:
    def __init__(self, step_id: str, kind: str, ref_id: str, status: str = "pending"):
        self.step_id = step_id
        self.kind = kind  # "precondition" | "forbid" | "transition" | "finish"
        self.ref_id = ref_id  # condition_id | transition_id | "finish"
        self.status = status


class IRExecutionPlan:
    def __init__(self, steps: List[IRExecutionStep]):
        self.steps = steps


class IRExecutionResult:
    def __init__(
        self,
        success: bool,
        result_text: Optional[str],
        executed_transitions: List[str],
        failed_step: Optional[IRExecutionStep] = None,
        errors: Optional[List[str]] = None,
        after_state_summary: Optional[dict] = None,
        aem_codes: Optional[List[str]] = None,
    ):
        self.success = success
        self.result_text = result_text
        self.executed_transitions = executed_transitions
        self.failed_step = failed_step
        self.errors = errors or []
        self.after_state_summary = after_state_summary or {}
        self.aem_codes = list(aem_codes or [])


def build_ir_execution_plan(ir_goal: IRGoal) -> IRExecutionPlan:
    steps: List[IRExecutionStep] = []
    i = 1
    for c in ir_goal.preconditions:
        steps.append(IRExecutionStep(f"s_{i:04d}", "precondition", c.condition_id))
        i += 1
    for c in ir_goal.forbids:
        steps.append(IRExecutionStep(f"s_{i:04d}", "forbid", c.condition_id))
        i += 1
    for t in ir_goal.transitions:
        steps.append(IRExecutionStep(f"s_{i:04d}", "transition", t.transition_id))
        i += 1
    steps.append(IRExecutionStep(f"s_{i:04d}", "finish", "finish"))
    return IRExecutionPlan(steps)


def _resolve_identifier(name: str, context: IRExecutionContext) -> Any:
    if name in context.inputs:
        return context.inputs[name]
    return context.world_state.get(name)


def _invoke_runtime(fn: Any, args: List[Any], context: IRExecutionContext) -> Any:
    try:
        sig = inspect.signature(fn)
        params = sig.parameters
        if "ctx" in params:
            return fn(*args, ctx=context)
        if "context" in params:
            return fn(*args, context=context)
    except (TypeError, ValueError):
        pass
    return fn(*args)


def evaluate_ir_expr(
    expr: IRExpr,
    context: IRExecutionContext,
    function_registry: Dict[str, IRFunctionSignature],
    runtime_impls: Dict[str, Any],
) -> Any:
    _ = function_registry
    if isinstance(expr, IRIdentifier):
        return _resolve_identifier(expr.name, context)
    if isinstance(expr, IRStringLiteral):
        return expr.value
    if isinstance(expr, IRNumberLiteral):
        v = expr.value
        if isinstance(v, float) and v.is_integer():
            return int(v)
        return v
    if isinstance(expr, IRBooleanLiteral):
        return bool(expr.value)
    if isinstance(expr, IRCall):
        fn = runtime_impls.get(expr.name)
        if fn is None:
            raise RuntimeError(f"No runtime implementation for '{expr.name}'")
        args = [
            evaluate_ir_expr(a, context, function_registry, runtime_impls)
            for a in expr.arguments
        ]
        return _invoke_runtime(fn, args, context)
    if isinstance(expr, IRBinary):
        L = evaluate_ir_expr(expr.left, context, function_registry, runtime_impls)
        R = evaluate_ir_expr(expr.right, context, function_registry, runtime_impls)
        op = expr.operator
        if op == "==":
            return L == R
        if op == "!=":
            return L != R
        if op == ">":
            return L > R
        if op == "<":
            return L < R
        if op == ">=":
            return L >= R
        if op == "<=":
            return L <= R
        raise RuntimeError(f"Unsupported binary operator: {op!r}")
    if isinstance(expr, IRLogical):
        op = expr.operator
        if op == "and":
            return bool(
                evaluate_ir_expr(expr.left, context, function_registry, runtime_impls)
            ) and bool(
                evaluate_ir_expr(expr.right, context, function_registry, runtime_impls)
            )
        if op == "or":
            return bool(
                evaluate_ir_expr(expr.left, context, function_registry, runtime_impls)
            ) or bool(
                evaluate_ir_expr(expr.right, context, function_registry, runtime_impls)
            )
        raise RuntimeError(f"Unsupported logical operator: {op!r}")
    raise TypeError(f"Cannot evaluate IR expression type: {type(expr)}")


def default_ir_runtime_impls() -> Dict[str, Any]:
    def log_successful_login(username: str, ip_address: str, ctx: Any = None) -> None:
        if ctx and isinstance(ctx, IRExecutionContext):
            ctx.world_state.setdefault("audit_log", []).append(
                {"event": "login", "username": username, "ip": ip_address}
            )

    def reset_failed_attempts(username: str, ctx: Any = None) -> None:
        if ctx and isinstance(ctx, IRExecutionContext):
            ctx.world_state["failed_attempts_reset_for"] = username

    def start_session(username: str, ctx: Any = None) -> None:
        if ctx and isinstance(ctx, IRExecutionContext):
            ctx.world_state["session_user"] = username

    return {
        "exists": lambda x: x is not None,
        "strings_equal": lambda a, b: str(a) == str(b),
        "verify_username": lambda username: True,
        "verify_password": lambda username, password: True,
        "user_account_status": lambda username: "active",
        "ip_blacklisted": lambda ip_address: False,
        "log_successful_login": log_successful_login,
        "reset_failed_attempts": reset_failed_attempts,
        "start_session": start_session,
    }


def _transition_reads(
    t: IRTransition, function_registry: Dict[str, IRFunctionSignature]
) -> Set[str]:
    sig = function_registry.get(t.effect_name)
    if sig is not None and sig.reads:
        return set(sig.reads)
    return extract_ir_identifiers_from_args(t.arguments)


def _transition_writes(
    t: IRTransition, function_registry: Dict[str, IRFunctionSignature]
) -> Set[str]:
    sig = function_registry.get(t.effect_name)
    if sig is not None and sig.writes:
        return set(sig.writes)
    return set()


def _build_after_state_summary(
    ir_goal: IRGoal,
    executed_transition_ids: List[str],
    function_registry: Dict[str, IRFunctionSignature],
) -> dict:
    gtable = build_ir_guarantee_table(ir_goal, function_registry)
    after = gtable.get("after", {})
    executed_set = set(executed_transition_ids)
    reads: Set[str] = set()
    writes: Set[str] = set()
    guarantees_after: Dict[str, Set[str]] = {}
    for t in ir_goal.transitions:
        if t.transition_id not in executed_set:
            continue
        reads |= _transition_reads(t, function_registry)
        writes |= _transition_writes(t, function_registry)
    for ident, glist in after.items():
        for g in glist:
            if g.source_id in executed_set:
                guarantees_after.setdefault(ident, set()).add(g.guarantee_type)
    return {
        "guarantees": {"after": {k: sorted(v) for k, v in guarantees_after.items()}},
        "reads": sorted(reads),
        "writes": sorted(writes),
    }


def execute_ir_goal(
    ir_goal: IRGoal,
    context: IRExecutionContext,
    function_registry: Optional[Dict[str, IRFunctionSignature]],
    runtime_impls: Dict[str, Any],
) -> Tuple[IRExecutionResult, IRExecutionPlan]:
    reg = function_registry or default_ir_function_registry()
    plan = build_ir_execution_plan(ir_goal)
    pre_by_id = {c.condition_id: c for c in ir_goal.preconditions}
    forbid_by_id = {c.condition_id: c for c in ir_goal.forbids}
    trans_by_id = {t.transition_id: t for t in ir_goal.transitions}
    executed: List[str] = []
    sigma = "before"

    for s in plan.steps:
        try:
            if s.kind == "precondition":
                c = pre_by_id[s.ref_id]
                if not bool(evaluate_ir_expr(c.expr, context, reg, runtime_impls)):
                    s.status = "failed"
                    return (
                        IRExecutionResult(
                            False,
                            None,
                            list(executed),
                            failed_step=s,
                            errors=[f"Precondition {c.condition_id} evaluated to false."],
                            after_state_summary={},
                            aem_codes=[AEM_PRECOND_FALSE],
                        ),
                        plan,
                    )
                s.status = "passed"
            elif s.kind == "forbid":
                c = forbid_by_id[s.ref_id]
                if bool(evaluate_ir_expr(c.expr, context, reg, runtime_impls)):
                    s.status = "failed"
                    return (
                        IRExecutionResult(
                            False,
                            None,
                            list(executed),
                            failed_step=s,
                            errors=[f"Forbid {c.condition_id} evaluated to true."],
                            after_state_summary={},
                            aem_codes=[AEM_FORBID_TRUE],
                        ),
                        plan,
                    )
                s.status = "passed"
            elif s.kind == "transition":
                t = trans_by_id[s.ref_id]
                if sigma != t.from_state:
                    s.status = "failed"
                    return (
                        IRExecutionResult(
                            False,
                            None,
                            list(executed),
                            failed_step=s,
                            errors=[
                                f"Transition {t.transition_id}: control state σ={sigma!r} "
                                f"does not match required from_state={t.from_state!r} (AEM)."
                            ],
                            after_state_summary={},
                            aem_codes=[AEM_STATE_MISMATCH],
                        ),
                        plan,
                    )
                fn = runtime_impls.get(t.effect_name)
                if fn is None:
                    s.status = "failed"
                    return (
                        IRExecutionResult(
                            False,
                            None,
                            list(executed),
                            failed_step=s,
                            errors=[
                                f"No runtime implementation for transition '{t.effect_name}'."
                            ],
                            after_state_summary={},
                            aem_codes=[AEM_EFFECT_REJECT],
                        ),
                        plan,
                    )
                args = [
                    evaluate_ir_expr(a, context, reg, runtime_impls)
                    for a in t.arguments
                ]
                _invoke_runtime(fn, args, context)
                sigma = t.to_state
                executed.append(t.transition_id)
                s.status = "executed"
            elif s.kind == "finish":
                if ir_goal.postconditions:
                    if sigma != "after":
                        s.status = "failed"
                        return (
                            IRExecutionResult(
                                False,
                                None,
                                list(executed),
                                failed_step=s,
                                errors=[
                                    "Postconditions require control state σ='after' "
                                    f"(current σ={sigma!r}) per AEM schedule."
                                ],
                                after_state_summary={},
                                aem_codes=[AEM_STATE_MISMATCH],
                            ),
                            plan,
                        )
                    for c in ir_goal.postconditions:
                        if not bool(
                            evaluate_ir_expr(c.expr, context, reg, runtime_impls)
                        ):
                            s.status = "failed"
                            return (
                                IRExecutionResult(
                                    False,
                                    None,
                                    list(executed),
                                    failed_step=s,
                                    errors=[
                                        f"Postcondition {c.condition_id} evaluated to false."
                                    ],
                                    after_state_summary={},
                                    aem_codes=[AEM_POSTCOND_FALSE],
                                ),
                                plan,
                            )
                s.status = "done"
        except Exception as ex:
            s.status = "failed"
            return (
                IRExecutionResult(
                    False,
                    None,
                    list(executed),
                    failed_step=s,
                    errors=[str(ex)],
                    after_state_summary={},
                    aem_codes=[AEM_EFFECT_EXN],
                ),
                plan,
            )

    return (
        IRExecutionResult(
            True,
            ir_goal.result,
            list(executed),
            after_state_summary=_build_after_state_summary(ir_goal, executed, reg),
            aem_codes=[],
        ),
        plan,
    )


def ir_execution_step_to_json(step: IRExecutionStep) -> dict:
    return {
        "step_id": step.step_id,
        "kind": step.kind,
        "ref_id": step.ref_id,
        "status": step.status,
    }


def ir_execution_plan_to_json(plan: IRExecutionPlan) -> dict:
    return {"steps": [ir_execution_step_to_json(s) for s in plan.steps]}


def ir_execution_result_to_json(result: IRExecutionResult) -> dict:
    out = {
        "success": result.success,
        "result_text": result.result_text,
        "executed_transitions": list(result.executed_transitions),
        "errors": list(result.errors),
        "after_state_summary": dict(result.after_state_summary),
        "aem_codes": list(result.aem_codes),
    }
    out["failed_step"] = (
        ir_execution_step_to_json(result.failed_step)
        if result.failed_step is not None
        else None
    )
    return out
