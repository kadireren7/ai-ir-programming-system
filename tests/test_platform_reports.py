import json
from pathlib import Path

from src.control.patch_preview import build_patch_preview_report
from src.diagnostics.system_health import build_system_health_report
from src.ir.canonical_ir import ir_goal_from_json

REPO = Path(__file__).resolve().parents[1]


def test_patch_preview_add_input():
    raw = json.loads((REPO / "examples" / "core" / "valid_minimal_flow.json").read_text(encoding="utf-8"))
    g = ir_goal_from_json(raw)
    mutations = [
        {
            "mutation_type": "add_input",
            "target": None,
            "payload": {"name": "email", "type_name": "text"},
        }
    ]
    rep = build_patch_preview_report(g, mutations)
    assert rep["ok"] is True
    assert rep["diff"]["added"]["inputs"]
    assert "patch_risk" in rep


def test_system_health_shape():
    raw = json.loads((REPO / "examples" / "core" / "valid_minimal_flow.json").read_text(encoding="utf-8"))
    g = ir_goal_from_json(raw)
    rep = build_system_health_report(g, demo_inputs={"username": "a"}, include_parity=False)
    assert "checkpoints" in rep
    assert "generation_quality" in rep
    assert "projection_strategy" in rep
    assert "rust_core" in rep and "structural_validation" in rep["rust_core"]
