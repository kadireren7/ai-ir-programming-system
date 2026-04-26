"""
Deterministic readiness score (0-100) for CLI summaries.

Weights (fixed; sum to 100 when all gates pass with lowest risk and no review):
- Load/parse to bundle: 12
- IR goal extracted from bundle: +8 (20 total for ``parse success``)
- Structural ``validate_ir``: +15
- Semantic + logic reports: +15
- Policy pass: +25
- Risk tier (only if policy passed): low +15, medium +10, high +5
- Review signal (only if policy passed): not required +10, required +5
"""

from __future__ import annotations

from typing import Mapping

_POINTS_RISK: Mapping[str, int] = {
    "low": 15,
    "medium": 10,
    "high": 5,
}


def readiness_score_100(
    *,
    load_ok: bool,
    goal_ok: bool,
    structural_ok: bool,
    semantic_ok: bool,
    policy_evaluated: bool,
    policy_ok: bool,
    risk_level: str = "low",
    review_required: bool = False,
) -> int:
    """
    Return an integer from 0 through 100. Deterministic given boolean inputs and
    ``risk_level`` / ``review_required`` (latter two ignored unless policy passed).
    """
    if not load_ok:
        return 0
    score = 12
    if not goal_ok:
        return score
    score += 8
    if not structural_ok:
        return score
    score += 15
    if not semantic_ok:
        return score
    score += 15
    if not policy_evaluated or not policy_ok:
        return score
    score += 25
    rl = (risk_level or "low").strip().lower()
    score += _POINTS_RISK.get(rl, _POINTS_RISK["high"])
    score += 10 if not review_required else 5
    return min(100, score)


def format_readiness_line(score: int) -> str:
    return f"Readiness score: {score}/100"
