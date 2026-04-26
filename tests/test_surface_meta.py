"""Tests for optional ``meta:`` authoring block -> ``metadata.surface_meta``."""

from __future__ import annotations

import pytest

from torqa.ir.canonical_ir import ir_goal_from_json, validate_ir
from torqa.surface.parse_tq import TQParseError, parse_tq_source

WITH_META = """
intent example_flow
requires username, password, ip_address
meta:
  owner security_team
  severity high
result Done
flow:
  create session
  emit login_success
"""


def test_meta_block_populates_surface_meta():
    bundle = parse_tq_source(WITH_META)
    md = bundle["ir_goal"]["metadata"]
    assert md["surface_meta"] == {"owner": "security_team", "severity": "high"}
    goal = ir_goal_from_json(bundle)
    assert validate_ir(goal) == []


def test_meta_duplicate_key_rejected():
    bad = """
intent x
requires u, password, ip_address
meta:
  owner a
  owner b
result OK
flow:
  create session
"""
    with pytest.raises(TQParseError) as ei:
        parse_tq_source(bad)
    assert ei.value.code == "PX_TQ_META_DUPLICATE_KEY"


def test_meta_invalid_key_rejected():
    bad = """
intent x
requires u, password, ip_address
meta:
  Owner team
result OK
flow:
  create session
"""
    with pytest.raises(TQParseError) as ei:
        parse_tq_source(bad)
    assert ei.value.code == "PX_TQ_META_KEY"


def test_meta_empty_block_rejected():
    bad = """
intent x
requires u, password, ip_address
meta:
result OK
flow:
  create session
"""
    with pytest.raises(TQParseError) as ei:
        parse_tq_source(bad)
    assert ei.value.code == "PX_TQ_META_EMPTY"


def test_meta_after_result_rejected():
    bad = """
intent x
requires u, password, ip_address
result OK
meta:
  owner x
flow:
  create session
"""
    with pytest.raises(TQParseError) as ei:
        parse_tq_source(bad)
    assert ei.value.code == "PX_TQ_HEADER_ORDER"


def test_validate_ir_rejects_bad_surface_meta_type():
    bundle = parse_tq_source(WITH_META)
    bundle["ir_goal"]["metadata"]["surface_meta"] = "oops"
    goal = ir_goal_from_json(bundle)
    errs = validate_ir(goal)
    assert any("surface_meta must be a dict" in e for e in errs)


def test_meta_value_allows_spaces():
    src = """
intent x
requires u, password, ip_address
meta:
  note this is a longer note
result OK
flow:
  create session
  emit login_success
"""
    bundle = parse_tq_source(src)
    assert bundle["ir_goal"]["metadata"]["surface_meta"]["note"] == "this is a longer note"
