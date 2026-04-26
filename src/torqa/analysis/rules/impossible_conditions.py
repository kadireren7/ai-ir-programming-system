"""Rule: logically incompatible require vs forbid on the same normalized predicate."""

from __future__ import annotations

from typing import List, Set

from torqa.analysis.context import AnalysisContext
from torqa.analysis.types import RuleFinding
from torqa.ir.canonical_ir import _semantic_expr_key  # noqa: PLC2701 — stable IR fingerprint for rules


def rule_impossible_conditions(ctx: AnalysisContext) -> List[RuleFinding]:
    req_keys: Set[str] = set()
    for c in ctx.ir_goal.preconditions:
        req_keys.add(_semantic_expr_key(c.expr))

    findings: List[RuleFinding] = []
    for i, c in enumerate(ctx.ir_goal.forbids):
        k = _semantic_expr_key(c.expr)
        if k in req_keys:
            findings.append(
                RuleFinding(
                    code="TORQA_IMPOSS_001",
                    severity="error",
                    explanation=(
                        f"Forbid {c.condition_id} contradicts a precondition: the same normalized predicate "
                        "cannot be both required and forbidden."
                    ),
                    fix_suggestion="Remove or relax either the matching precondition or this forbid clause.",
                    detail="impossible_require_forbid",
                )
            )
    return findings
