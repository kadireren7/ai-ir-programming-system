"""TORQA-authored surface/project failure suffix (examples/torqa_self → user_hints)."""

from __future__ import annotations

import json
from pathlib import Path

from src.diagnostics.user_hints import (
    ONBOARDING_STARTER_LINE,
    ONBOARDING_TRY_BUILD,
    suggested_next_for_surface_or_project_fail,
)
from src.surface.parse_tq import parse_tq_source
from src.torqa_self.surface_fail_hints_ir import load_surface_project_fail_suffix

REPO = Path(__file__).resolve().parents[1]
BUNDLE = REPO / "examples" / "torqa_self" / "cli_surface_project_fail_suffix_bundle.json"
TQ = REPO / "examples" / "torqa_self" / "cli_surface_project_fail_suffix.tq"


def test_surface_project_fail_suggested_next_matches_legacy_merge():
    out = suggested_next_for_surface_or_project_fail()
    assert out == [
        ONBOARDING_TRY_BUILD,
        ONBOARDING_STARTER_LINE,
        "Templates: examples/torqa/templates/ (minimal.tq, login_flow.tq)",
        "torqa surface FILE.tq --out ir_bundle.json",
        "IR reuse (compose + lock): docs/USING_PACKAGES.md",
        "torqa language",
        "Flagship website demo: docs/FIRST_REAL_DEMO.md",
    ]


def test_bundle_inputs_surface_fail_order_stable():
    data = json.loads(BUNDLE.read_text(encoding="utf-8"))
    names = [i["name"] for i in data["ir_goal"]["inputs"]]
    surface_fail = [n for n in names if str(n).startswith("surface_fail_")]
    assert surface_fail == [
        "surface_fail_surface_cmd",
        "surface_fail_packages_doc",
        "surface_fail_language_cmd",
        "surface_fail_first_real_demo",
    ]


def test_parse_tq_matches_committed_bundle_ir_goal():
    raw = TQ.read_text(encoding="utf-8")
    live = parse_tq_source(raw, tq_path=TQ.resolve())
    committed = json.loads(BUNDLE.read_text(encoding="utf-8"))
    assert live["ir_goal"]["goal"] == committed["ir_goal"]["goal"]
    assert live["ir_goal"]["inputs"] == committed["ir_goal"]["inputs"]


def test_fallback_when_bundle_missing(tmp_path):
    out = load_surface_project_fail_suffix(bundle_path=tmp_path / "nonexistent.json")
    assert out == [
        "torqa surface FILE.tq --out ir_bundle.json",
        "IR reuse (compose + lock): docs/USING_PACKAGES.md",
        "torqa language",
        "Flagship website demo: docs/FIRST_REAL_DEMO.md",
    ]
