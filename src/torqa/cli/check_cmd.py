"""
``torqa check`` — compact trust summary (same pipeline as ``validate``, different output).
"""

from __future__ import annotations

import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from torqa.ir.canonical_ir import validate_ir
from torqa.policy import build_policy_report
from torqa.report.builder import governance_report_blocked, governance_report_from_policy
from torqa.report.contract import GovernanceReport
from torqa.semantics.ir_semantics import build_ir_semantic_report, default_ir_function_registry
from torqa.surface.parse_tq import TQParseError
from torqa.cli.io import bundle_jobs, goal_from_bundle, load_input
from torqa.cli.readiness import format_readiness_line, readiness_score_100
from torqa.cli.suggestions import (
    suggestion_for_ir_payload,
    suggestion_for_load_error,
    suggestion_for_parse_code,
    suggestion_for_policy_line,
    suggestion_for_semantic_line,
    suggestion_for_structural_line,
    suggested_fix_when_policy_passes,
    suggested_next_step_blocked,
    top_reason_from_policy_reasons,
)

DECISION_SAFE = "SAFE_TO_HANDOFF"
DECISION_REVIEW = "NEEDS_REVIEW"
DECISION_BLOCKED = "BLOCKED"


@dataclass(frozen=True)
class TrustEvalResult:
    """Outcome of the same gate as ``torqa check`` (no printing)."""

    decision: str
    risk: str
    trust_profile: str
    reason_summary: str
    has_warnings: bool = False
    governance_report: Optional[GovernanceReport] = field(default=None, compare=False)


def evaluate_trust_from_bundle(bundle: Dict[str, Any], profile: str = "default") -> TrustEvalResult:
    """
    Run structural → semantic → policy for a normalized bundle dict using ``profile``.
    Used for batch JSON and shared gate logic.
    """
    goal, gerr = goal_from_bundle(bundle)
    if gerr is not None:
        gr = governance_report_blocked(reason=str(gerr))
        return TrustEvalResult(DECISION_BLOCKED, "n/a", profile, str(gerr), governance_report=gr)

    workflow_name: str = getattr(goal, "goal", None) or "unknown"
    source: str = (getattr(goal, "metadata", None) or {}).get("integration", {}).get("adapter", "unknown")
    bundle_id = f"{source}:{workflow_name}"

    struct = validate_ir(goal)
    if struct:
        top = struct[0] if struct else "Structural validation failed"
        gr = governance_report_blocked(workflow_name=workflow_name, source=source, reason=top, bundle_id=bundle_id)
        return TrustEvalResult(DECISION_BLOCKED, "n/a", profile, top, governance_report=gr)

    reg = default_ir_function_registry()
    report = build_ir_semantic_report(goal, reg)
    sem_ok = bool(report.get("semantic_ok"))
    logic_ok = bool(report.get("logic_ok"))
    errs: List[str] = list(report.get("errors") or [])
    if not sem_ok or not logic_ok:
        top = errs[0] if errs else "Semantic or logic validation failed"
        gr = governance_report_blocked(workflow_name=workflow_name, source=source, reason=top, bundle_id=bundle_id)
        return TrustEvalResult(DECISION_BLOCKED, "n/a", profile, top, governance_report=gr)

    policy_rep = build_policy_report(goal, profile=profile)
    pok = bool(policy_rep["policy_ok"])
    risk = str(policy_rep.get("risk_level", "low"))
    prof = str(policy_rep.get("trust_profile", profile))
    sem_warns: List[str] = list(report.get("warnings") or [])
    pol_warns: List[str] = list(policy_rep.get("warnings") or [])
    has_warnings = bool(sem_warns or pol_warns)

    if not pok:
        perrs = list(policy_rep.get("errors") or [])
        top = perrs[0] if perrs else "Policy validation failed"
        gr = governance_report_from_policy(
            cli_decision=DECISION_BLOCKED,
            policy_rep=policy_rep,
            workflow_name=workflow_name,
            source=source,
            bundle_id=bundle_id,
            sem_errors=errs,
            sem_warnings=sem_warns,
        )
        return TrustEvalResult(DECISION_BLOCKED, risk, prof, top, has_warnings, governance_report=gr)

    decision, top_reason, _ = _decision_from_policy_rep(policy_rep)
    gr = governance_report_from_policy(
        cli_decision=decision,
        policy_rep=policy_rep,
        workflow_name=workflow_name,
        source=source,
        bundle_id=bundle_id,
        sem_errors=errs,
        sem_warnings=sem_warns,
    )
    return TrustEvalResult(decision, risk, prof, top_reason, has_warnings, governance_report=gr)


