"""Deterministic trust policy reports on IR."""

from __future__ import annotations

import copy

from torqa.ir.canonical_ir import ir_goal_from_json
from torqa.policy import build_policy_report
from torqa.surface.parse_tq import parse_tq_source

TQ_WITH_META = """intent example_flow
requires username, password, ip_address
meta:
  owner team_a
  severity low
result Done
flow:
  create session
  emit login_success
"""


def _bundle_six_transitions_for_policy_warning() -> dict:
    """Valid IR bundle with six transitions (policy warns on count > 5)."""
    b = copy.deepcopy(parse_tq_source(TQ_WITH_META))
    ig = b["ir_goal"]

    def idn(n: str) -> dict:
        return {"type": "identifier", "name": n}

    ig["transitions"] = [
        {
            "transition_id": "t_0001",
            "effect_name": "verify_username",
            "arguments": [idn("username")],
            "from_state": "before",
            "to_state": "before",
        },
        {
            "transition_id": "t_0002",
            "effect_name": "verify_password",
            "arguments": [idn("username"), idn("password")],
            "from_state": "before",
            "to_state": "before",
        },
        {
            "transition_id": "t_0003",
            "effect_name": "reset_failed_attempts",
            "arguments": [idn("username")],
            "from_state": "before",
            "to_state": "before",
        },
        {
            "transition_id": "t_0004",
            "effect_name": "ip_blacklisted",
            "arguments": [idn("ip_address")],
            "from_state": "before",
            "to_state": "before",
        },
        {
            "transition_id": "t_0005",
            "effect_name": "start_session",
            "arguments": [idn("username")],
            "from_state": "before",
            "to_state": "after",
        },
        {
            "transition_id": "t_0006",
            "effect_name": "log_successful_login",
            "arguments": [idn("username"), idn("ip_address")],
            "from_state": "after",
            "to_state": "after",
        },
    ]
    return b


def test_policy_passes_with_owner_and_severity():
    bundle = parse_tq_source(TQ_WITH_META)
    goal = ir_goal_from_json(bundle)
    r = build_policy_report(goal)
    assert r["policy_ok"] is True
    assert r["trust_profile"] == "default"
    assert r["review_required"] is False
    assert r["risk_level"] == "low"
    assert r["errors"] == []
    assert r["warnings"] == []
    assert any("Within current heuristics" in x for x in r["reasons"])


def test_policy_fails_missing_owner():
    bundle = parse_tq_source(TQ_WITH_META)
    goal = ir_goal_from_json(bundle)
    sm = dict(goal.metadata["surface_meta"])
    del sm["owner"]
    goal.metadata["surface_meta"] = sm
    r = build_policy_report(goal)
    assert r["policy_ok"] is False
    assert any("owner is required" in e for e in r["errors"])


def test_policy_fails_missing_severity():
    bundle = parse_tq_source(TQ_WITH_META)
    goal = ir_goal_from_json(bundle)
    sm = dict(goal.metadata["surface_meta"])
    del sm["severity"]
    goal.metadata["surface_meta"] = sm
    r = build_policy_report(goal)
    assert r["policy_ok"] is False
    assert any("severity is required" in e for e in r["errors"])


def test_policy_high_severity_sets_review_required():
    tq = TQ_WITH_META.replace("severity low", "severity high")
    goal = ir_goal_from_json(parse_tq_source(tq))
    r = build_policy_report(goal)
    assert r["policy_ok"] is True
    assert r["review_required"] is True
    assert r["risk_level"] == "high"


def test_policy_warns_when_transition_count_exceeds_five():
    goal = ir_goal_from_json(_bundle_six_transitions_for_policy_warning())
    r = build_policy_report(goal)
    assert r["policy_ok"] is True
    assert r["risk_level"] == "medium"
    assert len(r["warnings"]) == 1
    assert "transition count is 6" in r["warnings"][0]
