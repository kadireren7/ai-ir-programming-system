import json
from pathlib import Path

from src.diagnostics.codes import PX_IR_CONDITION_ID_COLLISION, classify_message
from src.diagnostics.report import build_full_diagnostic_report
from src.ir.canonical_ir import ir_goal_from_json, validate_ir

REPO = Path(__file__).resolve().parents[1]


def test_classify_duplicate_condition():
    msg = "IR validation: all condition_id values must be globally unique."
    assert classify_message(msg) == PX_IR_CONDITION_ID_COLLISION


def test_full_report_flags_duplicate_example():
    raw = json.loads((REPO / "examples" / "core" / "invalid_duplicate_condition_id.json").read_text(encoding="utf-8"))
    g = ir_goal_from_json(raw)
    assert validate_ir(g)
    rep = build_full_diagnostic_report(g)
    assert rep["ok"] is False
    codes = {i["code"] for i in rep["issues"]}
    assert PX_IR_CONDITION_ID_COLLISION in codes
    collision = next(i for i in rep["issues"] if i["code"] == PX_IR_CONDITION_ID_COLLISION)
    assert collision.get("formal_phase") == "wellformed"
    assert "hint" in collision and "FORMAL_CORE" in collision.get("doc", "")
