import json
from pathlib import Path

import pytest

from src.diagnostics.report import build_full_diagnostic_report
from src.ir.canonical_ir import CANONICAL_IR_VERSION, ir_goal_from_json, validate_ir
from src.semantics.ir_semantics import build_ir_semantic_report, default_ir_function_registry
from src.surface.parse_tq import TQParseError, parse_tq_source

REPO = Path(__file__).resolve().parents[1]


def test_parse_tq_result_line_overrides_default_result():
    raw = (REPO / "examples" / "torqa" / "signin_flow.tq").read_text(encoding="utf-8")
    bundle = parse_tq_source(raw)
    assert bundle["ir_goal"]["result"] == "Sign-in completed"


def test_all_examples_torqa_tq_pass_diagnostics():
    for path in sorted((REPO / "examples" / "torqa").glob("*.tq")):
        bundle = parse_tq_source(path.read_text(encoding="utf-8"))
        g = ir_goal_from_json(bundle)
        rep = build_full_diagnostic_report(g)
        assert rep["ok"] is True, f"{path.name}: {rep}"


def test_parse_auth_login_tq_passes_diagnostics():
    raw = (REPO / "examples" / "torqa" / "auth_login.tq").read_text(encoding="utf-8")
    bundle = parse_tq_source(raw)
    assert bundle["ir_goal"]["goal"] == "UserLogin"
    assert bundle["ir_goal"]["metadata"]["ir_version"] == CANONICAL_IR_VERSION
    g = ir_goal_from_json(bundle)
    assert not validate_ir(g)
    rep = build_full_diagnostic_report(g)
    assert rep["ok"] is True
    sem = build_ir_semantic_report(g, default_ir_function_registry())
    assert sem["semantic_ok"] is True


def test_parse_tq_missing_ip_raises_stable_code():
    src = """
intent x
requires username, password, p2
flow:
  emit login_success
"""
    with pytest.raises(TQParseError) as ei:
        parse_tq_source(src)
    assert ei.value.code == "PX_TQ_MISSING_IP"


def test_surface_cmd_accepts_tq(tmp_path):
    from src.cli.main import main

    out = tmp_path / "b.json"
    rc = main(["surface", str(REPO / "examples" / "torqa" / "auth_login.tq"), "--out", str(out)])
    assert rc == 0
    data = json.loads(out.read_text(encoding="utf-8"))
    assert data["ir_goal"]["goal"] == "UserLogin"
