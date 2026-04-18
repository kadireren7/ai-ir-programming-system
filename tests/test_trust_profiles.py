"""Built-in trust profiles: selection, CLI, and differing outcomes."""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from src.ir.canonical_ir import ir_goal_from_json
from src.policy import build_policy_report, normalize_trust_profile
from src.policy.profiles import BUILTIN_PROFILES
from src.surface.parse_tq import parse_tq_source
from src.torqa_cli.main import main

TQ_META = """intent example_flow
requires username, password, ip_address
meta:
  owner team_a
  severity high
result Done
flow:
  create session
  emit login_success
"""


def test_normalize_trust_profile_accepts_builtin_names():
    assert normalize_trust_profile("default") == "default"
    assert normalize_trust_profile("Strict") == "strict"
    assert normalize_trust_profile(" review-heavy ") == "review-heavy"


def test_normalize_trust_profile_rejects_unknown():
    with pytest.raises(ValueError, match="Unknown trust profile"):
        normalize_trust_profile("custom")


def test_builtin_profiles_frozen_set():
    assert BUILTIN_PROFILES == frozenset({"default", "strict", "review-heavy"})


def test_strict_fails_policy_when_severity_high_default_passes():
    goal = ir_goal_from_json(parse_tq_source(TQ_META))
    d = build_policy_report(goal, profile="default")
    s = build_policy_report(goal, profile="strict")
    assert d["policy_ok"] is True
    assert d["trust_profile"] == "default"
    assert s["policy_ok"] is False
    assert s["trust_profile"] == "strict"
    assert any("strict" in e.lower() for e in s["errors"])


def test_review_heavy_marks_review_for_four_transitions():
    stub = SimpleNamespace(
        metadata={"surface_meta": {"owner": "o", "severity": "low"}},
        transitions=[0, 1, 2, 3],
    )
    d = build_policy_report(stub, profile="default")  # type: ignore[arg-type]
    rh = build_policy_report(stub, profile="review-heavy")  # type: ignore[arg-type]
    assert d["review_required"] is False
    assert rh["review_required"] is True
    assert rh["policy_ok"] is True


def test_cli_validate_prints_trust_profile(tmp_path, capsys):
    p = tmp_path / "t.tq"
    p.write_text(
        """intent example_flow
requires username, password, ip_address
meta:
  owner a
  severity low
result Done
flow:
  create session
  emit login_success
""",
        encoding="utf-8",
    )
    code = main(["validate", "--profile", "review-heavy", str(p)])
    assert code == 0
    out = capsys.readouterr().out
    assert "Trust profile: review-heavy" in out


def test_cli_doctor_prints_trust_profile(tmp_path, capsys):
    p = tmp_path / "t.tq"
    p.write_text(
        """intent example_flow
requires username, password, ip_address
meta:
  owner a
  severity low
result Done
flow:
  create session
  emit login_success
""",
        encoding="utf-8",
    )
    code = main(["doctor", "--profile", "strict", str(p)])
    assert code == 0
    out = capsys.readouterr().out
    assert "Trust profile: strict" in out


def test_cli_invalid_profile_exits_nonzero(tmp_path):
    p = tmp_path / "t.tq"
    p.write_text("intent x\nrequires u, password, ip_address\nresult OK\nflow:\n  create session\n", encoding="utf-8")
    with pytest.raises(SystemExit) as ei:
        main(["validate", "--profile", "bogus", str(p)])
    assert ei.value.code == 2
