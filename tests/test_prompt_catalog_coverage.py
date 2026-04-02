"""Coverage tests for prompts P5.1 and P5.2 in docs/TORQA_PROMPT_CATALOG.md."""

from __future__ import annotations

import json
from pathlib import Path

from src.diagnostics.codes import PX_SEM_UNKNOWN_FUNCTION
from src.diagnostics.report import build_full_diagnostic_report
from src.ir.canonical_ir import ir_goal_from_json, validate_ir
from src.semantics.ir_semantics import build_ir_semantic_report, default_ir_function_registry

REPO = Path(__file__).resolve().parents[1]


def test_p5_1_strings_equal_golden_loads_and_semantic_ok():
    raw = json.loads((REPO / "examples" / "core" / "valid_strings_equal_flow.json").read_text(encoding="utf-8"))
    g = ir_goal_from_json(raw)
    assert g.goal == "StringsEqualDemo"
    assert not validate_ir(g)
    rep = build_ir_semantic_report(g, default_ir_function_registry())
    assert rep["semantic_ok"] is True, rep.get("errors")


def test_p5_2_negative_bundle_surfaces_unknown_function_code():
    raw = json.loads((REPO / "tests" / "data" / "negative_px_unknown_function.json").read_text(encoding="utf-8"))
    g = ir_goal_from_json(raw)
    assert not validate_ir(g)
    rep = build_full_diagnostic_report(g)
    assert rep["ok"] is False
    codes = {i["code"] for i in rep["issues"]}
    assert PX_SEM_UNKNOWN_FUNCTION in codes
