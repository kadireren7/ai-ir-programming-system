"""Tests for ``torqa scan``."""

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

NO_META_TQ = """intent example_flow
requires username, password, ip_address
result Done
flow:
  create session
  emit login_success
"""


def test_scan_directory_counts_and_blocked_exit(tmp_path: Path, capsys):
    (tmp_path / "good").mkdir()
    (tmp_path / "good" / "ok.tq").write_text(VALID_TQ, encoding="utf-8")
    (tmp_path / "bad.tq").write_text(NO_META_TQ, encoding="utf-8")
    bundle = parse_tq_source(VALID_TQ, tq_path=tmp_path / "x.tq")
    (tmp_path / "nested").mkdir()
    (tmp_path / "nested" / "b.json").write_text(json.dumps(bundle), encoding="utf-8")

    code = main(["scan", str(tmp_path)])
    assert code == 1
    out = capsys.readouterr().out
    assert "Total files: 3" in out
    assert "Safe: 2" in out
    assert "Blocked: 1" in out
    assert "bad.tq" in out
    assert "SAFE_TO_HANDOFF" in out or "NEEDS_REVIEW" in out


def test_scan_all_safe_exits_zero(tmp_path: Path, capsys):
    (tmp_path / "a.tq").write_text(VALID_TQ, encoding="utf-8")
    (tmp_path / "sub").mkdir()
    (tmp_path / "sub" / "b.tq").write_text(VALID_TQ, encoding="utf-8")
    code = main(["scan", str(tmp_path)])
    assert code == 0
    out = capsys.readouterr().out
    assert "Total files: 2" in out
    assert "Safe: 2" in out
    assert "Blocked: 0" in out


def test_scan_empty_directory(tmp_path: Path, capsys):
    code = main(["scan", str(tmp_path)])
    assert code == 0
    out = capsys.readouterr().out
    assert "Total files: 0" in out


def test_scan_single_file(tmp_path: Path, capsys):
    p = tmp_path / "one.tq"
    p.write_text(VALID_TQ, encoding="utf-8")
    code = main(["scan", str(p)])
    assert code == 0
    out = capsys.readouterr().out
    assert "Total files: 1" in out
    assert "one.tq" in out


def test_scan_not_found(capsys):
    code = main(["scan", "/nonexistent/torqa_scan_xyz"])
    assert code == 1
    assert "not found" in capsys.readouterr().err.lower()


def test_scan_help_exits_zero():
    with pytest.raises(SystemExit) as ei:
        main(["scan", "--help"])
    assert ei.value.code == 0
