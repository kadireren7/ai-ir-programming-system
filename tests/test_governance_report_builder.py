"""Tests for GovernanceReport builder and TrustEvalResult integration."""

from __future__ import annotations

import json
from pathlib import Path

from torqa.report.builder import (
    governance_report_blocked,
    governance_report_from_policy,
    governance_report_to_dict,
)
from torqa.report.contract import GovernanceReport

REPO = Path(__file__).resolve().parents[1]
FIX = REPO / "tests" / "fixtures" / "n8n"


def _minimal_policy_rep(
    *,
    decision: str = "SAFE_TO_HANDOFF",
    risk_level: str = "low",
    trust_score: int = 85,
    errors: list | None = None,
    warnings: list | None = None,
) -> dict:
    return {
        "policy_ok": decision != "BLOCKED",
        "review_required": decision == "NEEDS_REVIEW",
        "risk_level": risk_level,
        "trust_score": trust_score,
        "trust_tier": {"low": "high", "medium": "medium", "high": "low"}.get(risk_level, "low"),
        "trust_profile": "default",
        "errors": errors or [],
        "warnings": warnings or [],
        "reasons": [],
    }


# ---------------------------------------------------------------------------
# Decision mapping
# ---------------------------------------------------------------------------

def test_decision_safe_to_handoff_maps_to_pass():
    gr = governance_report_from_policy(
        cli_decision="SAFE_TO_HANDOFF",
        policy_rep=_minimal_policy_rep(),
        workflow_name="My Workflow",
    )
    assert gr.decision == "pass"


def test_decision_needs_review_maps_to_review():
    gr = governance_report_from_policy(
        cli_decision="NEEDS_REVIEW",
        policy_rep=_minimal_policy_rep(decision="NEEDS_REVIEW", risk_level="medium"),
        workflow_name="My Workflow",
    )
    assert gr.decision == "review"


def test_decision_blocked_maps_to_block():
    gr = governance_report_from_policy(
        cli_decision="BLOCKED",
        policy_rep=_minimal_policy_rep(decision="BLOCKED"),
        workflow_name="My Workflow",
    )
    assert gr.decision == "block"


def test_unknown_cli_decision_maps_to_block():
    gr = governance_report_from_policy(
        cli_decision="SOMETHING_ELSE",
        policy_rep=_minimal_policy_rep(),
        workflow_name="My Workflow",
    )
    assert gr.decision == "block"


# ---------------------------------------------------------------------------
# Risk → trust_tier mapping
# ---------------------------------------------------------------------------

def test_low_risk_maps_to_high_trust_tier():
    gr = governance_report_from_policy(
        cli_decision="SAFE_TO_HANDOFF",
        policy_rep=_minimal_policy_rep(risk_level="low"),
        workflow_name="Wf",
    )
    assert gr.trust_tier == "high"


def test_medium_risk_maps_to_medium_trust_tier():
    gr = governance_report_from_policy(
        cli_decision="NEEDS_REVIEW",
        policy_rep=_minimal_policy_rep(risk_level="medium", decision="NEEDS_REVIEW"),
        workflow_name="Wf",
    )
    assert gr.trust_tier == "medium"


def test_high_risk_maps_to_low_trust_tier():
    gr = governance_report_from_policy(
        cli_decision="BLOCKED",
        policy_rep=_minimal_policy_rep(risk_level="high", decision="BLOCKED"),
        workflow_name="Wf",
    )
    assert gr.trust_tier == "low"


def test_na_risk_maps_to_low_trust_tier():
    gr = governance_report_from_policy(
        cli_decision="BLOCKED",
        policy_rep=_minimal_policy_rep(risk_level="n/a", decision="BLOCKED"),
        workflow_name="Wf",
    )
    assert gr.trust_tier == "low"


# ---------------------------------------------------------------------------
# Trust score, source, workflow_name
# ---------------------------------------------------------------------------

def test_trust_score_preserved():
    gr = governance_report_from_policy(
        cli_decision="SAFE_TO_HANDOFF",
        policy_rep=_minimal_policy_rep(trust_score=77),
        workflow_name="Wf",
    )
    assert gr.trust_score == 77


def test_source_preserved():
    gr = governance_report_from_policy(
        cli_decision="SAFE_TO_HANDOFF",
        policy_rep=_minimal_policy_rep(),
        workflow_name="Wf",
        source="n8n",
    )
    assert gr.source == "n8n"


