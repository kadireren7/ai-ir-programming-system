"""Tests for ``torqa check`` compact summary."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from torqa.surface.parse_tq import parse_tq_source
from torqa.cli.main import main

VALID_TQ = """intent example_flow
requires username, password, ip_address
meta:
  owner test_team
  severity low
result Done
flow:
  create session
  emit login_success
"""


@pytest.fixture
def sample_bundle():
    return parse_tq_source(VALID_TQ)


def test_check_safe_to_handoff(tmp_path: Path, capsys):
    p = tmp_path / "ok.tq"
    p.write_text(VALID_TQ, encoding="utf-8")
    code = main(["check", str(p)])
    assert code == 0
    out = capsys.readouterr().out
    assert "Decision: SAFE_TO_HANDOFF" in out
    assert "Risk: low" in out
    assert "Trust profile: default" in out
    assert "Readiness score: 100/100" in out
    assert "Top reason:" in out
    assert "Suggested fix: None - policy satisfied for this profile" in out
    assert "Suggested next step:" in out


def test_check_needs_review_high_severity(tmp_path: Path, capsys):
    tq = VALID_TQ.replace("severity low", "severity high")
    p = tmp_path / "hi.tq"
    p.write_text(tq, encoding="utf-8")
    code = main(["check", str(p)])
    assert code == 0
    out = capsys.readouterr().out
    assert "Decision: NEEDS_REVIEW" in out
    assert "Risk: high" in out
    assert "Readiness score: 85/100" in out
    assert "Suggested fix:" in out


def test_check_blocked_policy(tmp_path: Path, capsys):
    p = tmp_path / "no_meta.tq"
    p.write_text(
        """intent example_flow
requires username, password, ip_address
result Done
flow:
  create session
  emit login_success
""",
        encoding="utf-8",
    )
    code = main(["check", str(p)])
    assert code == 1
    out = capsys.readouterr().out
    assert "Decision: BLOCKED" in out
    assert "Suggested fix: Add metadata owner" in out
    assert "Readiness score: 50/100" in out
    assert "owner" in out.lower() or "Policy" in out or "required" in out.lower()


def test_check_blocked_parse(tmp_path: Path, capsys):
    p = tmp_path / "bad.tq"
    p.write_text(
        "intent x\nrequires u, password, ip_address\nresult OK\n",
        encoding="utf-8",
    )
    code = main(["check", str(p)])
    assert code == 1
    out = capsys.readouterr().out
    assert "Decision: BLOCKED" in out
    assert "Readiness score: 0/100" in out
    assert "Suggested fix:" in out
    assert "PX_TQ" in out or "parse" in out.lower()


def test_check_strict_blocks_high_severity(tmp_path: Path, capsys):
    tq = VALID_TQ.replace("severity low", "severity high")
    p = tmp_path / "hi.tq"
    p.write_text(tq, encoding="utf-8")
    code = main(["check", "--profile", "strict", str(p)])
    assert code == 1
    out = capsys.readouterr().out
    assert "Decision: BLOCKED" in out
    assert "Readiness score: 50/100" in out
    assert "Suggested fix: Lower severity or use review path" in out
    assert "strict" in out.lower()


def test_check_json_bundle(tmp_path: Path, capsys, sample_bundle):
    p = tmp_path / "b.json"
    p.write_text(json.dumps(sample_bundle), encoding="utf-8")
    code = main(["check", str(p)])
    assert code == 0
    out = capsys.readouterr().out
    assert "SAFE_TO_HANDOFF" in out
    assert "Readiness score: 100/100" in out


def test_check_suggested_fix_header_order(tmp_path: Path, capsys):
    p = tmp_path / "order.tq"
    p.write_text(
        """result Done
intent example_flow
requires username, password, ip_address
meta:
  owner t
  severity low
flow:
  create session
  emit login_success
""",
        encoding="utf-8",
    )
    code = main(["check", str(p)])
    assert code == 1
    out = capsys.readouterr().out
    assert "PX_TQ_HEADER_ORDER" in out
    assert "Readiness score: 0/100" in out
    assert "Suggested fix: Use strict tq_v1 header order" in out


def test_check_suggested_fix_unknown_flow_step(tmp_path: Path, capsys):
    p = tmp_path / "badstep.tq"
    p.write_text(
        """intent example_flow
requires username, password, ip_address
meta:
  owner t
  severity low
result Done
flow:
  frobnicate widgets
""",
        encoding="utf-8",
    )
    code = main(["check", str(p)])
    assert code == 1
    out = capsys.readouterr().out
    assert "PX_TQ_UNKNOWN_FLOW_STEP" in out
    assert "Readiness score: 0/100" in out
    assert "Suggested fix: Use supported flow steps" in out


def test_doctor_suggested_fix_missing_owner(tmp_path: Path, capsys):
    p = tmp_path / "no_meta.tq"
    p.write_text(
        """intent example_flow
requires username, password, ip_address
result Done
flow:
  create session
  emit login_success
""",
        encoding="utf-8",
    )
    code = main(["doctor", str(p)])
    assert code == 1
    out = capsys.readouterr().out
    assert "Suggested fix: Add metadata owner" in out
    assert "Readiness score: 50/100" in out


def test_doctor_suggested_fix_strict_profile(tmp_path: Path, capsys):
    tq = VALID_TQ.replace("severity low", "severity high")
    p = tmp_path / "hi.tq"
    p.write_text(tq, encoding="utf-8")
    code = main(["doctor", "--profile", "strict", str(p)])
    assert code == 1
    out = capsys.readouterr().out
    assert "Suggested fix: Lower severity or use review path" in out
    assert "Readiness score: 50/100" in out


def test_doctor_includes_suggested_fix_on_parse_fail(tmp_path: Path, capsys):
    p = tmp_path / "bad.tq"
    p.write_text(
        "intent x\nrequires u, password, ip_address\nresult OK\n",
        encoding="utf-8",
    )
    code = main(["doctor", str(p)])
    assert code == 1
    out = capsys.readouterr().out
    assert "Suggested fix:" in out
    assert "Readiness score: 0/100" in out
