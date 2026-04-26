"""Unit tests for modular advanced analysis rules."""

from __future__ import annotations

import copy


from torqa.analysis.engine import run_advanced_analysis
from torqa.analysis.rules.impossible_conditions import rule_impossible_conditions
from torqa.analysis.types import RuleFinding
from torqa.ir.canonical_ir import ir_goal_from_json
from torqa.semantics.ir_semantics import default_ir_function_registry
from torqa.surface.parse_tq import parse_tq_source


def _id(name: str) -> dict:
    return {"type": "identifier", "name": name}


def test_rule_finding_contract():
    f = RuleFinding(
        code="TORQA_X_000",
        severity="warning",
        explanation="e",
        fix_suggestion="fix",
        detail="d",
    )
    assert f.to_dict()["code"] == "TORQA_X_000"
    assert "Fix:" in f.legacy_message()


def test_impossible_require_forbid_same_shape():
    b = copy.deepcopy(parse_tq_source(
        """intent x
requires username, password, ip_address
meta:
  owner t
  severity low
result Done
flow:
  create session
  emit login_success
"""
    ))
    ig = b["ir_goal"]
    same = {
        "type": "binary",
        "operator": "==",
        "left": _id("username"),
        "right": {"type": "string_literal", "value": "admin"},
    }
    ig["preconditions"] = [
        {"condition_id": "c_req_0001", "kind": "require", "expr": same},
    ]
    ig["forbids"] = [
        {"condition_id": "c_forbid_0001", "kind": "forbid", "expr": copy.deepcopy(same)},
    ]
    goal = ir_goal_from_json(b)
    ctx_goal = goal
    from torqa.analysis.context import AnalysisContext

    ctx = AnalysisContext(ir_goal=ctx_goal, function_registry=default_ir_function_registry())
    fs = rule_impossible_conditions(ctx)
    assert any(x.code == "TORQA_IMPOSS_001" for x in fs)


def test_run_advanced_includes_duplicate_finding():
    b = copy.deepcopy(parse_tq_source(
        """intent x
requires username, password, ip_address
meta:
  owner t
  severity low
result Done
flow:
  create session
  emit login_success
"""
    ))
    sm = b["ir_goal"].setdefault("metadata", {})
    sm.setdefault("source_map", {})["tq_includes"] = ["a.tq", "b.tq", "a.tq"]
    goal = ir_goal_from_json(b)
    fs = run_advanced_analysis(goal, default_ir_function_registry())
    assert any(f.code == "TORQA_CYCLE_002" for f in fs)


def test_build_ir_semantic_report_contains_advanced_keys():
    b = parse_tq_source(
        """intent x
requires username, password, ip_address
meta:
  owner t
  severity low
result Done
flow:
  create session
  emit login_success
"""
    )
    goal = ir_goal_from_json(b)
    from torqa.semantics.ir_semantics import build_ir_semantic_report

    rep = build_ir_semantic_report(goal, default_ir_function_registry())
    assert "advanced_findings" in rep
    assert "advanced_ok" in rep
    assert isinstance(rep["advanced_findings"], list)