def test_workflow_name_preserved():
    gr = governance_report_from_policy(
        cli_decision="SAFE_TO_HANDOFF",
        policy_rep=_minimal_policy_rep(),
        workflow_name="Sales Automation",
    )
    assert gr.workflow_name == "Sales Automation"


def test_bundle_id_provided():
    gr = governance_report_from_policy(
        cli_decision="SAFE_TO_HANDOFF",
        policy_rep=_minimal_policy_rep(),
        workflow_name="Wf",
        bundle_id="n8n:wf_123",
    )
    assert gr.bundle_id == "n8n:wf_123"


def test_bundle_id_auto_generated_when_absent():
    gr = governance_report_from_policy(
        cli_decision="SAFE_TO_HANDOFF",
        policy_rep=_minimal_policy_rep(),
        workflow_name="Wf",
    )
    assert gr.bundle_id.startswith("torqa:")


# ---------------------------------------------------------------------------
# Findings from errors / warnings
# ---------------------------------------------------------------------------

def test_policy_errors_become_error_findings():
    gr = governance_report_from_policy(
        cli_decision="BLOCKED",
        policy_rep=_minimal_policy_rep(errors=["Owner missing", "Severity missing"]),
        workflow_name="Wf",
    )
    error_findings = [f for f in gr.findings if f.severity == "error"]
    assert len(error_findings) == 2


def test_policy_warnings_become_warning_findings():
    gr = governance_report_from_policy(
        cli_decision="NEEDS_REVIEW",
        policy_rep=_minimal_policy_rep(warnings=["High severity noted"], decision="NEEDS_REVIEW"),
        workflow_name="Wf",
    )
    warning_findings = [f for f in gr.findings if f.severity == "warning"]
    assert len(warning_findings) == 1


def test_sem_errors_become_error_findings():
    gr = governance_report_from_policy(
        cli_decision="BLOCKED",
        policy_rep=_minimal_policy_rep(),
        workflow_name="Wf",
        sem_errors=["Transition missing effect_name"],
    )
    sem_findings = [f for f in gr.findings if "SEM" in f.code]
    assert len(sem_findings) == 1
    assert sem_findings[0].severity == "error"


def test_sem_warnings_become_warning_findings():
    gr = governance_report_from_policy(
        cli_decision="SAFE_TO_HANDOFF",
        policy_rep=_minimal_policy_rep(),
        workflow_name="Wf",
        sem_warnings=["Unused input detected"],
    )
    sem_findings = [f for f in gr.findings if "SEM" in f.code]
    assert len(sem_findings) == 1
    assert sem_findings[0].severity == "warning"


def test_no_errors_no_findings():
    gr = governance_report_from_policy(
        cli_decision="SAFE_TO_HANDOFF",
        policy_rep=_minimal_policy_rep(),
        workflow_name="Clean Workflow",
    )
    assert gr.findings == []


# ---------------------------------------------------------------------------
# governance_report_blocked
# ---------------------------------------------------------------------------

def test_blocked_decision_is_block():
    gr = governance_report_blocked(reason="Load error")
    assert gr.decision == "block"


def test_blocked_trust_score_zero():
    gr = governance_report_blocked(reason="Structural error")
    assert gr.trust_score == 0


def test_blocked_trust_tier_low():
    gr = governance_report_blocked()
    assert gr.trust_tier == "low"


def test_blocked_with_reason_creates_finding():
    gr = governance_report_blocked(reason="File not found")
    assert len(gr.findings) == 1
    assert gr.findings[0].severity == "error"
    assert "File not found" in gr.findings[0].explanation


def test_blocked_no_reason_no_findings():
    gr = governance_report_blocked()
    assert gr.findings == []


# ---------------------------------------------------------------------------
# governance_report_to_dict — compat layer
# ---------------------------------------------------------------------------

def test_to_dict_has_required_keys():
    gr = governance_report_from_policy(
        cli_decision="SAFE_TO_HANDOFF",
        policy_rep=_minimal_policy_rep(),
        workflow_name="Wf",
        source="n8n",
    )
    d = governance_report_to_dict(gr)
    for key in ("bundle_id", "source", "workflow_name", "decision", "trust_score", "trust_tier", "findings"):
        assert key in d, f"missing key: {key}"


def test_to_dict_decision_matches():
    gr = governance_report_from_policy(
        cli_decision="SAFE_TO_HANDOFF",
        policy_rep=_minimal_policy_rep(),
        workflow_name="Wf",
    )
    d = governance_report_to_dict(gr)
    assert d["decision"] == "pass"


