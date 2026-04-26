"""
Transparent trust scoring (0–100): weighted deductions, confidence, profile floors.

Deterministic: same IR + profile → same score. Not probabilistic.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Literal, Sequence, Tuple

from torqa.analysis.engine import run_advanced_analysis
from torqa.ir.canonical_ir import IRGoal
from torqa.semantics.ir_semantics import default_ir_function_registry

ConfidenceLevel = Literal["high", "medium", "low"]
TrustDecision = Literal["PASS", "FAIL"]


@dataclass(frozen=True)
class ProfileRiskConfig:
    """Per-profile gates and multipliers (deterministic)."""

    min_trust_score: int
    severity_high_weight: int
    transition_band5_weight: int
    transition_band10_extra: int


PROFILE_CONFIG: Dict[str, ProfileRiskConfig] = {
    "default": ProfileRiskConfig(
        min_trust_score=55,
        severity_high_weight=15,
        transition_band5_weight=12,
        transition_band10_extra=8,
    ),
    "strict": ProfileRiskConfig(
        min_trust_score=70,
        severity_high_weight=20,
        transition_band5_weight=15,
        transition_band10_extra=10,
    ),
    "review-heavy": ProfileRiskConfig(
        min_trust_score=65,
        severity_high_weight=18,
        transition_band5_weight=14,
        transition_band10_extra=9,
    ),
    "enterprise": ProfileRiskConfig(
        min_trust_score=80,
        severity_high_weight=22,
        transition_band5_weight=16,
        transition_band10_extra=12,
    ),
}


@dataclass(frozen=True)
class ScoreFactor:
    """One line item in the score explanation."""

    factor_id: str
    label: str
    points: int  # deduction (positive number subtracted from 100)
    detail: str = ""


def _surface_meta(ir_goal: IRGoal) -> Dict[str, Any]:
    md = ir_goal.metadata or {}
    sm = md.get("surface_meta")
    return sm if isinstance(sm, dict) else {}


_ADVANCED_DEDUCTION_MAP: Dict[str, Tuple[str, str, int]] = {
    "TORQA_EXT_001": ("unrestricted_external", "Unrestricted / weakly guarded external access", 14),
    "TORQA_RETRY_001": ("no_retry_policy", "No retry or backoff metadata", 8),
    "TORQA_APPR_001": ("no_human_approval", "No explicit human approval / dual-control step", 12),
    "TORQA_OBS_001": ("low_observability", "Low observability (no obvious audit/log effect)", 6),
    "TORQA_COST_001": ("high_cost_shape", "High operational cost (many transitions)", 8),
    "TORQA_COST_002": ("high_external_fanout", "Many external or credential-heavy checks", 10),
    "TORQA_CYCLE_001": ("circular_dataflow", "Circular dataflow between transitions", 22),
    "TORQA_CYCLE_002": ("circular_includes", "Circular or duplicate `.tq` include chain", 25),
    "TORQA_ORDER_001": ("invalid_execution_order", "Invalid execution order (read before write)", 18),
    "TORQA_IMPOSS_001": ("impossible_conditions", "Contradictory require/forbid predicates", 20),
    "TORQA_UNDEF_001": ("undefined_postcondition_ref", "Postcondition references unknown state", 8),
}


def _advanced_signals_for_scoring(
    ir_goal: IRGoal,
) -> Tuple[List[Tuple[str, str, int]], List[Dict[str, str]], List[ScoreFactor]]:
    """
    Run modular advanced analysis for trust-score deductions.

    On failure, returns no signal tuples, structured ``trust_scoring_issues`` entries,
    and a zero-point :class:`ScoreFactor` so the breakdown is never empty without explanation.
    """
    issues: List[Dict[str, str]] = []
    extra_factors: List[ScoreFactor] = []
    try:
        findings = run_advanced_analysis(ir_goal, default_ir_function_registry())
    except Exception as e:
        issues.append(
            {
                "code": "TORQA_TRUST_SCORING_RUNTIME",
                "message": f"{type(e).__name__}: {e}",
            }
        )
        extra_factors.append(
            ScoreFactor(
                "advanced_analysis_failed",
                "Modular advanced analysis did not complete",
                0,
                "Trust score omits rule-based deductions from advanced analysis until this succeeds.",
            )
        )
        return [], issues, extra_factors

    out: List[Tuple[str, str, int]] = []
    for f in findings:
        code = str(f.code)
        row = _ADVANCED_DEDUCTION_MAP.get(code)
        if row is not None and f.severity in ("warning", "error"):
            fid, label, pts = row
            mul = 1.5 if f.severity == "error" else 1.0
            pts_i = int(pts * mul)
            out.append((fid, label, pts_i))
    return out, issues, extra_factors


def _intrinsic_factors(
    ir_goal: IRGoal,
    *,
    cfg: ProfileRiskConfig,
    s_ok: bool,
    severity: str,
    n_trans: int,
) -> List[ScoreFactor]:
    factors: List[ScoreFactor] = []
    sev = severity.strip().lower() if isinstance(severity, str) else ""
    if s_ok and sev == "high":
        w = cfg.severity_high_weight
        factors.append(
            ScoreFactor(
                "severity_high",
                "Declared severity is high",
                w,
                "Elevated blast radius; pair with approvals and observability.",
            )
        )
    if n_trans > 10:
        factors.append(
            ScoreFactor(
                "transition_count_10",
                "Large transition graph (>10 steps)",
                cfg.transition_band10_extra,
                f"count={n_trans}",
            )
        )
    if n_trans > 5:
        factors.append(
            ScoreFactor(
                "transition_count_5",
                "Elevated transition count (>5 steps)",
                cfg.transition_band5_weight,
                f"count={n_trans}",
            )
        )
    return factors


def _confidence_level(ir_goal: IRGoal, *, policy_errors: int, factors: Sequence[ScoreFactor]) -> ConfidenceLevel:
    md = ir_goal.metadata or {}
    sm = md.get("surface_meta") if isinstance(md.get("surface_meta"), dict) else {}
    owner_ok = isinstance(sm.get("owner"), str) and bool(str(sm.get("owner")).strip())
    sev_ok = isinstance(sm.get("severity"), str) and bool(str(sm.get("severity")).strip())
    ver_ok = bool(md.get("ir_version"))
    unknown_weight = sum(f.points for f in factors if f.factor_id in ("undefined_postcondition_ref",))

    if policy_errors > 0:
        return "low"
    if owner_ok and sev_ok and ver_ok and unknown_weight == 0 and len(factors) <= 1:
        return "high"
    if owner_ok and sev_ok:
        return "medium"
    return "low"


def compute_trust_score(
    ir_goal: IRGoal,
    profile: str,
    *,
    policy_errors: int,
    s_ok: bool,
    severity: str,
    n_trans: int,
    legacy_risk_level: str,
) -> Dict[str, Any]:
    """
    Produce trust score, tier, confidence, decision, and explainable breakdown.

    ``profile`` must already be normalized (default|strict|review-heavy|enterprise).
    """
    pid = profile if profile in PROFILE_CONFIG else "default"
    cfg = PROFILE_CONFIG[pid]

    factors: List[ScoreFactor] = []
    factors.extend(_intrinsic_factors(ir_goal, cfg=cfg, s_ok=s_ok, severity=severity if s_ok else "", n_trans=n_trans))

    adv_signals, trust_scoring_issues, adv_failure_factors = _advanced_signals_for_scoring(ir_goal)
    factors.extend(adv_failure_factors)
    for fid, label, pts in adv_signals:
        factors.append(ScoreFactor(fid, label, pts, detail="from modular analysis"))

    total_deduction = sum(f.points for f in factors)
    trust_score = max(0, min(100, 100 - total_deduction))

    rl = (legacy_risk_level or "low").strip().lower()
    if rl not in ("low", "medium", "high"):
        rl = "high"
    tier: Literal["low", "medium", "high"] = rl  # type: ignore[assignment]

    confidence = _confidence_level(ir_goal, policy_errors=policy_errors, factors=factors)

    policy_ok = policy_errors == 0
    meets_floor = trust_score >= cfg.min_trust_score
    trust_decision: TrustDecision = "PASS" if policy_ok and meets_floor else "FAIL"

    top = sorted(factors, key=lambda f: f.points, reverse=True)[:5]
    top_factors = [f.label for f in top]

    rationale_parts = [
        f"Trust score starts at 100 and subtracts {total_deduction} point(s) across {len(factors)} factor(s).",
        f"Profile {pid!r} requires a minimum score of {cfg.min_trust_score} to pass the trust gate.",
        f"Confidence is {confidence.upper()} based on metadata completeness and signal clarity.",
    ]
    if not meets_floor and policy_ok:
        rationale_parts.append(
            f"Decision is FAIL because the score ({trust_score}) is below the profile minimum ({cfg.min_trust_score})."
        )
    elif not policy_ok:
        rationale_parts.append("Decision is FAIL because hard policy checks reported errors.")
    else:
        rationale_parts.append("Decision is PASS: policy checks succeeded and the score meets the profile floor.")

    if trust_scoring_issues:
        rationale_parts.append(
            "Trust scoring: modular advanced analysis did not complete successfully; "
            "see policy warnings and trust_scoring_issues. "
            "Numeric score may be optimistic because advanced-rule deductions were not applied."
        )

    return {
        "trust_score": trust_score,
        "trust_score_max": 100,
        "trust_tier": tier,
        "confidence": confidence,
        "trust_decision": trust_decision,
        "min_trust_score": cfg.min_trust_score,
        "score_total_deduction": total_deduction,
        "score_factors": [
            {"id": f.factor_id, "label": f.label, "points": f.points, "detail": f.detail} for f in factors
        ],
        "top_factors": top_factors,
        "score_rationale": " ".join(rationale_parts),
        "trust_scoring_issues": trust_scoring_issues,
    }
