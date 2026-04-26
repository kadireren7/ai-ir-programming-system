"""Regression tests for .tq parser diagnostics and validate_ir."""

from __future__ import annotations

import copy

import pytest

from torqa.ir.canonical_ir import ir_goal_from_json, validate_ir
from torqa.surface.parse_tq import TQParseError, parse_tq_source

MINIMAL_TQ = """
intent example_flow
requires username, password, ip_address
result Done
flow:
  create session
  emit login_success
"""


def test_parse_missing_flow_after_result():
    src = """
intent x
requires u, password, ip_address
result OK
"""
    with pytest.raises(TQParseError) as ei:
        parse_tq_source(src)
    assert ei.value.code == "PX_TQ_MISSING_FLOW"
    assert ei.value.line == 4


def test_parse_flow_block_requires_at_least_one_step():
    src = """
intent x
requires u, password, ip_address
result OK
flow:
"""
    with pytest.raises(TQParseError) as ei:
        parse_tq_source(src)
    assert ei.value.code == "PX_TQ_FLOW_NO_STEPS"
    assert ei.value.line == 5


def test_parse_header_order_requires_before_intent():
    src = """
requires u, password, ip_address
intent x
result OK
flow:
  create session
"""
    with pytest.raises(TQParseError) as ei:
        parse_tq_source(src)
    assert ei.value.code == "PX_TQ_HEADER_ORDER"
    assert ei.value.line == 2
    assert "Expected next header:" in str(ei.value)
    assert "strict header order (tq_v1)" in str(ei.value)


def test_parse_header_order_result_before_intent():
    """`result` at line 1 must not read as a vague missing-header error."""
    src = """
result Done
intent wrong_order
requires u, password, ip_address
flow:
  create session
"""
    with pytest.raises(TQParseError) as ei:
        parse_tq_source(src)
    assert ei.value.code == "PX_TQ_HEADER_ORDER"
    assert ei.value.line == 2
    assert "Expected next header:" in str(ei.value)
    assert "`intent`" in str(ei.value)


def test_parse_unknown_flow_step_message():
    src = """
intent x
requires u, password, ip_address
result OK
flow:
  notify admin
"""
    with pytest.raises(TQParseError) as ei:
        parse_tq_source(src)
    assert ei.value.code == "PX_TQ_UNKNOWN_FLOW_STEP"
    assert ei.value.line == 6
    assert "unknown flow step" in str(ei.value).lower()
    assert "create session" in str(ei.value)


def test_parse_error_includes_line_on_duplicate_header():
    src = """
intent a
requires u, password, ip_address
result One
result Two
flow:
  create session
"""
    with pytest.raises(TQParseError) as ei:
        parse_tq_source(src)
    assert ei.value.code == "PX_TQ_DUPLICATE_HEADER"
    assert ei.value.line == 5


def test_validate_ir_rejects_empty_inputs():
    bundle = parse_tq_source(MINIMAL_TQ)
    ig = copy.deepcopy(bundle["ir_goal"])
    ig["inputs"] = []
    goal = ir_goal_from_json({"ir_goal": ig})
    errs = validate_ir(goal)
    assert any("inputs must be non-empty" in e for e in errs)


def test_validate_ir_rejects_empty_metadata_strings():
    bundle = parse_tq_source(MINIMAL_TQ)
    ig = copy.deepcopy(bundle["ir_goal"])
    ig["metadata"]["source"] = ""
    goal = ir_goal_from_json({"ir_goal": ig})
    errs = validate_ir(goal)
    assert any("metadata.source" in e and "non-empty string" in e for e in errs)


def test_validate_ir_rejects_non_dict_source_map():
    bundle = parse_tq_source(MINIMAL_TQ)
    ig = copy.deepcopy(bundle["ir_goal"])
    ig["metadata"]["source_map"] = "not-a-dict"
    goal = ir_goal_from_json({"ir_goal": ig})
    errs = validate_ir(goal)
    assert any("source_map must be a dict" in e for e in errs)


def test_validate_ir_rejects_blank_result_when_transitions_present():
    bundle = parse_tq_source(MINIMAL_TQ)
    ig = copy.deepcopy(bundle["ir_goal"])
    ig["result"] = "   "
    goal = ir_goal_from_json({"ir_goal": ig})
    errs = validate_ir(goal)
    assert any("result must be a non-empty string when transitions" in e for e in errs)


def test_validate_ir_rejects_duplicate_transition_signature():
    bundle = parse_tq_source(MINIMAL_TQ)
    ig = copy.deepcopy(bundle["ir_goal"])
    t0 = ig["transitions"][0]
    ig["transitions"].append(
        {
            "transition_id": "t_0003",
            "effect_name": t0["effect_name"],
            "arguments": copy.deepcopy(t0["arguments"]),
            "from_state": t0["from_state"],
            "to_state": t0["to_state"],
        }
    )
    goal = ir_goal_from_json({"ir_goal": ig})
    errs = validate_ir(goal)
    assert any("duplicate transition" in e for e in errs)
