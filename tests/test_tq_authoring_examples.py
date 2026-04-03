"""P22: .tq templates and parse-stage guidance (surface only; IR remains authoritative)."""

from __future__ import annotations

from pathlib import Path

import pytest

from src.diagnostics.report import build_full_diagnostic_report
from src.ir.canonical_ir import ir_goal_from_json
from src.project_materialize import parse_stage
from src.surface.parse_tq import TQParseError, parse_tq_source

REPO = Path(__file__).resolve().parents[1]
TEMPLATES = REPO / "examples" / "torqa" / "templates"
WORKSPACE_MINIMAL = REPO / "examples" / "workspace_minimal" / "app.tq"


def _template_paths():
    return sorted(TEMPLATES.glob("*.tq"))


@pytest.mark.parametrize("path", _template_paths(), ids=lambda p: p.name)
def test_each_template_parses(path: Path):
    bundle = parse_tq_source(path.read_text(encoding="utf-8"), tq_path=path)
    assert "ir_goal" in bundle
    assert bundle["ir_goal"].get("goal")


@pytest.mark.parametrize("path", _template_paths(), ids=lambda p: p.name)
def test_each_template_passes_full_diagnostics(path: Path):
    bundle = parse_tq_source(path.read_text(encoding="utf-8"), tq_path=path)
    g = ir_goal_from_json(bundle)
    rep = build_full_diagnostic_report(g)
    assert rep["ok"] is True, f"{path.name}: {rep}"


def test_workspace_minimal_app_tq_parse_stage_ok():
    bundle, err, info = parse_stage(WORKSPACE_MINIMAL)
    assert err is None
    assert bundle is not None
    assert info.get("stage_ok") is True
    g = ir_goal_from_json(bundle)
    assert build_full_diagnostic_report(g)["ok"] is True


def test_parse_stage_surfaces_tq_error_code(tmp_path):
    bad = tmp_path / "bad.tq"
    bad.write_text(
        "intent x\nrequires\nresult OK\nflow:\n",
        encoding="utf-8",
    )
    bundle, err, info = parse_stage(bad)
    assert bundle is None and err is not None
    assert isinstance(err, TQParseError)
    assert err.code == "PX_TQ_REQUIRES_EMPTY"
    assert info.get("stage_ok") is False
    assert "tq_parse:" in (info.get("stage_summary") or "")


@pytest.mark.parametrize(
    "src,expected_code",
    [
        (
            "intent a\nrequires username password\nresult OK\nflow:\n",
            "PX_TQ_REQUIRES_MALFORMED",
        ),
        (
            "intent a\nrequires username,, password\nresult OK\nflow:\n",
            "PX_TQ_REQUIRES_MALFORMED",
        ),
        (
            "intent a\nrequires username, password\nresult OK\nflow\n",
            "PX_TQ_FLOW_COLON",
        ),
        (
            "intent a\nrequires username, password\nresult OK\nflow:\n  create session\n  create session\n",
            "PX_TQ_FLOW_DUPLICATE_STEP",
        ),
    ],
)
def test_malformed_tq_stable_codes(src, expected_code, tmp_path):
    p = tmp_path / "x.tq"
    p.write_text(src, encoding="utf-8")
    bundle, err, info = parse_stage(p)
    assert bundle is None
    assert isinstance(err, TQParseError)
    assert err.code == expected_code
    assert info.get("stage_ok") is False
