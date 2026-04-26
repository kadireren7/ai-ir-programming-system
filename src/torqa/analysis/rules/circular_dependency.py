"""Rule: circular include chains and mutual transition dataflow cycles."""

from __future__ import annotations

from typing import List, Set

from torqa.analysis.context import AnalysisContext
from torqa.analysis.rules._helpers import tq_include_chain, transition_reads, transition_writes
from torqa.analysis.types import RuleFinding


def _include_cycle(findings: List[RuleFinding], chain: List[str]) -> None:
    seen: Set[str] = set()
    for p in chain:
        if p in seen:
            findings.append(
                RuleFinding(
                    code="TORQA_CYCLE_002",
                    severity="error",
                    explanation=f"The `.tq` include chain repeats {p!r}, which implies a circular include graph.",
                    fix_suggestion="Remove the duplicate include or break the cycle so each fragment is expanded at most once.",
                    detail="circular_include",
                )
            )
            return
        seen.add(p)


def _mutual_transition_cycle(ctx: AnalysisContext) -> List[RuleFinding]:
    findings: List[RuleFinding] = []
    trans = ctx.ir_goal.transitions
    reg = ctx.function_registry
    n = len(trans)
    for i in range(n):
        for j in range(i + 1, n):
            ri, wj = transition_reads(trans[i], reg), transition_writes(trans[j], reg)
            rj, wi = transition_reads(trans[j], reg), transition_writes(trans[i], reg)
            if ri & wj and rj & wi:
                findings.append(
                    RuleFinding(
                        code="TORQA_CYCLE_001",
                        severity="error",
                        explanation=(
                            f"Transitions {trans[i].transition_id} and {trans[j].transition_id} each read "
                            "state that the other writes, so no serial schedule can satisfy both."
                        ),
                        fix_suggestion=(
                            "Split shared state, introduce an intermediate transition, or reorder effects "
                            "so reads are satisfied by earlier writes without mutual dependency."
                        ),
                        detail=f"{trans[i].effect_name}<->{trans[j].effect_name}",
                    )
                )
    return findings


def rule_circular_dependency(ctx: AnalysisContext) -> List[RuleFinding]:
    findings: List[RuleFinding] = []
    _include_cycle(findings, tq_include_chain(ctx.ir_goal))
    findings.extend(_mutual_transition_cycle(ctx))
    return findings
