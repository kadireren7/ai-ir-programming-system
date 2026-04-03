import json
from pathlib import Path

import pytest

from src.diagnostics.report import build_full_diagnostic_report
from src.ir.canonical_ir import CANONICAL_IR_VERSION, ir_goal_from_json, validate_ir
from src.semantics.ir_semantics import build_ir_semantic_report, default_ir_function_registry
from src.surface.parse_tq import TQParseError, parse_tq_source

REPO = Path(__file__).resolve().parents[1]


def test_parse_tq_result_line_overrides_default_result():
    path = REPO / "examples" / "torqa" / "signin_flow.tq"
    raw = path.read_text(encoding="utf-8")
    bundle = parse_tq_source(raw, tq_path=path)
    assert bundle["ir_goal"]["result"] == "Sign-in completed"


def test_all_examples_torqa_tq_pass_diagnostics():
    root = REPO / "examples" / "torqa"
    paths = sorted(root.glob("*.tq")) + sorted((root / "templates").glob("*.tq"))
    for path in paths:
        bundle = parse_tq_source(path.read_text(encoding="utf-8"), tq_path=path)
        g = ir_goal_from_json(bundle)
        rep = build_full_diagnostic_report(g)
        assert rep["ok"] is True, f"{path.relative_to(REPO)}: {rep}"


def test_parse_auth_login_tq_passes_diagnostics():
    path = REPO / "examples" / "torqa" / "auth_login.tq"
    raw = path.read_text(encoding="utf-8")
    bundle = parse_tq_source(raw, tq_path=path)
    assert bundle["ir_goal"]["goal"] == "UserLogin"
    assert bundle["ir_goal"]["result"] == "Login Successful"
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
result OK
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


def test_parse_tq_duplicate_intent_rejected():
    src = """
intent a
intent b
requires username, password
result OK
flow:
"""
    with pytest.raises(TQParseError) as ei:
        parse_tq_source(src)
    assert ei.value.code == "PX_TQ_HEADER_ORDER"
    assert "line" in str(ei.value).lower()


def test_parse_tq_requires_duplicate_name_rejected():
    src = """
intent x
requires username, username, password
result OK
flow:
"""
    with pytest.raises(TQParseError) as ei:
        parse_tq_source(src)
    assert ei.value.code == "PX_TQ_REQUIRES_DUPLICATE_NAME"


def test_parse_tq_result_keyword_alone_is_ok():
    src = """
intent x
requires username, password
result
flow:
"""
    bundle = parse_tq_source(src)
    assert bundle["ir_goal"]["result"] == "OK"


def test_parse_tq_emit_login_success_spaced_form_rejected():
    src = """
intent x
requires username, password, ip_address
result OK
flow:
  emit login success
"""
    with pytest.raises(TQParseError) as ei:
        parse_tq_source(src)
    assert ei.value.code == "PX_TQ_UNKNOWN_FLOW_STEP"


def test_parse_tq_requires_before_intent_rejected():
    src = """
requires username, password
intent x
result OK
flow:
"""
    with pytest.raises(TQParseError) as ei:
        parse_tq_source(src)
    assert ei.value.code == "PX_TQ_HEADER_ORDER"


def test_parse_tq_emit_login_success_if_same_as_when_optional_audit():
    when_src = """
intent x
requires username, password
result OK
flow:
  create session
  emit login_success when ip_address
"""
    if_src = """
intent x
requires username, password
result OK
flow:
  create session
  emit login_success if ip_address
"""
    b_when = parse_tq_source(when_src)
    b_if = parse_tq_source(if_src)
    assert json.dumps(b_when["ir_goal"], sort_keys=True) == json.dumps(b_if["ir_goal"], sort_keys=True)


def test_parse_tq_include_chained_expands_ordered_source_map():
    path = REPO / "examples" / "torqa" / "example_include_chained.tq"
    bundle = parse_tq_source(path.read_text(encoding="utf-8"), tq_path=path)
    assert bundle["ir_goal"]["metadata"]["source_map"]["tq_includes"] == [
        "modules/login_inputs.tq",
        "modules/ensure_session_created.tq",
    ]
    g = ir_goal_from_json(bundle)
    rep = build_full_diagnostic_report(g)
    assert rep["ok"] is True, rep


def test_parse_tq_include_expands_and_sets_source_map():
    path = REPO / "examples" / "torqa" / "example_include_user_login.tq"
    raw = path.read_text(encoding="utf-8")
    bundle = parse_tq_source(raw, tq_path=path)
    assert bundle["ir_goal"]["goal"] == "UserLogin"
    assert bundle["ir_goal"]["result"] == "Included fragment OK"
    sm = bundle["ir_goal"]["metadata"]["source_map"]
    assert sm.get("tq_includes") == ["modules/login_inputs.tq"]
    g = ir_goal_from_json(bundle)
    rep = build_full_diagnostic_report(g)
    assert rep["ok"] is True, rep


def test_parse_tq_include_needs_path():
    src = """
intent x
include "modules/x.tq"
requires username, password
result OK
flow:
"""
    with pytest.raises(TQParseError) as ei:
        parse_tq_source(src)
    assert ei.value.code == "PX_TQ_INCLUDE_NEEDS_PATH"


def test_parse_tq_include_nested_forbidden(tmp_path):
    frag = tmp_path / "a.tq"
    frag.write_text('include "b.tq"\n', encoding="utf-8")
    main = tmp_path / "main.tq"
    main.write_text(
        'intent x\ninclude "a.tq"\nrequires username, password\nresult OK\nflow:\n',
        encoding="utf-8",
    )
    with pytest.raises(TQParseError) as ei:
        parse_tq_source(main.read_text(encoding="utf-8"), tq_path=main)
    assert ei.value.code == "PX_TQ_INCLUDE_NESTED_FORBIDDEN"
