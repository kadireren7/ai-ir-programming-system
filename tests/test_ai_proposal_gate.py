import json
from pathlib import Path

from src.evolution.ai_proposal_gate import evaluate_ai_proposal

REPO = Path(__file__).resolve().parents[1]


def test_proposal_gate_accepts_minimal_golden():
    bundle = json.loads((REPO / "examples/core/valid_minimal_flow.json").read_text(encoding="utf-8"))
    out = evaluate_ai_proposal(bundle)
    assert out["rejected"] is False
    assert out["diagnostics"].get("ok") is True


def test_proposal_gate_rejects_invalid_top_level_key():
    bundle = {"ir_goal": {}, "oops": 1}
    out = evaluate_ai_proposal(bundle)
    assert out["rejected"] is True
    assert out["envelope_errors"]
