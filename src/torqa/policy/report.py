"""
Built-in trust policies over canonical IR metadata (deterministic; no I/O).

Policy answers whether required audit fields hold; risk scoring applies fixed
heuristics for classification and explainability (not probabilistic).

Profiles adjust thresholds and which conditions fail policy — see ``profiles.py``.
"""

from __future__ import annotations

from typing import Any, Dict, List, Literal

from torqa.ir.canonical_ir import IRGoal
from torqa.policy.packs import PolicyPack
from torqa.policy.profiles import TrustProfileId, normalize_trust_profile
from torqa.policy.risk_engine import compute_trust_score

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


def _report_enterprise(ir_goal: IRGoal) -> Dict[str, Any]:
    """Same gates as review-heavy; distinct profile id for stricter trust-score floor."""
    out = _report_review_heavy(ir_goal)
    out["reasons"] = [s.replace("review-heavy", "enterprise") for s in out["reasons"]]
    return out


def build_policy_report_from_pack(ir_goal: IRGoal, pack: PolicyPack) -> Dict[str, Any]:
    """Build policy report from a PolicyPack. Delegates to build_policy_report.

    Primary API for pack-aware callers. Backward-compatible: the built-in
    pack_ids map directly to the existing profile strings.
    """
    return build_policy_report(ir_goal, profile=pack.pack_id)


def build_policy_report(ir_goal: IRGoal, profile: str = "default") -> Dict[str, Any]:
    """
    Evaluate shipped trust rules and deterministic risk heuristics against ``ir_goal``.

    ``profile`` must be a built-in name (see ``normalize_trust_profile``).

    Returns:
      policy_ok, review_required, risk_level, reasons, errors, warnings, trust_profile,
      plus transparent scoring: trust_score, confidence, trust_decision, score_factors, …
    """
    pid: TrustProfileId = normalize_trust_profile(profile)
    if pid == "default":
        out = _report_default(ir_goal)
    elif pid == "strict":
        out = _report_strict(ir_goal)
    elif pid == "enterprise":
        out = _report_enterprise(ir_goal)
    else:
        out = _report_review_heavy(ir_goal)
    out["trust_profile"] = pid

    st = _read_meta_and_transitions(ir_goal)
    pe = len(out.get("errors") or [])
    score_payload = compute_trust_score(
        ir_goal,
        pid,
        policy_errors=pe,
        s_ok=bool(st["s_ok"]),
        severity=str(st.get("severity") or ""),
        n_trans=int(st["n_trans"]),
        legacy_risk_level=str(out.get("risk_level") or "low"),
    )
    out.update(score_payload)

    ts_issues = score_payload.get("trust_scoring_issues") or []
    if ts_issues:
        warns = out.setdefault("warnings", [])
        if isinstance(warns, list):
            for issue in ts_issues:
                if not isinstance(issue, dict):
                    continue
                code = str(issue.get("code") or "TORQA_TRUST_SCORING")
                msg = str(issue.get("message") or "")
                warns.append(
                    f"Trust scoring ({code}): {msg} "
                    "Advanced analysis deductions were not applied; the score may be optimistic until this is fixed."
                )

    return out
