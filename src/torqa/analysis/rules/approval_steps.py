"""Rule: high-severity flows should model explicit approval or dual control."""

from __future__ import annotations

from typing import List

from torqa.analysis.context import AnalysisContext
from torqa.analysis.rules._helpers import surface_meta
from torqa.analysis.types import RuleFinding


def _approval_like(effect: str) -> bool:
    e = effect.lower()
    return "approval" in e or e.startswith("verify_")


def rule_approval_steps(ctx: AnalysisContext) -> List[RuleFinding]:
    sm = surface_meta(ctx.ir_goal)
    sev = str(sm.get("severity", "")).strip().lower()
    if sev != "high":
        return []

    names = [t.effect_name for t in ctx.ir_goal.transitions]
    if any(_approval_like(n) for n in names):
        return []

    return [
        RuleFinding(
            code="TORQA_APPR_001",
            severity="warning",
            explanation=(
                "Severity is `high` but no approval-style or dual-control effect (e.g. verify_*, *approval*) "
                "appears in transitions."
            ),
            fix_suggestion=(
                "Add an explicit approval/verification transition, lower severity if appropriate, or document "
                "human approval in metadata.surface_meta with a reviewer field."
            ),
            detail="missing_approval_steps",
        )
    ]
