"""P19: parse → validate → project boundaries and optional JSON pipeline fields."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]


def test_parse_stage_valid_tq_returns_bundle():
    from src.project_materialize import parse_stage

    tq = REPO / "examples" / "workspace_minimal" / "app.tq"
    bundle, err, info = parse_stage(tq)
    assert err is None and bundle is not None
    assert info["stage"] == "parse" and info["stage_ok"] is True
    assert "ir_goal" in bundle


def test_parse_stage_invalid_tq_no_bundle():
    from src.project_materialize import parse_stage

    bad = REPO / "tests" / "data" / "tmp_invalid_pipeline.tq"
    bad.parent.mkdir(parents=True, exist_ok=True)
    bad.write_text(
        "module x\nintent x\nrequires u,p,i\nresult OK\nflow:\n  not_a_real_step\n",
        encoding="utf-8",
    )
    try:
        bundle, err, info = parse_stage(bad)
        assert bundle is None and err is not None
        assert info["stage"] == "parse" and info["stage_ok"] is False
    finally:
        bad.unlink(missing_ok=True)


def test_validate_stage_fails_duplicate_ids_no_goal():
    from src.project_materialize import validate_stage

    path = REPO / "examples" / "core" / "invalid_duplicate_condition_id.json"
    bundle = json.loads(path.read_text(encoding="utf-8"))
    vr = validate_stage(bundle)
    assert vr.ok is False
    assert vr.goal is None
    assert vr.failure_payload is not None
    assert vr.stage_info["stage"] == "validate"
    assert vr.stage_info["stage_ok"] is False


def test_materialize_skips_orchestrator_when_validate_fails(monkeypatch, tmp_path):
    from src import project_materialize as pm

    calls: list[int] = []

    class _Track:
        def __init__(self, *a, **k):
            calls.append(1)

        def run_v4(self):
            return {"artifacts": [], "consistency_errors": []}

        def run(self):
            return self.run_v4()

    monkeypatch.setattr(pm, "SystemOrchestrator", _Track)
    path = REPO / "examples" / "core" / "invalid_duplicate_condition_id.json"
    bundle = json.loads(path.read_text(encoding="utf-8"))
    ok, summary, written = pm.materialize_project(bundle, tmp_path, engine_mode="python_only")
    assert ok is False
    assert calls == []
    assert written == []
    assert summary.get("diagnostics", {}).get("ok") is False


def test_materialize_full_tq_pipeline_writes(tmp_path):
    from src.project_materialize import materialize_project, parse_stage

    tq = REPO / "examples" / "workspace_minimal" / "app.tq"
    bundle, err, _ = parse_stage(tq)
    assert err is None
    ok, summary, written = materialize_project(bundle, tmp_path, engine_mode="python_only")
    assert summary["diagnostics"]["ok"] is True
    assert written
    assert ok is True


def test_project_stage_rejects_none_goal(tmp_path):
    from src.project_materialize import project_stage

    with pytest.raises(RuntimeError, match="P19"):
        project_stage(
            None,
            tmp_path,
            engine_mode="python_only",
            diagnostics_rep={"ok": True, "issues": [], "warnings": []},
        )


def test_json_build_includes_pipeline_stages(tmp_path):
    import subprocess
    import sys

    tq = REPO / "examples" / "workspace_minimal" / "app.tq"
    r = subprocess.run(
        [sys.executable, "-m", "src.cli.main", "--json", "build", str(tq), "--root", str(tmp_path), "--out", "out"],
        cwd=str(REPO),
        capture_output=True,
        text=True,
    )
    assert r.returncode == 0, r.stderr
    data = json.loads(r.stdout)
    assert "pipeline_stage" in data
    assert "pipeline_stages" in data
    assert data["pipeline_stage"]["stage"] == "project"
    assert len(data["pipeline_stages"]) == 3
    stages = [s["stage"] for s in data["pipeline_stages"]]
    assert stages == ["parse", "validate", "project"]
    assert "projection_surfaces" in data
    assert isinstance(data["projection_surfaces"], list)
