"""Tests for ``torqa compare``."""

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


def test_compare_prints_table_three_profiles(tmp_path: Path, capsys):
    p = tmp_path / "ok.tq"
    p.write_text(VALID_TQ, encoding="utf-8")
    code = main(["compare", str(p)])
    assert code == 0
    out = capsys.readouterr().out
    assert "Profile" in out and "Decision" in out and "Risk" in out and "Review" in out and "Notes" in out
    assert out.count("default") >= 1
    assert out.count("strict") >= 1
    assert out.count("review-heavy") >= 1
    assert out.count("enterprise") >= 1
    assert "SAFE_TO_HANDOFF" in out or "NEEDS_REVIEW" in out


def test_compare_high_severity_shows_differences(tmp_path: Path, capsys):
    tq = VALID_TQ.replace("severity low", "severity high")
    p = tmp_path / "hi.tq"
    p.write_text(tq, encoding="utf-8")
    code = main(["compare", str(p)])
    assert code == 0
    out = capsys.readouterr().out
    assert "strict" in out
    assert "NEEDS_REVIEW" in out
    lines = [ln.strip() for ln in out.splitlines() if ln.strip().startswith("strict")]
    assert lines and "BLOCKED" in lines[0]


def test_compare_early_failure_exit_one(tmp_path: Path, capsys):
    p = tmp_path / "bad.tq"
    p.write_text("intent only\n", encoding="utf-8")
    code = main(["compare", str(p)])
    assert code == 1
    out = capsys.readouterr().out
    assert "BLOCKED" in out
    assert "default" in out


def test_compare_missing_file(capsys):
    code = main(["compare", "/nonexistent/x.tq"])
    assert code == 1
    assert "not a file" in capsys.readouterr().err.lower()


def test_compare_help_exits_zero():
    with pytest.raises(SystemExit) as ei:
        main(["compare", "--help"])
    assert ei.value.code == 0
