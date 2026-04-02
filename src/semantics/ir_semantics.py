"""
IR-native semantic analysis (V1.2).

Operates only on canonical IR (IRGoal / IRExpr). No parser AST, tokens, or CLI.
Acts as Python fallback/parity layer while Rust is preferred semantic engine.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Set, Tuple

from src.ir.canonical_ir import (
    IRBinary,
    IRBooleanLiteral,
    IRCall,
    IRCondition,
    IRExpr,
    IRGoal,
    IRIdentifier,
    IRLogical,
    IRNumberLiteral,
    IRStringLiteral,
    IRTransition,
)

# --- IR function registry (semantic boundary, string-typed for JSON/Rust parity) -----------------


class IRAfterGuaranteeSpec:
    def __init__(
        self,
        identifier_source_index: Optional[int] = None,
        guarantee_type: str = "exists",
        equals_literal: Any = None,
    ):
        self.identifier_source_index = identifier_source_index
        self.guarantee_type = guarantee_type
        self.equals_literal = equals_literal


class IRFunctionSignature:
    def __init__(
        self,
        name: str,
        arg_types: List[str],
        return_type: str,
        reads: Optional[List[str]] = None,
        writes: Optional[List[str]] = None,
        guarantees_after: Optional[List[IRAfterGuaranteeSpec]] = None,
    ):
        self.name = name
        self.arg_types = list(arg_types)
        self.return_type = return_type
        self.reads: List[str] = sorted(reads) if reads is not None else []
        self.writes: List[str] = sorted(writes) if writes is not None else []
        self.guarantees_after: List[IRAfterGuaranteeSpec] = (
            list(guarantees_after) if guarantees_after is not None else []
        )


def default_ir_function_registry() -> Dict[str, IRFunctionSignature]:
    T, N, B, V, AB = "text", "number", "boolean", "void", "bound_input"
    return {
        "exists": IRFunctionSignature("exists", [AB], B),
        "verify_username": IRFunctionSignature("verify_username", [T], B),
        "verify_password": IRFunctionSignature("verify_password", [T, T], B),
        "user_account_status": IRFunctionSignature("user_account_status", [T], T),
        "ip_blacklisted": IRFunctionSignature("ip_blacklisted", [T], B),
        "log_successful_login": IRFunctionSignature(
            "log_successful_login",
            [T, T],
            V,
            reads=["username", "ip_address"],
            writes=["audit_log"],
            guarantees_after=[
                IRAfterGuaranteeSpec(0, "exists"),
                IRAfterGuaranteeSpec(1, "exists"),
            ],
        ),
        "reset_failed_attempts": IRFunctionSignature(
            "reset_failed_attempts",
            [T],
            V,
            reads=["username"],
            writes=["failed_login_count"],
            guarantees_after=[IRAfterGuaranteeSpec(0, "exists")],
        ),
        "start_session": IRFunctionSignature(
            "start_session",
            [T],
            V,
            reads=["username"],
            writes=["session_user"],
            guarantees_after=[IRAfterGuaranteeSpec(0, "exists")],
        ),
        "strings_equal": IRFunctionSignature("strings_equal", [T, T], B),
        # Post-login / .tq `ensures session.created`: true when world_state.session_user matches bound username.
        "session_stored_for_user": IRFunctionSignature(
            "session_stored_for_user",
            [T],
            B,
            reads=["session_user"],
        ),
    }


# --- Symbol table -------------------------------------------------------------------------------


def build_ir_symbol_table(ir_goal: IRGoal) -> Dict[str, str]:
    """input_name -> canonical type label. Defensive duplicate rejection."""
    out: Dict[str, str] = {}
    for inp in ir_goal.inputs:
        if inp.name in out:
            raise ValueError(f"IR symbol table: duplicate input name {inp.name!r}.")
        out[inp.name] = inp.type_name
    return out


# --- Identifier extraction ----------------------------------------------------------------------


def extract_ir_identifiers(expr: IRExpr) -> Set[str]:
    if isinstance(expr, IRIdentifier):
        return {expr.name}
    if isinstance(expr, (IRStringLiteral, IRNumberLiteral, IRBooleanLiteral)):
        return set()
    if isinstance(expr, IRCall):
        s: Set[str] = set()
        for a in expr.arguments:
            s |= extract_ir_identifiers(a)
        return s
    if isinstance(expr, IRBinary):
        return extract_ir_identifiers(expr.left) | extract_ir_identifiers(expr.right)
    if isinstance(expr, IRLogical):
        return extract_ir_identifiers(expr.left) | extract_ir_identifiers(expr.right)
    return set()


# --- Type inference -----------------------------------------------------------------------------


def _types_compatible_for_comparison(a: Optional[str], b: Optional[str]) -> bool:
    if a is None or b is None:
        return False
    return a == b


def _arg_matches_expected(
    actual: Optional[str],
    expected: str,
    symbol_table: Dict[str, str],
    arg_expr: IRExpr,
) -> bool:
    if expected == "bound_input":
        if isinstance(arg_expr, IRIdentifier):
            return arg_expr.name in symbol_table
        return actual is not None
    if actual is None:
        return False
    return actual == expected


def infer_ir_expr_type(
    expr: IRExpr,
    symbol_table: Dict[str, str],
    function_registry: Dict[str, IRFunctionSignature],
) -> Optional[str]:
    if isinstance(expr, IRIdentifier):
        t = symbol_table.get(expr.name)
        if t is not None:
            return t
        st = expr.semantic_type
        if st in ("text", "number", "boolean", "void", "unknown", "bound_input"):
            return st
        return None
    if isinstance(expr, IRStringLiteral):
        return "text"
    if isinstance(expr, IRNumberLiteral):
        return "number"
    if isinstance(expr, IRBooleanLiteral):
        return "boolean"
    if isinstance(expr, IRCall):
        sig = function_registry.get(expr.name)
        return sig.return_type if sig else None
    if isinstance(expr, IRBinary):
        if expr.operator in ("==", "!=", "<", ">", "<=", ">="):
            return "boolean"
        return None
    if isinstance(expr, IRLogical):
        if expr.operator in ("and", "or"):
            return "boolean"
        return None
    return None


# --- Guarantees ---------------------------------------------------------------------------------


class IRGuarantee:
    def __init__(
        self,
        identifier: str,
        state: str,
        guarantee_type: str,
        source_id: str,
        equals_value: Any = None,
    ):
        self.identifier = identifier
        self.state = state
        self.guarantee_type = guarantee_type
        self.source_id = source_id
        self.equals_value = equals_value


def _ir_literal_atom(expr: IRExpr) -> Any:
    if isinstance(expr, IRStringLiteral):
        return expr.value
    if isinstance(expr, IRNumberLiteral):
        v = expr.value
        if isinstance(v, float) and v.is_integer():
            return int(v)
        return v
    if isinstance(expr, IRBooleanLiteral):
        return expr.value
    return None


def _guarantees_from_ir_expr(expr: IRExpr, source_id: str) -> List[IRGuarantee]:
    out: List[IRGuarantee] = []
    if isinstance(expr, IRCall):
        if (
            expr.name == "exists"
            and len(expr.arguments) == 1
            and isinstance(expr.arguments[0], IRIdentifier)
        ):
            out.append(
                IRGuarantee(
                    expr.arguments[0].name,
                    "before",
                    "exists",
                    source_id,
                )
            )
        return out
    if isinstance(expr, IRBinary):
        lit_l = _ir_literal_atom(expr.left)
        lit_r = _ir_literal_atom(expr.right)
        if isinstance(expr.left, IRIdentifier) and lit_r is not None:
            gtype = "equals" if expr.operator == "==" else "exists"
            out.append(
                IRGuarantee(expr.left.name, "before", gtype, source_id, lit_r if gtype == "equals" else None)
            )
        elif isinstance(expr.right, IRIdentifier) and lit_l is not None:
            gtype = "equals" if expr.operator == "==" else "exists"
            out.append(
                IRGuarantee(expr.right.name, "before", gtype, source_id, lit_l if gtype == "equals" else None)
            )
        out.extend(_guarantees_from_ir_expr(expr.left, source_id))
        out.extend(_guarantees_from_ir_expr(expr.right, source_id))
        return out
    if isinstance(expr, IRLogical):
        out.extend(_guarantees_from_ir_expr(expr.left, source_id))
        out.extend(_guarantees_from_ir_expr(expr.right, source_id))
        return out
    return out


def build_ir_guarantee_table(
    ir_goal: IRGoal,
    function_registry: Dict[str, IRFunctionSignature],
) -> Dict[str, Dict[str, List[IRGuarantee]]]:
    """state -> identifier -> [IRGuarantee]. before from require; after from transition metadata."""
    before: Dict[str, List[IRGuarantee]] = {}
    for c in ir_goal.preconditions:
        if c.kind != "require":
            continue
        for gu in _guarantees_from_ir_expr(c.expr, c.condition_id):
            before.setdefault(gu.identifier, []).append(gu)

    after: Dict[str, List[IRGuarantee]] = {}
    for t in ir_goal.transitions:
        sig = function_registry.get(t.effect_name)
        if sig is None or not sig.guarantees_after:
            continue
        for spec in sig.guarantees_after:
            idx = spec.identifier_source_index
            if idx is None or idx < 0 or idx >= len(t.arguments):
                continue
            arg = t.arguments[idx]
            if not isinstance(arg, IRIdentifier):
                continue
            gt_raw = (spec.guarantee_type or "exists").lower()
            if gt_raw == "equals":
                gtype = "equals"
                eq_val = spec.equals_literal
            else:
                gtype = "exists"
                eq_val = None
            after.setdefault(arg.name, []).append(
                IRGuarantee(
                    arg.name,
                    "after",
                    gtype,
                    t.transition_id,
                    equals_value=eq_val,
                )
            )

    return {"before": before, "after": after}


def _transition_read_ids(
    t: IRTransition,
    function_registry: Dict[str, IRFunctionSignature],
) -> Set[str]:
    sig = function_registry.get(t.effect_name)
    if sig is not None and sig.reads:
        return set(sig.reads)
    return extract_ir_identifiers_from_args(t.arguments)


def extract_ir_identifiers_from_args(arguments: List[IRExpr]) -> Set[str]:
    s: Set[str] = set()
    for a in arguments:
        s |= extract_ir_identifiers(a)
    return s


# --- Semantic validation ------------------------------------------------------------------------


def _check_ir_expr(
    expr: IRExpr,
    symbol_table: Dict[str, str],
    function_registry: Dict[str, IRFunctionSignature],
    path: str,
    errors: List[str],
) -> None:
    if isinstance(expr, IRIdentifier):
        if expr.name not in symbol_table:
            errors.append(f"IR semantics: undefined identifier {expr.name!r} at {path}.")
        return
    if isinstance(expr, (IRStringLiteral, IRNumberLiteral, IRBooleanLiteral)):
        return
    if isinstance(expr, IRCall):
        sig = function_registry.get(expr.name)
        if sig is None:
            errors.append(f"IR semantics: unknown function {expr.name!r} at {path}.")
            return
        if len(expr.arguments) != len(sig.arg_types):
            errors.append(
                f"IR semantics: wrong arity for {expr.name!r} at {path}: "
                f"expected {len(sig.arg_types)}, got {len(expr.arguments)}."
            )
            return
        for i, (arg, expected) in enumerate(zip(expr.arguments, sig.arg_types)):
            actual = infer_ir_expr_type(arg, symbol_table, function_registry)
            if not _arg_matches_expected(actual, expected, symbol_table, arg):
                errors.append(
                    f"IR semantics: argument {i + 1} type mismatch for {expr.name!r} at {path}: "
                    f"expected {expected!r}, inferred {actual!r}."
                )
            _check_ir_expr(
                arg,
                symbol_table,
                function_registry,
                f"{path}.arguments[{i}]",
                errors,
            )
        return
    if isinstance(expr, IRBinary):
        lt = infer_ir_expr_type(expr.left, symbol_table, function_registry)
        rt = infer_ir_expr_type(expr.right, symbol_table, function_registry)
        op = expr.operator
        if op in ("==", "!=", "<", ">", "<=", ">="):
            if not _types_compatible_for_comparison(lt, rt):
                errors.append(
                    f"IR semantics: comparison type mismatch at {path}: "
                    f"left {lt!r}, right {rt!r}, operator {op!r}."
                )
        _check_ir_expr(expr.left, symbol_table, function_registry, f"{path}.left", errors)
        _check_ir_expr(expr.right, symbol_table, function_registry, f"{path}.right", errors)
        return
    if isinstance(expr, IRLogical):
        if expr.operator in ("and", "or"):
            for side, label in ((expr.left, "left"), (expr.right, "right")):
                st = infer_ir_expr_type(side, symbol_table, function_registry)
                if st != "boolean":
                    errors.append(
                        f"IR semantics: logical {expr.operator!r} {label} operand must be boolean "
                        f"at {path}; inferred {st!r}."
                    )
                _check_ir_expr(
                    side,
                    symbol_table,
                    function_registry,
                    f"{path}.{label}",
                    errors,
                )
        return


def validate_ir_semantics(
    ir_goal: IRGoal,
    function_registry: Dict[str, IRFunctionSignature],
) -> Tuple[List[str], List[str]]:
    """
    IR-native semantic checks. Returns (errors, warnings).
    """
    errors: List[str] = []
    warnings: List[str] = []

    try:
        symbol_table = build_ir_symbol_table(ir_goal)
    except ValueError as ex:
        return ([str(ex)], [])

    guarantee_table = build_ir_guarantee_table(ir_goal, function_registry)
    before_keys = set(guarantee_table.get("before", {}).keys())

    for i, c in enumerate(ir_goal.preconditions):
        _check_ir_expr(
            c.expr,
            symbol_table,
            function_registry,
            f"preconditions[{i}]({c.condition_id})",
            errors,
        )
    for i, c in enumerate(ir_goal.forbids):
        _check_ir_expr(
            c.expr,
            symbol_table,
            function_registry,
            f"forbids[{i}]({c.condition_id})",
            errors,
        )
        for id_ in extract_ir_identifiers(c.expr):
            if id_ not in before_keys:
                errors.append(
                    f"IR semantics: identifier {id_!r} used in forbid {c.condition_id} "
                    f"without a before-state guarantee from preconditions."
                )
    for i, c in enumerate(ir_goal.postconditions):
        _check_ir_expr(
            c.expr,
            symbol_table,
            function_registry,
            f"postconditions[{i}]({c.condition_id})",
            errors,
        )

    for i, t in enumerate(ir_goal.transitions):
        p = f"transitions[{i}]({t.transition_id})"
        sig = function_registry.get(t.effect_name)
        if sig is None:
            errors.append(f"IR semantics: unknown effect {t.effect_name!r} at {p}.")
            continue
        if len(t.arguments) != len(sig.arg_types):
            errors.append(
                f"IR semantics: wrong arity for effect {t.effect_name!r} at {p}: "
                f"expected {len(sig.arg_types)}, got {len(t.arguments)}."
            )
        else:
            for j, (arg, expected) in enumerate(zip(t.arguments, sig.arg_types)):
                actual = infer_ir_expr_type(arg, symbol_table, function_registry)
                if not _arg_matches_expected(actual, expected, symbol_table, arg):
                    errors.append(
                        f"IR semantics: effect {t.effect_name!r} argument {j + 1} at {p}: "
                        f"expected {expected!r}, inferred {actual!r}."
                    )
                _check_ir_expr(arg, symbol_table, function_registry, f"{p}.arguments[{j}]", errors)

        reads = _transition_read_ids(t, function_registry)
        for id_ in reads:
            if id_ not in before_keys:
                errors.append(
                    f"IR semantics: identifier {id_!r} read by transition {t.transition_id} "
                    f"({t.effect_name}) has no before-state guarantee."
                )

    if ir_goal.transitions:
        res = (ir_goal.result or "").strip()
        if not res:
            warnings.append(
                "IR semantics: transitions are defined but result text is empty or missing."
            )

    after_map = guarantee_table.get("after", {})
    if (ir_goal.result or "").strip() and ir_goal.transitions:
        if not any(after_map.values()):
            warnings.append(
                "IR semantics: success result and transitions exist but no after-state guarantees "
                "are modeled (registry guarantees_after metadata)."
            )

    return errors, warnings


def _serialize_guarantee_table(
    gt: Dict[str, Dict[str, List[IRGuarantee]]],
) -> dict:
    out: dict = {}
    for state in sorted(gt.keys()):
        per = gt[state]
        out[state] = {}
        for ident in sorted(per.keys()):
            out[state][ident] = [
                {
                    "identifier": g.identifier,
                    "state": g.state,
                    "guarantee_type": g.guarantee_type,
                    "source_id": g.source_id,
                    "equals_value": g.equals_value,
                }
                for g in per[ident]
            ]
    return out


def build_ir_semantic_report(
    ir_goal: IRGoal,
    function_registry: Dict[str, IRFunctionSignature],
) -> dict:
    symbol_table = build_ir_symbol_table(ir_goal)
    guarantee_table = build_ir_guarantee_table(ir_goal, function_registry)
    errors, warnings = validate_ir_semantics(ir_goal, function_registry)
    return {
        "symbol_table": dict(sorted(symbol_table.items())),
        "guarantee_table": _serialize_guarantee_table(guarantee_table),
        "errors": list(errors),
        "warnings": list(warnings),
        "semantic_ok": len(errors) == 0,
    }
