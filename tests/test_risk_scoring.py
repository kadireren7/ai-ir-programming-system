"""Deterministic trust risk level and reasons (policy report extension)."""

from __future__ import annotations

from types import SimpleNamespace

from torqa.ir.canonical_ir import ir_goal_from_json
from torqa.policy import build_policy_report
from torqa.surface.parse_tq import parse_tq_source

TQ_BASE = """intent example_flow
requires username, password, ip_address
meta:
  owner team_a
  severity low
result Done
flow:
  create session
  emit login_success
"""


def test_risk_low_when_policy_passes_and_small_graph():
    goal = ir_goal_from_json(parse_tq_source(TQ_BASE))
    r = build_policy_report(goal)
    assert r["trust_profile"] == "default"
    assert r["policy_ok"] is True
    assert r["risk_level"] == "low"
    assert len(r["reasons"]) == 1
    assert "Within current heuristics" in r["reasons"][0]
    assert "trust_score" in r and r["trust_decision"] == "PASS"
    assert r["confidence"] in ("high", "medium", "low")
    assert isinstance(r.get("score_factors"), list)


def test_enterprise_trust_gate_can_fail_on_score_with_high_severity_and_many_steps():
    stub = SimpleNamespace(
        metadata={
            "ir_version": "1.4",
            "surface_meta": {"owner": "o", "severity": "high"},
        },
        transitions=[0, 1, 2, 3, 4, 5, 6, 7],
    )
    r = build_policy_report(stub, profile="enterprise")  # type: ignore[arg-type]
    assert r["policy_ok"] is True
    assert r["trust_decision"] == "FAIL"
    assert int(r["trust_score"]) < int(r["min_trust_score"])


def test_risk_high_when_owner_missing():
    goal = ir_goal_from_json(parse_tq_source(TQ_BASE))
    sm = dict(goal.metadata["surface_meta"])
    del sm["owner"]
    goal.metadata["surface_meta"] = sm
    r = build_policy_report(goal)
    assert r["policy_ok"] is False
    assert r["risk_level"] == "high"
    assert any("owner" in x.lower() for x in r["reasons"])


def test_risk_high_when_severity_missing():
    goal = ir_goal_from_json(parse_tq_source(TQ_BASE))
    sm = dict(goal.metadata["surface_meta"])
    del sm["severity"]
    goal.metadata["surface_meta"] = sm
    r = build_policy_report(goal)
    assert r["policy_ok"] is False
    assert r["risk_level"] == "high"
    assert any("severity" in x.lower() for x in r["reasons"])


def test_risk_high_when_severity_label_is_high_and_review_required():
    tq = TQ_BASE.replace("severity low", "severity high")
    goal = ir_goal_from_json(parse_tq_source(tq))
    r = build_policy_report(goal)
    assert r["policy_ok"] is True
    assert r["review_required"] is True
    assert r["risk_level"] == "high"
    assert any("severity label is high" in x for x in r["reasons"])


def test_risk_medium_when_more_than_five_transitions():
    stub = SimpleNamespace(
        metadata={"surface_meta": {"owner": "o", "severity": "low"}},
        transitions=[0, 1, 2, 3, 4, 5],
    )
    r = build_policy_report(stub)  # type: ignore[arg-type]
    assert r["policy_ok"] is True
    assert r["risk_level"] == "medium"
    assert not any("Within current heuristics" in x for x in r["reasons"])
    assert any("more than five transitions" in x for x in r["reasons"])


def test_high_severity_and_many_transitions_lists_both_reasons():
    stub = SimpleNamespace(
        metadata={"surface_meta": {"owner": "o", "severity": "high"}},
        transitions=[0, 1, 2, 3, 4, 5],
    )
    r = build_policy_report(stub)  # type: ignore[arg-type]
    assert r["risk_level"] == "high"
    assert any("severity label is high" in x for x in r["reasons"])
    assert any("more than five transitions" in x for x in r["reasons"])


def test_trust_scoring_surfaces_when_advanced_analysis_raises(monkeypatch):
    """Regression: advanced analysis must not fail silently inside trust scoring."""
    from torqa.policy import risk_engine as risk_engine_mod

    def _boom(*args, **kwargs):
        raise RuntimeError("simulated advanced analysis failure")

    monkeypatch.setattr(risk_engine_mod, "run_advanced_analysis", _boom)
    goal = ir_goal_from_json(parse_tq_source(TQ_BASE))
    r = build_policy_report(goal)
    issues = r.get("trust_scoring_issues") or []
    assert issues and issues[0].get("code") == "TORQA_TRUST_SCORING_RUNTIME"
    assert any("Trust scoring" in w and "RuntimeError" in w for w in (r.get("warnings") or []))
    assert any(f.get("id") == "advanced_analysis_failed" for f in (r.get("score_factors") or []))