def evaluate_trust_gate(path: Path, profile: str = "default") -> TrustEvalResult:
    """
    Run parse/load → structural → semantic → policy for ``path`` using ``profile``.
    Expects a **single** bundle in the file; JSON array roots are rejected here (use batch-aware callers).
    """
    bundle, err, input_type = load_input(path)
    if input_type == "unknown":
        return TrustEvalResult(DECISION_BLOCKED, "n/a", profile, str(err))
    if err is not None:
        if isinstance(err, TQParseError):
            rs = f"{err.code}: {err}"
        else:
            rs = str(err)
        return TrustEvalResult(DECISION_BLOCKED, "n/a", profile, rs)

    assert bundle is not None
    jobs = bundle_jobs(path, bundle, input_type)
    if len(jobs) != 1:
        return TrustEvalResult(
            DECISION_BLOCKED,
            "n/a",
            profile,
            f"{path.name}: JSON array contains {len(jobs)} bundles; this API expects one bundle per file",
        )
    return evaluate_trust_from_bundle(jobs[0][1], profile=profile)


def _decision_from_policy_rep(policy_rep: Dict[str, Any]) -> Tuple[str, str, str]:
    """Returns (decision, top_reason, suggested_next_step) when policy_ok."""
    reasons: List[str] = list(policy_rep.get("reasons") or [])
    review_required = bool(policy_rep.get("review_required"))
    risk_level = str(policy_rep.get("risk_level", "low"))

    top = top_reason_from_policy_reasons(reasons)
    if review_required or risk_level != "low":
        decision = DECISION_REVIEW
        if review_required and risk_level != "low":
            next_step = "Review metadata and risk tier; obtain approval if required, then hand off."
        elif review_required:
            next_step = "Complete human review (review_required); then hand off if acceptable."
        else:
            next_step = "Review elevated risk; confirm scope before handoff."
        return decision, top, next_step

    decision = DECISION_SAFE
    next_step = "Hand off validated ir_goal to your executor or pipeline (Torqa does not run workflows)."
    return decision, top, next_step


