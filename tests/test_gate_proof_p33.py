"""P33: hard validation gate — manifest proof, stage boundaries, JSON visibility."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
GATE_MANIFEST = REPO / "examples" / "benchmark_flagship" / "gate_invalid" / "manifest.json"


def test_gate_proof_manifest_matches_expectations():
    from src.benchmarks.gate_proof import run_gate_proof_manifest

    report = run_gate_proof_manifest(GATE_MANIFEST)
    assert report["summary"]["mismatch_with_expectation"] == 0
    assert report["summary"]["total"] >= 8
    for row in report["cases"]:
        assert "reject_stage" in row
        assert "outcome_accepted" in row


def test_parse_failure_never_calls_validate_stage(monkeypatch, tmp_path):
    from src.benchmarks import gate_proof as gp

    called: list[int] = []

    def _boom(*a, **k):
        called.append(1)
        raise AssertionError("validate_stage must not run after failed parse")

    monkeypatch.setattr("src.project_materialize.validate_stage", _boom)
    bad = tmp_path / "bad.tq"
    bad.write_text(
        "intent broken_missing_result\nrequires username\nflow:\n",
        encoding="utf-8",
    )
    r = gp.run_gate_proof_for_path(bad)
    assert r.parse_stage_ok is False
    assert r.reject_stage == "parse"
    assert called == []


def test_validate_failure_never_writes_project_artifacts(tmp_path):
    from src.project_materialize import materialize_project

    path = REPO / "examples" / "benchmark_flagship" / "gate_invalid" / "bundle_envelope_unknown_key.json"
    bundle = json.loads(path.read_text(encoding="utf-8"))
    ok, summary, written = materialize_project(bundle, tmp_path, engine_mode="python_only")
    assert ok is False
    assert written == []


def test_invalid_bundle_not_accepted_as_clean_input(tmp_path):
    from src.benchmarks.gate_proof import run_gate_proof_for_path

    p = REPO / "examples" / "benchmark_flagship" / "gate_invalid" / "bundle_semantic_unknown_effect.json"
    r = run_gate_proof_for_path(p)
    assert r.outcome_accepted is False
    assert r.reject_stage == "validate"
    assert r.project_stage_ok is None


def test_json_project_parse_failure_shows_pipeline_stages(tmp_path):
    tq = REPO / "examples" / "benchmark_flagship" / "gate_invalid" / "malformed_missing_result.tq"
    r = subprocess.run(
        [
            sys.executable,
            "-m",
            "src.cli.main",
            "--json",
            "project",
            "--root",
            str(tmp_path),
            "--out",
            "out",
            "--source",
            str(tq),
        ],
        cwd=str(REPO),
        capture_output=True,
        text=True,
    )
    assert r.returncode == 1
    data = json.loads(r.stderr)
    assert data.get("ok") is False
    stages = data.get("pipeline_stages") or []
    assert stages
    assert stages[0].get("stage") == "parse"
    assert stages[0].get("stage_ok") is False


def test_gate_proof_cli_exits_zero_on_manifest():
    r = subprocess.run(
        [
            sys.executable,
            "-m",
            "src.benchmarks.gate_proof_cli",
            "--manifest",
            str(GATE_MANIFEST),
        ],
        cwd=str(REPO),
        capture_output=True,
        text=True,
    )
    assert r.returncode == 0, r.stderr + r.stdout
    rep = json.loads(r.stdout)
    assert rep["summary"]["mismatch_with_expectation"] == 0
