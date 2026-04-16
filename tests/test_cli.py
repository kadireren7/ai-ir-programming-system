"""Tests for the ``torqa`` CLI entrypoint."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

from src.ir.canonical_ir import CANONICAL_IR_VERSION
from src.torqa_cli.main import main

VALID_TQ = """intent example_flow
requires username, password, ip_address
result Done
flow:
  create session
  emit login_success
"""


def test_cli_version_exits_zero(capsys):
    code = main(["version"])
    assert code == 0
    out = capsys.readouterr().out
    assert "torqa" in out.lower()
    assert CANONICAL_IR_VERSION in out


def test_cli_validate_passes_on_good_file(tmp_path: Path, capsys):
    p = tmp_path / "ok.tq"
    p.write_text(VALID_TQ, encoding="utf-8")
    code = main(["validate", str(p)])
    assert code == 0
    out = capsys.readouterr().out
    assert "Input type: tq" in out
    assert "PASS" in out
    assert "semantic_ok:    True" in out
    assert "parse:          OK" in out


def test_cli_validate_fails_on_parse_error(tmp_path: Path, capsys):
    p = tmp_path / "bad.tq"
    p.write_text(
        "intent x\nrequires u, password, ip_address\nresult OK\n",
        encoding="utf-8",
    )
    code = main(["validate", str(p)])
    assert code == 1
    err = capsys.readouterr().err
    assert "PX_TQ_MISSING_FLOW" in err or "parse failed" in err.lower()


def test_cli_inspect_prints_json(tmp_path: Path, capsys):
    p = tmp_path / "ok.tq"
    p.write_text(VALID_TQ, encoding="utf-8")
    code = main(["inspect", str(p)])
    assert code == 0
    out = capsys.readouterr().out
    data = json.loads(out)
    assert "ir_goal" in data
    assert data["ir_goal"]["goal"] == "ExampleFlow"


def test_cli_doctor_ok(tmp_path: Path, capsys):
    p = tmp_path / "ok.tq"
    p.write_text(VALID_TQ, encoding="utf-8")
    code = main(["doctor", str(p)])
    assert code == 0
    out = capsys.readouterr().out
    assert "Parse:        OK" in out
    assert "looks good" in out.lower()


def test_cli_doctor_fails_on_bad_file(tmp_path: Path, capsys):
    p = tmp_path / "bad.tq"
    p.write_text("intent only\n", encoding="utf-8")
    code = main(["doctor", str(p)])
    assert code == 1
    out = capsys.readouterr().out
    assert "FAILED" in out


def test_cli_validate_missing_file(capsys):
    code = main(["validate", "/nonexistent/path/file.tq"])
    assert code == 1
    assert "not a file" in capsys.readouterr().err.lower()


def test_cli_help_exits_zero():
    with pytest.raises(SystemExit) as ei:
        main(["--help"])
    assert ei.value.code == 0


def test_cli_subcommand_help():
    with pytest.raises(SystemExit) as ei:
        main(["validate", "--help"])
    assert ei.value.code == 0


def test_cli_module_runnable():
    """``python -m src.torqa_cli`` runs with PYTHONPATH=repo root."""
    import subprocess

    root = Path(__file__).resolve().parents[1]
    r = subprocess.run(
        [sys.executable, "-m", "src.torqa_cli", "version"],
        cwd=root,
        capture_output=True,
        text=True,
        env={**__import__("os").environ, "PYTHONPATH": str(root)},
    )
    assert r.returncode == 0
    assert "torqa" in r.stdout.lower()
