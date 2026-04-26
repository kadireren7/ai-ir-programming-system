"""Rule: sensitive external lookups without explicit guard metadata."""

from __future__ import annotations

from typing import List

from torqa.analysis.context import AnalysisContext
from torqa.analysis.rules._helpers import surface_meta
from torqa.analysis.types import RuleFinding

_SENSITIVE_EXTERNAL_EFFECTS = frozenset({"user_account_status", "ip_blacklisted"})


def rule_external_access(ctx: AnalysisContext) -> List[RuleFinding]:
    sm = surface_meta(ctx.ir_goal)
    guarded = bool(sm.get("guarded_external") or sm.get("external_access_reviewed"))
    names = [t.effect_name for t in ctx.ir_goal.transitions]
    hits = [e for e in names if e in _SENSITIVE_EXTERNAL_EFFECTS]
    if not hits or guarded:
        return []

    if not ctx.ir_goal.preconditions:
        return [
            RuleFinding(
                code="TORQA_EXT_001",
                severity="warning",
                explanation=(
                    f"Effects {sorted(set(hits))!r} consult external systems but this goal has no preconditions "
                    "documenting guards, throttles, or allowlists."
                ),
                fix_suggestion=(
                    "Add preconditions describing access controls, set `guarded_external: true` in meta "
                    "(surface_meta), or model explicit verification transitions before these lookups."
                ),
                detail="dangerous_unrestricted_external_access",
            )
        ]
    return []
