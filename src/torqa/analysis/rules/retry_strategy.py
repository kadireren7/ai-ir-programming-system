"""Rule: workflows that likely need retries should declare a retry policy."""

from __future__ import annotations

from typing import List

from torqa.analysis.context import AnalysisContext
from torqa.analysis.rules._helpers import surface_meta
from torqa.analysis.types import RuleFinding

_RETRY_META_KEYS = frozenset({"retry_policy", "max_retries", "backoff", "retry_backoff"})
_EFFECTS_HINTING_TRANSIENT_FAILURE = frozenset(
    {
        "user_account_status",
        "ip_blacklisted",
        "verify_username",
        "verify_password",
    }
)


def rule_retry_strategy(ctx: AnalysisContext) -> List[RuleFinding]:
    sm = surface_meta(ctx.ir_goal)
    has_retry_meta = any(k in sm for k in _RETRY_META_KEYS)
    if has_retry_meta:
        return []

    names = [t.effect_name for t in ctx.ir_goal.transitions]
    hints = [e for e in names if e in _EFFECTS_HINTING_TRANSIENT_FAILURE]
    n = len(ctx.ir_goal.transitions)
    # Large graphs only — small fixtures (e.g. six-transition policy-warning bundles) stay clean.
    if n < 8:
        return []
    return [
        RuleFinding(
            code="TORQA_RETRY_001",
            severity="warning",
            explanation=(
                "No explicit retry or backoff metadata was found on this workflow, "
                f"but it has {n} transition(s)"
                + (f" including failure-prone checks: {', '.join(sorted(set(hints)))}" if hints else "")
                + "."
            ),
            fix_suggestion=(
                "Add `retry_policy`, `max_retries`, or `backoff` under `meta:` (stored in metadata.surface_meta) "
                "or document idempotency in metadata.source_map; downstream executors can enforce retries."
            ),
            detail="missing_retry_strategy",
        )
    ]
