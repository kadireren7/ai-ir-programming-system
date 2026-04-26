"""Tests for ``torqa explain``."""

from __future__ import annotations

from pathlib import Path

import pytest

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


def test_explain_ok_passes_and_prints_sections(tmp_path: Path, capsys):
    p = tmp_path / "ok.tq"
    p.write_text(VALID_TQ, encoding="utf-8")
    code = main(["explain", str(p)])
    assert code == 0
    out = capsys.readouterr().out
    assert "Torqa explanation for" in out
    assert "What this spec does:" in out
    assert "ExampleFlow" in out
    assert "Why risk is low" in out
    assert "Blocked or approved for handoff:" in out
    assert "Approved for handoff" in out
    assert "What to improve next:" in out


def test_explain_parse_failure(tmp_path: Path, capsys):
    p = tmp_path / "bad.tq"
    p.write_text("intent only\n", encoding="utf-8")
    code = main(["explain", str(p)])
    assert code == 1
    out = capsys.readouterr().out
    assert "What this spec does:" in out
    assert "Why risk is not assigned yet:" in out
    assert "Not approved" in out
    assert "What to improve next:" in out


def test_explain_policy_failure_missing_meta(tmp_path: Path, capsys):
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
    code = main(["explain", str(p)])
    assert code == 1
    out = capsys.readouterr().out
    assert "Why risk is high" in out or "Why risk is" in out
    assert "Not approved: trust policy" in out or "Not approved" in out
    assert "What to improve next:" in out


def test_explain_strict_blocks_high_severity(tmp_path: Path, capsys):
    tq = VALID_TQ.replace("severity low", "severity high")
    p = tmp_path / "hi.tq"
    p.write_text(tq, encoding="utf-8")
    code = main(["explain", "--profile", "strict", str(p)])
    assert code == 1
    out = capsys.readouterr().out
    assert "Not approved" in out


def test_explain_needs_review_high_severity_default_profile(tmp_path: Path, capsys):
    tq = VALID_TQ.replace("severity low", "severity high")
    p = tmp_path / "hi.tq"
    p.write_text(tq, encoding="utf-8")
    code = main(["explain", str(p)])
    assert code == 0
    out = capsys.readouterr().out
    assert "Conditionally approved" in out or "review" in out.lower()


def test_explain_help_exits_zero():
    with pytest.raises(SystemExit) as ei:
        main(["explain", "--help"])
    assert ei.value.code == 0


def test_explain_missing_file(capsys):
    code = main(["explain", "/nonexistent/nope.tq"])
    assert code == 1
    assert "not a file" in capsys.readouterr().err.lower()
