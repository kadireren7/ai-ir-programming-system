"""
P24: targeted Rust vs Python alignment for structural validation digest.

Python ``validate_ir`` is authoritative for the main pipeline; these tests assert the
rust-core bridge agrees on representative bundles and that fallback shape is stable.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from src.bridge.rust_structural_validation import (
    rust_structural_validation_digest,
    rust_structural_validation_digest_from_bundle,
)
from src.ir.canonical_ir import ir_goal_from_json, validate_ir

REPO = Path(__file__).resolve().parents[1]

_VALID_EXAMPLES = [
    "examples/core/valid_minimal_flow.json",
    "examples/core/valid_login_flow.json",
]


def _load_goal(rel: str):
    raw = json.loads((REPO / rel).read_text(encoding="utf-8"))
    return ir_goal_from_json(raw), raw


@pytest.mark.parametrize("rel", _VALID_EXAMPLES)
def test_rust_structural_matches_python_on_valid_examples(rel: str):
    g, _raw = _load_goal(rel)
    py_ok = len(validate_ir(g)) == 0
    assert py_ok is True
    d = rust_structural_validation_digest(g)
    if not d["bridge_ok"]:
        pytest.skip("Rust bridge unavailable (no cargo/rust-core or subprocess failure)")
    assert d["ir_valid"] is True
    assert d["validation_error_count"] == 0
    assert d["fingerprint"] is not None
    assert len(str(d["fingerprint"])) == 64


def test_rust_structural_matches_python_on_duplicate_condition_example():
    g, _ = _load_goal("examples/core/invalid_duplicate_condition_id.json")
    py_ok = len(validate_ir(g)) == 0
    assert py_ok is False
    d = rust_structural_validation_digest(g)
    if not d["bridge_ok"]:
        pytest.skip("Rust bridge unavailable")
    assert d["ir_valid"] is False
    assert d["validation_error_count"] >= 1


def test_rust_structural_matches_python_on_empty_goal_example():
    g, _ = _load_goal("examples/core/invalid_empty_goal.json")
    py_ok = len(validate_ir(g)) == 0
    assert py_ok is False
    d = rust_structural_validation_digest(g)
    if not d["bridge_ok"]:
        pytest.skip("Rust bridge unavailable")
    assert d["ir_valid"] is False


def test_digest_stable_shape_when_bridge_unavailable(monkeypatch):
    g, raw = _load_goal("examples/core/valid_minimal_flow.json")

    def _fail(_env):
        return {"ok": False, "error": "simulated_unavailable", "detail": "test"}

    monkeypatch.setattr("src.bridge.rust_bridge.rust_validate_ir", _fail)
    d = rust_structural_validation_digest_from_bundle(raw)
    assert d["bridge_ok"] is False
    assert d["error"] == "simulated_unavailable"
    assert d["ir_valid"] is None
    assert d["validation_error_count"] is None
    assert d["fingerprint"] is None
    assert len(validate_ir(g)) == 0


def test_system_health_includes_rust_structural_digest():
    from src.diagnostics.system_health import build_system_health_report

    g, _ = _load_goal("examples/core/valid_minimal_flow.json")
    rep = build_system_health_report(g, include_parity=False)
    assert "rust_core" in rep
    rv = rep["rust_core"]["structural_validation"]
    assert "bridge_ok" in rv and "ir_valid" in rv
    assert "validation_error_count" in rv
