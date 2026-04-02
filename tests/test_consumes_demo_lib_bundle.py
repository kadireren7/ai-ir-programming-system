"""F5.1: bundle with library_refs validates through full diagnostics."""

import json
from pathlib import Path

from src.diagnostics.report import build_full_diagnostic_report
from src.ir.canonical_ir import ir_goal_from_json, validate_bundle_envelope

REPO = Path(__file__).resolve().parents[1]


def test_consumes_torqa_demo_lib_ok():
    path = REPO / "examples" / "core" / "consumes_torqa_demo_lib.json"
    bundle = json.loads(path.read_text(encoding="utf-8"))
    env_e = validate_bundle_envelope(bundle)
    assert not env_e
    g = ir_goal_from_json(bundle)
    rep = build_full_diagnostic_report(g, bundle_envelope_errors=env_e)
    assert rep["ok"] is True
    assert bundle.get("library_refs")
    assert bundle["library_refs"][0]["name"] == "torqa-demo-lib"
