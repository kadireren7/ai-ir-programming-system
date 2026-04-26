"""Run all registered advanced analysis rules."""

from __future__ import annotations

from typing import Callable, Dict, List, Tuple

from torqa.analysis.context import AnalysisContext
from torqa.analysis.types import RuleFinding, merge_findings_into_lists
from torqa.analysis.rules import ALL_RULES
from torqa.ir.canonical_ir import IRGoal
from torqa.semantics.ir_semantics import IRFunctionSignature

RuleFn = Callable[[AnalysisContext], List[RuleFinding]]


def run_advanced_analysis(
    ir_goal: IRGoal,
    function_registry: Dict[str, IRFunctionSignature],
    *,
    rules: Tuple[RuleFn, ...] = ALL_RULES,
) -> List[RuleFinding]:
    ctx = AnalysisContext(ir_goal=ir_goal, function_registry=function_registry)
    out: List[RuleFinding] = []
    for rule in rules:
        out.extend(rule(ctx))
    return out


def advanced_analysis_report(
    ir_goal: IRGoal,
    function_registry: Dict[str, IRFunctionSignature],
) -> Dict[str, object]:
    """
    Structured report slice merged into ``build_ir_semantic_report``:
    ``advanced_findings``, ``advanced_info``, ``advanced_ok``.
    """
    findings = run_advanced_analysis(ir_goal, function_registry)
    err_lines, warn_lines, info = merge_findings_into_lists(findings)
    advanced_ok = not any(f.severity == "error" for f in findings)
    return {
        "advanced_findings": [f.to_dict() for f in findings],
        "advanced_info": info,
        "advanced_ok": advanced_ok,
        "advanced_errors": err_lines,
        "advanced_warnings": warn_lines,
    }
