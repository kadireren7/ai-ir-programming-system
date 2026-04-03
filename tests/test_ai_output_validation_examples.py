"""examples/ai_output_validation — AI-shaped fixtures must accept/reject at expected stages."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from src.diagnostics.report import build_full_diagnostic_report
from src.ir.canonical_ir import ir_goal_from_json
from src.project_materialize import materialize_project, validate_stage
from src.surface.parse_tq import TQParseError, parse_tq_source

REPO = Path(__file__).resolve().parents[1]
ROOT = REPO / "examples" / "ai_output_validation"


def test_accepted_model_suggested_login_materializes(tmp_path: Path) -> None:
    path = ROOT / "accepted" / "model_suggested_login.tq"
    bundle = parse_tq_source(path.read_text(encoding="utf-8"), tq_path=path)
    g = ir_goal_from_json(bundle)
    rep = build_full_diagnostic_report(g)
    assert rep["ok"] is True, rep
    ok, summary, _written = materialize_project(bundle, tmp_path, engine_mode="python_only")
    assert ok is True, summary


@pytest.mark.parametrize(
    "rel",
    [
        "rejected/tq_omit_password.tq",
        "rejected/tq_missing_result_before_flow.tq",
    ],
)
def test_rejected_tq_parse_errors(rel: str) -> None:
    path = ROOT / rel
    with pytest.raises(TQParseError):
        parse_tq_source(path.read_text(encoding="utf-8"), tq_path=path)


def test_rejected_json_envelope_validate_fails(tmp_path: Path) -> None:
    path = ROOT / "rejected" / "json_extra_top_level_key.json"
    bundle = json.loads(path.read_text(encoding="utf-8"))
    vr = validate_stage(bundle)
    assert vr.ok is False
    ok, _summary, written = materialize_project(bundle, tmp_path, engine_mode="python_only")
    assert ok is False
    assert written == []


def test_evaluate_ai_proposal_rejects_bad_json() -> None:
    from src.evolution.ai_proposal_gate import evaluate_ai_proposal

    path = ROOT / "rejected" / "json_extra_top_level_key.json"
    bundle = json.loads(path.read_text(encoding="utf-8"))
    out = evaluate_ai_proposal(bundle)
    assert out["rejected"] is True
    assert out["reasons"]
