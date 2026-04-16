"""CLI tests for ``.json`` bundle / bare ``ir_goal`` input."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

from src.surface.parse_tq import parse_tq_source
from src.torqa_cli.main import main

VALID_TQ = """intent example_flow
requires username, password, ip_address
result Done
flow:
  create session
  emit login_success
"""


@pytest.fixture
def sample_bundle() -> dict:
    return parse_tq_source(VALID_TQ)


def test_cli_validate_full_bundle_json(tmp_path: Path, capsys, sample_bundle):
    p = tmp_path / "b.json"
    p.write_text(json.dumps(sample_bundle), encoding="utf-8")
    code = main(["validate", str(p)])
    assert code == 0
    out = capsys.readouterr().out
    assert "Input type: json" in out
    assert "PASS" in out
    assert "load:          OK" in out


def test_cli_validate_bare_ir_goal_json(tmp_path: Path, capsys, sample_bundle):
    p = tmp_path / "goal.json"
    p.write_text(json.dumps(sample_bundle["ir_goal"]), encoding="utf-8")
    code = main(["validate", str(p)])
    assert code == 0
    out = capsys.readouterr().out
    assert "Input type: json" in out


def test_cli_validate_invalid_json_syntax(tmp_path: Path, capsys):
    p = tmp_path / "bad.json"
    p.write_text("{ not json", encoding="utf-8")
    code = main(["validate", str(p)])
    assert code == 1
    err = capsys.readouterr().err
    assert "invalid JSON" in err.lower() or "JSON load failed" in err


def test_cli_validate_invalid_envelope(tmp_path: Path, capsys):
    p = tmp_path / "bad.json"
    p.write_text(json.dumps({"ir_goal": {}, "extra_top": 1}), encoding="utf-8")
    code = main(["validate", str(p)])
    assert code == 1
    err = capsys.readouterr().err
    assert "unknown top-level" in err.lower() or "Bundle envelope" in err


def test_cli_inspect_json_stdout_pure(tmp_path: Path, capsys, sample_bundle):
    p = tmp_path / "b.json"
    p.write_text(json.dumps(sample_bundle), encoding="utf-8")
    code = main(["inspect", str(p)])
    assert code == 0
    captured = capsys.readouterr()
    assert "Input type: json" in captured.err
    data = json.loads(captured.out)
    assert data["ir_goal"]["goal"] == "ExampleFlow"


def test_cli_doctor_json(tmp_path: Path, capsys, sample_bundle):
    p = tmp_path / "b.json"
    p.write_text(json.dumps(sample_bundle), encoding="utf-8")
    code = main(["doctor", str(p)])
    assert code == 0
    out = capsys.readouterr().out
    assert "Input type:   json" in out
    assert "Load:         OK" in out


def test_cli_unsupported_extension(tmp_path: Path, capsys):
    p = tmp_path / "x.yaml"
    p.write_text("a: 1", encoding="utf-8")
    code = main(["validate", str(p)])
    assert code == 1
    assert ".yaml" in capsys.readouterr().err or "unsupported" in capsys.readouterr().err.lower()
