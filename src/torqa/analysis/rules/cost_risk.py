"""Rule: high operational cost patterns (transition fan-out, repeated external checks)."""

from __future__ import annotations

from typing import List

from torqa.analysis.context import AnalysisContext
from torqa.analysis.types import RuleFinding

_EXTERNALISH = frozenset({"user_account_status", "ip_blacklisted", "verify_username", "verify_password"})


def rule_cost_risk(ctx: AnalysisContext) -> List[RuleFinding]:
    trans = ctx.ir_goal.transitions
    n = len(trans)
    names = [t.effect_name for t in trans]
    ext_calls = sum(1 for e in names if e in _EXTERNALISH)

    findings: List[RuleFinding] = []
    if n > 10:
        findings.append(
            RuleFinding(
                code="TORQA_COST_001",
                severity="warning",
                explanation=f"This workflow defines {n} transitions, which usually increases operational cost, retries, and review surface.",
                fix_suggestion="Factor shared steps into library fragments, collapse sequential no-ops, or split into smaller goals.",
                detail="high_transition_count",
            )
        )
    if ext_calls >= 4:
        findings.append(
            RuleFinding(
                code="TORQA_COST_002",
                severity="warning",
                explanation=f"Found {ext_calls} external or credential-heavy checks in one goal, which can amplify latency and failure modes.",
                fix_suggestion="Cache intermediate decisions in metadata, reduce duplicate checks, or stage lookups behind a single orchestrated effect.",
                detail="high_external_fanout",
            )
        )
    return findings
