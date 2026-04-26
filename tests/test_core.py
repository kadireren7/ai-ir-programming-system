"""Smoke tests for the stripped Torqa core (surface → IR → semantics)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from torqa.ir.canonical_ir import CANONICAL_IR_VERSION, ir_goal_from_json, validate_ir
from torqa.ir.migrate import migrate_ir_bundle
from torqa.semantics.ir_semantics import build_ir_semantic_report, default_ir_function_registry
from torqa.surface.parse_tq import TQParseError, parse_tq_source

REPO = Path(__file__).resolve().parents[1]

MINIMAL_TQ = """
intent example_flow
requires username, password, ip_address
result Done
flow:
  create session
  emit login_success
"""


def test_parse_tq_minimal_round_trip():
    bundle = parse_tq_source(MINIMAL_TQ)
    ig = bundle["ir_goal"]
    assert ig["metadata"]["ir_version"] == CANONICAL_IR_VERSION
    goal = ir_goal_from_json(bundle)
    assert validate_ir(goal) == []
    sem = build_ir_semantic_report(goal, default_ir_function_registry())
    assert sem.get("semantic_ok") is True


def test_parse_tq_missing_ip_is_rejected():
    bad = """
intent x
requires username, password
result OK
flow:
  create session
  emit login_success
"""
    with pytest.raises(TQParseError) as ei:
        parse_tq_source(bad)
    assert ei.value.code == "PX_TQ_MISSING_IP"


def test_bundle_validates_against_json_schema():
    jsonschema = pytest.importorskip("jsonschema")
    bundle = parse_tq_source(MINIMAL_TQ)
    schema = json.loads((REPO / "spec" / "IR_BUNDLE.schema.json").read_text(encoding="utf-8"))
    jsonschema.Draft202012Validator(schema).validate(bundle)


def test_migrate_ir_bundle_identity():
    bundle = parse_tq_source(MINIMAL_TQ)
    out, warnings = migrate_ir_bundle(bundle, CANONICAL_IR_VERSION, CANONICAL_IR_VERSION)
    assert out == bundle
    assert warnings == []
