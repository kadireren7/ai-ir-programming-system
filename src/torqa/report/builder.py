"""Build GovernanceReport from existing pipeline data — no behavior change."""

from __future__ import annotations

import uuid
from typing import Any, Dict, List, Literal, Optional

from torqa.report.contract import Finding, GovernanceReport

_DECISION_MAP: Dict[str, Literal["pass", "review", "block"]] = {
    "SAFE_TO_HANDOFF": "pass",
    "NEEDS_REVIEW": "review",
    "BLOCKED": "block",
}

_RISK_TO_TIER: Dict[str, Literal["low", "medium", "high"]] = {
    "low": "high",
    "medium": "medium",
    "high": "low",
    "n/a": "low",
}


def _findings_from_strings(
    messages: List[str],
    severity: Literal["error", "warning", "info"],
    *,
    prefix: str,
) -> List[Finding]:
    return [
        Finding(
            finding_id=f"f_{prefix.lower()}_{i:04d}",
            code=f"TORQA_{prefix}_{i:03d}",
            severity=severity,
            title=msg[:80],
            explanation=msg,
            fix_suggestion="See Torqa documentation for remediation guidance.",
        )
        for i, msg in enumerate(messages, 1)
    ]


def governance_report_from_policy(
    *,
    cli_decision: str,
    policy_rep: Dict[str, Any],
    workflow_name: str,
    source: str = "unknown",
    bundle_id: Optional[str] = None,
    sem_errors: Optional[List[str]] = None,
    sem_warnings: Optional[List[str]] = None,
) -> GovernanceReport:
    """Build GovernanceReport from existing pipeline outputs. No behavior change to callers."""
    decision: Literal["pass", "review", "block"] = _DECISION_MAP.get(cli_decision, "block")
    risk = str(policy_rep.get("risk_level", "n/a"))
    trust_tier: Literal["low", "medium", "high"] = _RISK_TO_TIER.get(risk, "low")
    trust_score = int(policy_rep.get("trust_score", 0))
    policy_pack = str(policy_rep.get("trust_profile", "default"))

    findings: List[Finding] = []
    findings += _findings_from_strings(list(policy_rep.get("errors") or []), "error", prefix="POL")
    findings += _findings_from_strings(list(policy_rep.get("warnings") or []), "warning", prefix="POL")
    if sem_errors:
        findings += _findings_from_strings(sem_errors, "error", prefix="SEM")
    if sem_warnings:
        findings += _findings_from_strings(sem_warnings, "warning", prefix="SEM")

    return GovernanceReport(
        bundle_id=bundle_id or f"torqa:{uuid.uuid4().hex[:8]}",
        source=source,
        workflow_name=workflow_name,
        decision=decision,
        trust_score=trust_score,
        trust_tier=trust_tier,
        findings=findings,
        policy_pack=policy_pack,
    )


def governance_report_blocked(
    *,
    workflow_name: str = "unknown",
    source: str = "unknown",
    reason: str = "",
    bundle_id: Optional[str] = None,
) -> GovernanceReport:
    """Build a minimal blocked GovernanceReport for pre-policy failure paths."""
    findings = _findings_from_strings([reason] if reason else [], "error", prefix="BLOCK")
    return GovernanceReport(
        bundle_id=bundle_id or f"torqa:{uuid.uuid4().hex[:8]}",
        source=source,
        workflow_name=workflow_name,
        decision="block",
        trust_score=0,
        trust_tier="low",
        findings=findings,
    )


def governance_report_to_dict(report: GovernanceReport) -> Dict[str, Any]:
    """Convert GovernanceReport to plain dict. Compatibility layer for downstream consumers."""
    return {
        "bundle_id": report.bundle_id,
        "source": report.source,
        "workflow_name": report.workflow_name,
        "decision": report.decision,
        "trust_score": report.trust_score,
        "trust_tier": report.trust_tier,
        "policy_pack": report.policy_pack,
        "ir_version": report.ir_version,
        "deterministic": report.deterministic,
        "findings": [
            {
                "finding_id": f.finding_id,
                "code": f.code,
                "severity": f.severity,
                "title": f.title,
                "explanation": f.explanation,
                "fix_suggestion": f.fix_suggestion,
                "evidence": [
                    {"source_location": e.source_location, "raw_excerpt": e.raw_excerpt}
                    for e in f.evidence
                ],
                "rule_pack": f.rule_pack,
            }
            for f in report.findings
        ],
    }
