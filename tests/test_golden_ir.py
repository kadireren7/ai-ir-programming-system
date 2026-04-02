import json
from pathlib import Path

import pytest

from src.ir.canonical_ir import (
    CANONICAL_IR_VERSION,
    ir_goal_from_json,
    ir_goal_to_json,
    normalize_ir_goal,
    validate_ir,
    validate_ir_handoff_compatibility,
    validate_ir_semantic_determinism,
)
from src.orchestrator.system_orchestrator import SystemOrchestrator
from src.projection.projection_strategy import ProjectionContext
from src.semantics.ir_semantics import build_ir_semantic_report, default_ir_function_registry

REPO = Path(__file__).resolve().parents[1]
EXAMPLES = REPO / "examples" / "core"


def _load(name: str) -> dict:
    with open(EXAMPLES / name, encoding="utf-8") as f:
        return json.load(f)


def test_valid_minimal_roundtrip_and_validation():
    raw = _load("valid_minimal_flow.json")
    g = ir_goal_from_json(raw)
    assert g.goal == "MinimalDemoFlow"
    assert not validate_ir(g)
    assert not validate_ir_handoff_compatibility(g)
    assert not validate_ir_semantic_determinism(g)
    reg = default_ir_function_registry()
    rep = build_ir_semantic_report(g, reg)
    assert rep["semantic_ok"] is True
    again = ir_goal_to_json(g)
    assert again["ir_goal"]["goal"] == "MinimalDemoFlow"


def test_valid_login_semantic_ok():
    raw = _load("valid_login_flow.json")
    g = ir_goal_from_json(raw)
    assert not validate_ir(g)
    rep = build_ir_semantic_report(g, default_ir_function_registry())
    assert rep["semantic_ok"] is True, rep["errors"]


def test_demo_multi_surface_semantic_ok():
    raw = _load("demo_multi_surface_flow.json")
    g = ir_goal_from_json(raw)
    assert not validate_ir(g)
    rep = build_ir_semantic_report(g, default_ir_function_registry())
    assert rep["semantic_ok"] is True, rep["errors"]


def test_valid_session_postcondition_semantic_ok():
    raw = _load("valid_session_postcondition_flow.json")
    g = ir_goal_from_json(raw)
    assert not validate_ir(g)
    rep = build_ir_semantic_report(g, default_ir_function_registry())
    assert rep["semantic_ok"] is True, rep["errors"]


def test_valid_start_session_semantic_ok():
    raw = _load("valid_start_session_flow.json")
    g = ir_goal_from_json(raw)
    assert not validate_ir(g)
    assert not validate_ir_handoff_compatibility(g)
    rep = build_ir_semantic_report(g, default_ir_function_registry())
    assert rep["semantic_ok"] is True, rep["errors"]


def test_invalid_empty_goal_fails_ir_validation():
    raw = _load("invalid_empty_goal.json")
    g = ir_goal_from_json(raw)
    errs = validate_ir(g)
    assert any("goal must be a non-empty" in e for e in errs)


def test_normalize_idempotent_fingerprint_stable():
    raw = _load("valid_minimal_flow.json")
    g = ir_goal_from_json(raw)
    n = normalize_ir_goal(g)
    from src.ir.canonical_ir import compute_ir_fingerprint

    assert compute_ir_fingerprint(n) == compute_ir_fingerprint(normalize_ir_goal(n))


def test_orchestrator_produces_artifacts():
    raw = _load("valid_minimal_flow.json")
    g = ir_goal_from_json(raw)
    orch = SystemOrchestrator(g, context=ProjectionContext())
    out = orch.run()
    assert "artifacts" in out
    assert isinstance(out["artifacts"], list)
    assert len(out["artifacts"]) >= 1
    # Website artifact should include generation marker
    ts_files = [
        f
        for art in out["artifacts"]
        for f in art.get("files", [])
        if str(f.get("filename", "")).endswith(".tsx")
    ]
    assert ts_files, "expected at least one TSX file from website projection"


def test_ir_version_constant_matches_spec_docs():
    assert CANONICAL_IR_VERSION == "1.4"