def test_to_dict_findings_serializable():
    gr = governance_report_from_policy(
        cli_decision="BLOCKED",
        policy_rep=_minimal_policy_rep(errors=["Owner missing"]),
        workflow_name="Wf",
    )
    d = governance_report_to_dict(gr)
    assert isinstance(d["findings"], list)
    f = d["findings"][0]
    assert "finding_id" in f
    assert "code" in f
    assert "severity" in f
    # Must be JSON-serializable
    json.dumps(d)


# ---------------------------------------------------------------------------
# TrustEvalResult.governance_report integration
# ---------------------------------------------------------------------------

def test_evaluate_trust_from_bundle_attaches_governance_report():
    """evaluate_trust_from_bundle returns TrustEvalResult with governance_report set."""
    from torqa.cli.check_cmd import evaluate_trust_from_bundle

    raw = json.loads((FIX / "minimal_chain.json").read_text(encoding="utf-8"))
    from torqa.integrations.n8n.adapter import N8nAdapter
    adapter = N8nAdapter()
    wb = adapter.to_bundle(adapter.parse(raw))
    bundle = wb.metadata["_ir_bundle"]

    result = evaluate_trust_from_bundle(bundle)
    assert result.governance_report is not None
    assert isinstance(result.governance_report, GovernanceReport)


def test_evaluate_trust_from_bundle_governance_report_source():
    from torqa.cli.check_cmd import evaluate_trust_from_bundle

    raw = json.loads((FIX / "minimal_chain.json").read_text(encoding="utf-8"))
    from torqa.integrations.n8n.adapter import N8nAdapter
    adapter = N8nAdapter()
    wb = adapter.to_bundle(adapter.parse(raw))
    bundle = wb.metadata["_ir_bundle"]

    result = evaluate_trust_from_bundle(bundle)
    assert result.governance_report is not None
    assert result.governance_report.source == "n8n"


def test_evaluate_trust_from_bundle_governance_report_workflow_name():
    from torqa.cli.check_cmd import evaluate_trust_from_bundle

    raw = json.loads((FIX / "minimal_chain.json").read_text(encoding="utf-8"))
    from torqa.integrations.n8n.adapter import N8nAdapter
    adapter = N8nAdapter()
    wb = adapter.to_bundle(adapter.parse(raw))
    bundle = wb.metadata["_ir_bundle"]

    result = evaluate_trust_from_bundle(bundle)
    assert result.governance_report is not None
    assert result.governance_report.workflow_name == "Minimal chain"


def test_evaluate_trust_from_bundle_governance_report_decision_consistent():
    """GovernanceReport.decision must be consistent with TrustEvalResult.decision."""
    from torqa.cli.check_cmd import DECISION_SAFE, DECISION_REVIEW, DECISION_BLOCKED, evaluate_trust_from_bundle

    _cli_to_gr = {DECISION_SAFE: "pass", DECISION_REVIEW: "review", DECISION_BLOCKED: "block"}

    raw = json.loads((FIX / "minimal_chain.json").read_text(encoding="utf-8"))
    from torqa.integrations.n8n.adapter import N8nAdapter
    adapter = N8nAdapter()
    wb = adapter.to_bundle(adapter.parse(raw))
    bundle = wb.metadata["_ir_bundle"]

    result = evaluate_trust_from_bundle(bundle)
    assert result.governance_report is not None
    expected_gr_decision = _cli_to_gr[result.decision]
    assert result.governance_report.decision == expected_gr_decision


def test_existing_trust_eval_fields_unchanged():
    """Adding governance_report must not break existing TrustEvalResult fields."""
    from torqa.cli.check_cmd import evaluate_trust_from_bundle

    raw = json.loads((FIX / "minimal_chain.json").read_text(encoding="utf-8"))
    from torqa.integrations.n8n.adapter import N8nAdapter
    adapter = N8nAdapter()
    wb = adapter.to_bundle(adapter.parse(raw))
    bundle = wb.metadata["_ir_bundle"]

    result = evaluate_trust_from_bundle(bundle)
    # These fields must still be present and typed correctly
    assert isinstance(result.decision, str)
    assert isinstance(result.risk, str)
    assert isinstance(result.trust_profile, str)
    assert isinstance(result.reason_summary, str)
    assert isinstance(result.has_warnings, bool)
