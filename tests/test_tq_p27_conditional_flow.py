"""P27: guarded emit and flow comments — strict surface rules, IR parity."""

from __future__ import annotations

import pytest

from src.diagnostics.report import build_full_diagnostic_report
from src.ir.canonical_ir import ir_goal_from_json
from src.surface.parse_tq import TQParseError, parse_tq_source

BASE = """intent login_optional_audit
requires username, password
result OK
flow:
"""


def test_emit_when_ip_skipped_without_ip_in_requires() -> None:
    src = (
        BASE
        + """  create session
  # note: audit is optional
  emit login_success when ip_address
"""
    )
    bundle = parse_tq_source(src)
    ts = [t["effect_name"] for t in bundle["ir_goal"]["transitions"]]
    assert ts == ["start_session"]
    g = ir_goal_from_json(bundle)
    assert build_full_diagnostic_report(g)["ok"] is True


def test_emit_when_ip_includes_log_when_ip_bound() -> None:
    src = """intent full_audit
requires username, password, ip_address
result OK
flow:
  create session
  emit login_success when ip_address
"""
    bundle = parse_tq_source(src)
    ts = [t["effect_name"] for t in bundle["ir_goal"]["transitions"]]
    assert ts == ["start_session", "log_successful_login"]
    g = ir_goal_from_json(bundle)
    assert build_full_diagnostic_report(g)["ok"] is True


def test_unconditional_emit_still_requires_ip() -> None:
    src = """intent x
requires username, password
result OK
flow:
  emit login_success
"""
    with pytest.raises(TQParseError) as ei:
        parse_tq_source(src)
    assert ei.value.code == "PX_TQ_MISSING_IP"


def test_when_unknown_ident_rejected() -> None:
    src = """intent x
requires username, password
result OK
flow:
  emit login_success when typo_field
"""
    with pytest.raises(TQParseError) as ei:
        parse_tq_source(src)
    assert ei.value.code == "PX_TQ_WHEN_UNKNOWN_IDENT"


def test_when_empty_rejected() -> None:
    src = """intent x
requires username, password, ip_address
result OK
flow:
  emit login_success when
"""
    with pytest.raises(TQParseError) as ei:
        parse_tq_source(src)
    assert ei.value.code == "PX_TQ_WHEN_EMPTY"


def test_when_malformed_multi_token_rejected() -> None:
    src = """intent x
requires username, password, ip_address
result OK
flow:
  emit login_success when ip_address extra
"""
    with pytest.raises(TQParseError) as ei:
        parse_tq_source(src)
    assert ei.value.code == "PX_TQ_WHEN_MALFORMED"


def test_create_session_when_rejected() -> None:
    src = """intent x
requires username, password, ip_address
result OK
flow:
  create session when ip_address
"""
    with pytest.raises(TQParseError) as ei:
        parse_tq_source(src)
    assert ei.value.code == "PX_TQ_WHEN_UNSUPPORTED_STEP"


def test_when_jammed_without_space_rejected() -> None:
    src = """intent x
requires username, password, ip_address
result OK
flow:
  emit login_success whenip_address
"""
    with pytest.raises(TQParseError) as ei:
        parse_tq_source(src)
    assert ei.value.code == "PX_TQ_WHEN_MALFORMED"


def test_whenever_rejected() -> None:
    src = """intent x
requires username, password, ip_address
result OK
flow:
  emit login_success whenever
"""
    with pytest.raises(TQParseError) as ei:
        parse_tq_source(src)
    assert ei.value.code == "PX_TQ_WHEN_MALFORMED"


def test_emit_trailing_garbage_rejected() -> None:
    src = """intent x
requires username, password, ip_address
result OK
flow:
  emit login_success oops
"""
    with pytest.raises(TQParseError) as ei:
        parse_tq_source(src)
    assert ei.value.code == "PX_TQ_WHEN_UNSUPPORTED_STEP"


def test_duplicate_emit_lines_rejected() -> None:
    src = """intent x
requires username, password, ip_address
result OK
flow:
  emit login_success when ip_address
  emit login_success when ip_address
"""
    with pytest.raises(TQParseError) as ei:
        parse_tq_source(src)
    assert ei.value.code == "PX_TQ_FLOW_DUPLICATE_STEP"


def test_optional_audit_template_parses() -> None:
    from pathlib import Path

    p = Path(__file__).resolve().parents[1] / "examples" / "torqa" / "templates" / "optional_audit_login.tq"
    bundle = parse_tq_source(p.read_text(encoding="utf-8"), tq_path=p)
    assert [t["effect_name"] for t in bundle["ir_goal"]["transitions"]] == ["start_session"]
    assert build_full_diagnostic_report(ir_goal_from_json(bundle))["ok"] is True
