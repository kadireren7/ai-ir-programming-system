"""
Built-in trust policies over canonical IR metadata (deterministic; no I/O).

Policy answers whether required audit fields hold; risk scoring applies fixed
heuristics for classification and explainability (not probabilistic).

Profiles adjust thresholds and which conditions fail policy — see ``profiles.py``.
"""

from __future__ import annotations

from typing import Any, Dict, List, Literal

from src.ir.canonical_ir import IRGoal
from src.policy.profiles import TrustProfileId, normalize_trust_profile

RiskLevel = Literal["low", "medium", "high"]


def _normalize_surface_meta(
    md: Dict[str, Any],
):
    sm = md.get("surface_meta")
    if sm is None:
        return {}, False, []
    if not isinstance(sm, dict):
        return (
            {},
            True,
            ["Policy: metadata.surface_meta must be a dict when present."],
        )
    return sm, False, []


def _read_meta_and_transitions(ir_goal: IRGoal) -> Dict[str, Any]:
    errors: List[str] = []
    md = getattr(ir_goal, "metadata", None)
    if not isinstance(md, dict):
        md = {}

    sm, bad_sm_type, sm_errs = _normalize_surface_meta(md)
    errors.extend(sm_errs)

    owner = sm.get("owner")
    severity = sm.get("severity")
    o_ok = isinstance(owner, str) and bool(owner.strip())
    s_ok = isinstance(severity, str) and bool(severity.strip())

    if not bad_sm_type:
        if not o_ok:
            errors.append(
                "Policy: metadata.surface_meta.owner is required (non-empty string)."
            )
        if not s_ok:
            errors.append(
                "Policy: metadata.surface_meta.severity is required (non-empty string)."
            )

    transitions = getattr(ir_goal, "transitions", None) or []
    n_trans = len(transitions)

    return {
        "md": md,
        "sm": sm,
        "bad_sm_type": bad_sm_type,
        "errors": errors,
        "owner": owner,
        "severity": severity,
        "o_ok": o_ok,
        "s_ok": s_ok,
        "n_trans": n_trans,
    }


def _append_meta_risk_reasons(
    reasons: List[str],
    *,
    bad_sm_type: bool,
    o_ok: bool,
    s_ok: bool,
    label: str = "",
) -> None:
    prefix = f" ({label})" if label else ""
    if bad_sm_type:
        reasons.append(
            f"Trust risk{prefix}: metadata.surface_meta must be a dict when present "
            "(audit metadata unusable)."
        )
    else:
        if not o_ok:
            reasons.append(
                f"Trust risk{prefix}: surface_meta.owner is missing or empty (ownership unknown)."
            )
        if not s_ok:
            reasons.append(
                f"Trust risk{prefix}: surface_meta.severity is missing or empty "
                "(risk class unknown)."
            )


def _report_default(ir_goal: IRGoal) -> Dict[str, Any]:
    st = _read_meta_and_transitions(ir_goal)
    errors = list(st["errors"])
    bad_sm_type = st["bad_sm_type"]
    o_ok = st["o_ok"]
    s_ok = st["s_ok"]
    severity = st["severity"]
    n_trans = st["n_trans"]

    review_required = bool(s_ok and severity.strip().lower() == "high")
    warnings: List[str] = []
    if n_trans > 5:
        warnings.append(
            f"Policy: transition count is {n_trans}; exceeding 5 may warrant extra review."
        )

    policy_ok = len(errors) == 0
    reasons: List[str] = []
    _append_meta_risk_reasons(reasons, bad_sm_type=bad_sm_type, o_ok=o_ok, s_ok=s_ok)
    if s_ok and severity.strip().lower() == "high":
        reasons.append("Trust risk: severity label is high.")
    if n_trans > 5:
        reasons.append(
            f"Trust risk: transition count is {n_trans} (more than five transitions)."
        )

    has_high = (
        bad_sm_type
        or (not bad_sm_type and (not o_ok or not s_ok))
        or (s_ok and severity.strip().lower() == "high")
    )
    if has_high:
        risk_level: RiskLevel = "high"
    elif n_trans > 5:
        risk_level = "medium"
    else:
        risk_level = "low"
        reasons.append(
            "Within current heuristics: owner and severity present, at most five transitions, "
            "severity not high."
        )

    return {
        "policy_ok": policy_ok,
        "review_required": review_required,
        "risk_level": risk_level,
        "reasons": reasons,
        "errors": errors,
        "warnings": warnings,
    }


