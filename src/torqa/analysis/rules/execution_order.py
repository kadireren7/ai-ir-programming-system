"""Rule: earlier transitions must not read state only produced by later transitions."""

from __future__ import annotations

from typing import List

from torqa.analysis.context import AnalysisContext
from torqa.analysis.rules._helpers import transition_reads, transition_writes
from torqa.analysis.types import RuleFinding


def rule_execution_order(ctx: AnalysisContext) -> List[RuleFinding]:
    findings: List[RuleFinding] = []
    trans = ctx.ir_goal.transitions
    reg = ctx.function_registry
    n = len(trans)
    for a in range(n):
        ra = transition_reads(trans[a], reg)
        for b in range(a + 1, n):
            wb = transition_writes(trans[b], reg)
            overlap = ra & wb
            if overlap:
                findings.append(
                    RuleFinding(
                        code="TORQA_ORDER_001",
                        severity="error",
                        explanation=(
                            f"{trans[a].transition_id} ({trans[a].effect_name}) reads {sorted(overlap)!r} "
                            f"but those identifiers are only written later by {trans[b].transition_id} "
                            f"({trans[b].effect_name})."
                        ),
                        fix_suggestion=(
                            "Reorder transitions so producers run before consumers, split the effect, or adjust "
                            "registry read/write annotations to match the real execution contract."
                        ),
                        detail="invalid_execution_order",
                    )
                )
    return findings