def cmd_check(args: Any) -> int:
    path: Path = args.file
    profile = getattr(args, "profile", None) or "default"
    fail_on_warning = bool(getattr(args, "fail_on_warning", False))

    if not path.is_file():
        print(f"torqa check: not a file: {path}", file=sys.stderr)
        return 1

    bundle, err, input_type = load_input(path)
    if input_type == "unknown":
        _print_summary(
            decision=DECISION_BLOCKED,
            risk="n/a",
            profile=profile,
            readiness=readiness_score_100(load_ok=False, goal_ok=False, structural_ok=False, semantic_ok=False, policy_evaluated=False, policy_ok=False),
            top_reason=str(err),
            suggested_fix="Use a .tq file or JSON bundle / ir_goal",
            next_step=suggested_next_step_blocked("load", str(err)),
        )
        return 1

    if err is not None:
        if isinstance(err, TQParseError):
            fix = suggestion_for_parse_code(err.code)
            top = f"{err.code}: {err}"
            _print_summary(
                decision=DECISION_BLOCKED,
                risk="n/a",
                profile=profile,
                readiness=readiness_score_100(load_ok=False, goal_ok=False, structural_ok=False, semantic_ok=False, policy_evaluated=False, policy_ok=False),
                top_reason=top,
                suggested_fix=fix,
                next_step=suggested_next_step_blocked("parse"),
            )
        else:
            fix = suggestion_for_load_error(str(err))
            _print_summary(
                decision=DECISION_BLOCKED,
                risk="n/a",
                profile=profile,
                readiness=readiness_score_100(load_ok=False, goal_ok=False, structural_ok=False, semantic_ok=False, policy_evaluated=False, policy_ok=False),
                top_reason=str(err),
                suggested_fix=fix,
                next_step=suggested_next_step_blocked("load"),
            )
        return 1

    assert bundle is not None
    jobs = bundle_jobs(path, bundle, input_type)
    any_fail = False
    for idx, (suffix, one_bundle) in enumerate(jobs):
        if len(jobs) > 1:
            print(f"--- Bundle {idx + 1}/{len(jobs)} ({path.name}{suffix}) ---\n")
        gh = f"{path.resolve()}{suffix}"
        goal, gerr = goal_from_bundle(one_bundle, path_hint=gh)
        if gerr is not None:
            _print_summary(
                decision=DECISION_BLOCKED,
                risk="n/a",
                profile=profile,
                readiness=readiness_score_100(
                    load_ok=True,
                    goal_ok=False,
                    structural_ok=False,
                    semantic_ok=False,
                    policy_evaluated=False,
                    policy_ok=False,
                ),
                top_reason=str(gerr),
                suggested_fix=suggestion_for_ir_payload(str(gerr)),
                next_step=suggested_next_step_blocked("goal"),
            )
            any_fail = True
            continue

        struct = validate_ir(goal)
        if struct:
            top = struct[0] if struct else "Structural validation failed"
            fix = suggestion_for_structural_line(top)
            _print_summary(
                decision=DECISION_BLOCKED,
                risk="n/a",
                profile=profile,
                readiness=readiness_score_100(
                    load_ok=True,
                    goal_ok=True,
                    structural_ok=False,
                    semantic_ok=False,
                    policy_evaluated=False,
                    policy_ok=False,
                ),
                top_reason=top,
                suggested_fix=fix,
                next_step=suggested_next_step_blocked("struct"),
            )
            any_fail = True
            continue

        reg = default_ir_function_registry()
        report = build_ir_semantic_report(goal, reg)
        sem_ok = bool(report.get("semantic_ok"))
        logic_ok = bool(report.get("logic_ok"))
        errs: List[str] = list(report.get("errors") or [])

        if not sem_ok or not logic_ok:
            top = errs[0] if errs else "Semantic or logic validation failed"
            fix = suggestion_for_semantic_line(top)
            _print_summary(
                decision=DECISION_BLOCKED,
                risk="n/a",
                profile=profile,
                readiness=readiness_score_100(
                    load_ok=True,
                    goal_ok=True,
                    structural_ok=True,
                    semantic_ok=False,
                    policy_evaluated=False,
                    policy_ok=False,
                ),
                top_reason=top,
                suggested_fix=fix,
                next_step=suggested_next_step_blocked("semantic"),
            )
            any_fail = True
            continue

        policy_rep = build_policy_report(goal, profile=profile)
        pok = bool(policy_rep["policy_ok"])
        risk = str(policy_rep.get("risk_level", "low"))
        prof = str(policy_rep.get("trust_profile", profile))
        rev = bool(policy_rep.get("review_required"))

        if not pok:
            perrs = list(policy_rep.get("errors") or [])
            top = perrs[0] if perrs else "Policy validation failed"
            fix = suggestion_for_policy_line(top)
            _print_summary(
                decision=DECISION_BLOCKED,
                risk=risk,
                profile=prof,
                readiness=readiness_score_100(
                    load_ok=True,
                    goal_ok=True,
                    structural_ok=True,
                    semantic_ok=True,
                    policy_evaluated=True,
                    policy_ok=False,
                ),
                top_reason=top,
                suggested_fix=fix,
                next_step=suggested_next_step_blocked("policy"),
            )
            any_fail = True
            continue

        decision, top, next_step = _decision_from_policy_rep(policy_rep)
        _print_summary(
            decision=decision,
            risk=risk,
            profile=prof,
            readiness=readiness_score_100(
                load_ok=True,
                goal_ok=True,
                structural_ok=True,
                semantic_ok=True,
                policy_evaluated=True,
                policy_ok=True,
                risk_level=risk,
                review_required=rev,
            ),
            top_reason=top,
            suggested_fix=suggested_fix_when_policy_passes(policy_rep),
            next_step=next_step,
        )
        sem_warns = list(report.get("warnings") or [])
        pol_warns = list(policy_rep.get("warnings") or [])
        if fail_on_warning and (sem_warns or pol_warns):
            print(
                "torqa check: semantic or policy warnings present (fail-on-warning); exiting with status 1.",
                file=sys.stderr,
            )
            any_fail = True
            continue

    return 1 if any_fail else 0


def _print_summary(
    *,
    decision: str,
    risk: str,
    profile: str,
    readiness: int,
    top_reason: str,
    suggested_fix: str,
    next_step: str,
) -> None:
    print(f"Decision: {decision}")
    print(f"Risk: {risk}")
    print(f"Trust profile: {profile}")
    print(format_readiness_line(readiness))
    print(f"Top reason: {top_reason}")
    print(f"Suggested fix: {suggested_fix}")
    print(f"Suggested next step: {next_step}")
