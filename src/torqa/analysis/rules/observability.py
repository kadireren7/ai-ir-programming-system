"""Rule: multi-step flows should emit auditable signals."""

from __future__ import annotations

from typing import List

from torqa.analysis.context import AnalysisContext
from torqa.analysis.types import RuleFinding


def _is_observable(effect: str) -> bool:
    e = effect.lower()
    return "log_" in e or "audit" in e or "emit" in e


def rule_observability(ctx: AnalysisContext) -> List[RuleFinding]:
    names = [t.effect_name for t in ctx.ir_goal.transitions]
    if len(names) <= 1:
        return []
    if any(_is_observable(n) for n in names):
        return []
    return [
        RuleFinding(
            code="TORQA_OBS_001",
            severity="warning",
            explanation=(
                "Multiple transitions are modeled but none look obviously auditable "
                "(no `log_*` / `audit*` / `emit_*` style effects)."
            ),
            fix_suggestion=(
                "Add an explicit logging or audit transition, or annotate metadata.surface_meta with "
                "`observability: documented` if telemetry happens outside this IR."
            ),
            detail="low_observability_workflow",
        )
    ]
