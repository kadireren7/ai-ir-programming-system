"""P23: diagnostic summaries, quality report shape, explain structure."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from src.diagnostics.report import build_full_diagnostic_report
from src.diagnostics.summary import summarize_diagnostic_report, summarize_pipeline_stages
from src.ir.canonical_ir import ir_goal_from_json
from src.ir.explain import explain_ir_goal
from src.ir.quality import build_ir_quality_report
from src.project_materialize import parse_stage, validate_stage

REPO = Path(__file__).resolve().parents[1]

_SUMMARY_KEYS = frozenset(
    {
        "validation_ok",
        "blocking_issue_count",
        "warning_row_count",
        "semantic",
        "formal_phase_counts",
        "blocking_code_counts",
    }
)
_SEM_SUBKEYS = frozenset({"error_count", "warning_count", "semantic_ok"})

_QUALITY_SUMMARY_KEYS = frozenset(
    {
        "quality_schema_version",
        "semantic_errors",
        "semantic_warnings",
        "determinism_issues",
        "semantic_ok",
        "overall_clean",
    })


def test_full_diagnostic_report_includes_stable_summary():
    path = REPO / "examples" / "core" / "valid_login_flow.json"
    raw = json.loads(path.read_text(encoding="utf-8"))
    g = ir_goal_from_json(raw)
    rep = build_full_diagnostic_report(g)
    assert "summary" in rep
    assert _SUMMARY_KEYS == set(rep["summary"].keys())
    assert _SEM_SUBKEYS == set(rep["summary"]["semantic"].keys())
    assert rep["summary"]["validation_ok"] is True
    assert rep["summary"]["blocking_issue_count"] == 0
    assert isinstance(rep["summary"]["formal_phase_counts"], dict)


def test_invalid_bundle_summary_meaningful_counts():
    path = REPO / "examples" / "core" / "invalid_duplicate_condition_id.json"
    raw = json.loads(path.read_text(encoding="utf-8"))
    g = ir_goal_from_json(raw)
    rep = build_full_diagnostic_report(g)
    s = rep["summary"]
    assert s["validation_ok"] is False
    assert s["blocking_issue_count"] >= 1
    assert s["semantic"]["error_count"] >= 0
    assert sum(s["formal_phase_counts"].values()) >= s["blocking_issue_count"]


def test_summarize_diagnostic_report_idempotent_shape():
    path = REPO / "examples" / "core" / "valid_minimal_flow.json"
    raw = json.loads(path.read_text(encoding="utf-8"))
    g = ir_goal_from_json(raw)
    rep = build_full_diagnostic_report(g)
    again = summarize_diagnostic_report(rep)
    assert again == rep["summary"]


def test_quality_report_stable_actionable_shape():
    path = REPO / "examples" / "core" / "valid_login_flow.json"
    raw = json.loads(path.read_text(encoding="utf-8"))
    g = ir_goal_from_json(raw)
    q = build_ir_quality_report(g)
    assert "summary" in q and "weaknesses" in q and "next_actions" in q
    assert _QUALITY_SUMMARY_KEYS == set(q["summary"].keys())
    assert isinstance(q["weaknesses"], list)
    assert isinstance(q["next_actions"], list)
    assert len(q["next_actions"]) >= 1


def test_explain_includes_core_structural_elements():
    path = REPO / "examples" / "core" / "valid_login_flow.json"
    raw = json.loads(path.read_text(encoding="utf-8"))
    g = ir_goal_from_json(raw)
    ex = explain_ir_goal(g)
    assert ex.get("explain_schema_version") == "1"
    assert "inventory" in ex and "weak_spots" in ex and "fix_next" in ex
    inv = ex["inventory"]
    assert {"goal", "result", "has_nonempty_result", "input_count", "transition_count"} <= set(inv.keys())
    assert "conditions" in ex and isinstance(ex["conditions"], list)
    assert "transitions" in ex and isinstance(ex["transitions"], list)


def test_validate_stage_attaches_summary_on_failure():
    path = REPO / "examples" / "core" / "invalid_duplicate_condition_id.json"
    bundle, err, _ = parse_stage(path)
    assert err is None and bundle is not None
    vr = validate_stage(bundle)
    assert vr.ok is False and vr.diagnostics is not None
    assert "summary" in vr.diagnostics
    assert vr.diagnostics["summary"]["validation_ok"] is False


def test_pipeline_summary_json_build(tmp_path):
    tq = REPO / "examples" / "workspace_minimal" / "app.tq"
    r = subprocess.run(
        [
            sys.executable,
            "-m",
            "src.cli.main",
            "--json",
            "build",
            str(tq),
            "--root",
            str(tmp_path),
            "--out",
            "genout",
        ],
        cwd=str(REPO),
        capture_output=True,
        text=True,
    )
    assert r.returncode == 0, r.stderr
    data = json.loads(r.stdout)
    assert "pipeline_summary" in data
    ps = data["pipeline_summary"]
    assert ps.get("parse_ok") is True
    assert ps.get("validate_ok") is True
    assert ps.get("project_ok") is True
    assert "validation" in ps
    val = ps["validation"]
    assert val.get("validation_ok") is True
    assert val.get("blocking_issue_count") == 0


def test_summarize_pipeline_stages_partial():
    stages = [
        {"stage": "parse", "stage_ok": True},
        {"stage": "validate", "stage_ok": False},
    ]
    s = summarize_pipeline_stages(stages, {"validation_ok": False, "blocking_issue_count": 2})
    assert s["parse_ok"] is True and s["validate_ok"] is False and s["project_ok"] is None
    assert s["validation"]["blocking_issue_count"] == 2