def _report_strict(ir_goal: IRGoal) -> Dict[str, Any]:
    st = _read_meta_and_transitions(ir_goal)
    errors = list(st["errors"])
    bad_sm_type = st["bad_sm_type"]
    o_ok = st["o_ok"]
    s_ok = st["s_ok"]
    severity = st["severity"]
    n_trans = st["n_trans"]

    sev_high = s_ok and severity.strip().lower() == "high"
    if sev_high:
        errors.append(
            "Policy (strict): severity 'high' is not allowed; lower severity or use escalation."
        )

    review_required = bool(sev_high)
    warnings: List[str] = []
    if n_trans > 5:
        warnings.append(
            f"Policy: transition count is {n_trans}; exceeding 5 may warrant extra review."
        )
        review_required = True

    policy_ok = len(errors) == 0

    reasons: List[str] = []
    _append_meta_risk_reasons(reasons, bad_sm_type=bad_sm_type, o_ok=o_ok, s_ok=s_ok, label="strict")
    if sev_high:
        reasons.append(
            "Trust risk (strict): severity label is high (blocked by strict policy)."
        )
    if n_trans > 5:
        reasons.append(
            f"Trust risk (strict): transition count is {n_trans} (more than five transitions)."
        )
    elif n_trans > 3:
        reasons.append(
            f"Trust risk (strict): transition count is {n_trans} (more than three transitions)."
        )

    has_high = (
        bad_sm_type
        or (not bad_sm_type and (not o_ok or not s_ok))
        or sev_high
        or n_trans > 5
    )
    if has_high:
        risk_level: RiskLevel = "high"
    elif n_trans > 3:
        risk_level = "medium"
    else:
        risk_level = "low"
        reasons.append(
            "Within current heuristics (strict): owner and severity present, at most three "
            "transitions, severity not 'high'."
        )

    return {
        "policy_ok": policy_ok,
        "review_required": review_required,
        "risk_level": risk_level,
        "reasons": reasons,
        "errors": errors,
        "warnings": warnings,
    }


def _report_review_heavy(ir_goal: IRGoal) -> Dict[str, Any]:
    """Same risk model as default; stricter review_required signals."""
    st = _read_meta_and_transitions(ir_goal)
    errors = list(st["errors"])
    bad_sm_type = st["bad_sm_type"]
    o_ok = st["o_ok"]
    s_ok = st["s_ok"]
    severity = st["severity"]
    n_trans = st["n_trans"]

    review_required = bool(
        (s_ok and severity.strip().lower() == "high") or (n_trans > 3)
    )
    warnings: List[str] = []
    if n_trans > 5:
        warnings.append(
            f"Policy: transition count is {n_trans}; exceeding 5 may warrant extra review."
        )

    policy_ok = len(errors) == 0
    reasons: List[str] = []
    _append_meta_risk_reasons(
        reasons, bad_sm_type=bad_sm_type, o_ok=o_ok, s_ok=s_ok, label="review-heavy"
    )
    if s_ok and severity.strip().lower() == "high":
        reasons.append("Trust risk: severity label is high.")
    if n_trans > 5:
        reasons.append(
            f"Trust risk: transition count is {n_trans} (more than five transitions)."
        )

    has_high = (
        bad_sm_type
        or (not bad_sm_type and (not o_ok or not s_ok))
        or (s_ok and severity.strip().lower() == "high")
    )
    if has_high:
        risk_level: RiskLevel = "high"
    elif n_trans > 5:
        risk_level = "medium"
    else:
        risk_level = "low"
        reasons.append(
            "Within current heuristics (review-heavy): owner and severity present, at most five "
            "transitions, severity not high."
        )

    return {
        "policy_ok": policy_ok,
        "review_required": review_required,
        "risk_level": risk_level,
        "reasons": reasons,
        "errors": errors,
        "warnings": warnings,
    }


def build_policy_report(ir_goal: IRGoal, profile: str = "default") -> Dict[str, Any]:
    """
    Evaluate shipped trust rules and deterministic risk heuristics against ``ir_goal``.

    ``profile`` must be a built-in name (see ``normalize_trust_profile``).

    Returns:
      policy_ok, review_required, risk_level, reasons, errors, warnings, trust_profile.
    """
    pid: TrustProfileId = normalize_trust_profile(profile)
    if pid == "default":
        out = _report_default(ir_goal)
    elif pid == "strict":
        out = _report_strict(ir_goal)
    else:
        out = _report_review_heavy(ir_goal)
    out["trust_profile"] = pid
    return out
