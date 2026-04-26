"""Committed starter examples under examples/ must stay valid (parse + CLI)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from torqa.cli.main import main

REPO = Path(__file__).resolve().parents[1]
EXAMPLES = REPO / "examples"


@pytest.mark.parametrize(
    "name",
    [
        "approval_flow.tq",
        "ai_generated.json",
        "templates/login_flow.tq",
        "templates/approval_flow.tq",
        "templates/onboarding_flow.tq",
        "templates/ai_generated_safe.json",
        "templates/ai_generated_risky.json",
    ],
)
def test_starter_example_validates_via_cli(name: str):
    path = EXAMPLES / name
    assert path.is_file(), f"missing {path}"
    code = main(["validate", str(path)])
    assert code == 0, f"torqa validate failed for {path}"


def test_ai_generated_is_bundle_with_ir_goal():
    p = EXAMPLES / "ai_generated.json"
    data = json.loads(p.read_text(encoding="utf-8"))
    assert "ir_goal" in data
    assert data["ir_goal"].get("goal") == "AiSuggestedFlow"


def test_template_ai_json_demonstrates_safe_vs_risky_goals():
    safe = json.loads((EXAMPLES / "templates/ai_generated_safe.json").read_text(encoding="utf-8"))
    risky = json.loads((EXAMPLES / "templates/ai_generated_risky.json").read_text(encoding="utf-8"))
    assert safe["ir_goal"]["goal"] == "LoginFlow"
    assert safe["ir_goal"]["metadata"]["surface_meta"]["severity"] == "low"
    assert risky["ir_goal"]["goal"] == "ApprovalFlow"
    assert risky["ir_goal"]["metadata"]["surface_meta"]["severity"] == "high"


def test_template_risky_fails_under_strict_profile():
    p = EXAMPLES / "templates/ai_generated_risky.json"
    code = main(["validate", "--profile", "strict", str(p)])
    assert code == 1
