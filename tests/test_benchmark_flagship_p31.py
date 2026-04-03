"""P31: canonical benchmark flagship — full pipeline, fixtures, desktop glue, invalid gated."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

from src.workspace_bundle_io import materialize_bundle_to_workspace
from src.project_materialize import materialize_project, parse_stage, validate_stage

REPO = Path(__file__).resolve().parents[1]
FLAGSHIP_DIR = REPO / "examples" / "benchmark_flagship"
FLAGSHIP_TQ = FLAGSHIP_DIR / "app.tq"
FIXTURE_JSON = FLAGSHIP_DIR / "expected_output_summary.json"


def _load_expected_summary() -> dict:
    data = json.loads(FIXTURE_JSON.read_text(encoding="utf-8"))
    assert data.get("benchmark_id") == "p31_login_dashboard_shell_v1"
    assert data.get("schema_version") == 1
    assert isinstance(data.get("required_webapp_paths"), list)
    return data


def test_benchmark_fixture_loads_cleanly() -> None:
    exp = _load_expected_summary()
    assert exp["ir_goal"] == "LoginDashboardShell"
    assert exp["source_tq"] == "examples/benchmark_flagship/app.tq"
    for p in exp["required_webapp_paths"]:
        assert p.startswith("generated/webapp/")


def test_flagship_tq_parse_validate_and_goal() -> None:
    assert FLAGSHIP_TQ.is_file()
    bundle, err, _ = parse_stage(FLAGSHIP_TQ)
    assert err is None and bundle is not None
    assert bundle["ir_goal"]["goal"] == "LoginDashboardShell"
    assert bundle["ir_goal"]["result"] == "Welcome back"
    vr = validate_stage(bundle)
    assert vr.ok is True, vr.diagnostics


def test_flagship_materialize_webapp_surfaces(tmp_path: Path) -> None:
    exp = _load_expected_summary()
    bundle, err, _ = parse_stage(FLAGSHIP_TQ)
    assert err is None and bundle is not None
    ok, summary, written = materialize_project(bundle, tmp_path, engine_mode="python_only")
    assert ok is True, summary
    for rel in exp["required_webapp_paths"]:
        assert rel in written, f"missing {rel}"
    for rel in exp["required_when_transitions_non_empty"]:
        assert rel in written, f"missing {rel}"
    assert (tmp_path / "generated" / "webapp" / "src" / "App.tsx").is_file()
    assert summary.get("local_webapp")
    assert summary.get("projection_surfaces")


def test_flagship_desktop_workspace_materialize_matches_cli(tmp_path: Path) -> None:
    bundle, err, _ = parse_stage(FLAGSHIP_TQ)
    assert err is None and bundle is not None
    out = materialize_bundle_to_workspace(str(tmp_path), bundle, out_subdir="generated_out")
    assert out.get("ok") is True, out
    web = Path(out["written_under"]) / "generated" / "webapp" / "package.json"
    assert web.is_file()


def test_flagship_torqa_build_cli_json(tmp_path: Path) -> None:
    r = subprocess.run(
        [
            sys.executable,
            "-m",
            "src.cli.main",
            "--json",
            "build",
            str(FLAGSHIP_TQ),
            "--root",
            str(tmp_path),
            "--out",
            "bench_out",
            "--engine-mode",
            "python_only",
        ],
        cwd=str(REPO),
        capture_output=True,
        text=True,
    )
    assert r.returncode == 0, r.stderr + r.stdout
    data = json.loads(r.stdout)
    assert data.get("ok") is True
    written = set(data.get("written") or [])
    assert "generated/webapp/package.json" in written


def test_invalid_tq_never_produces_bundle_for_materialize(tmp_path: Path) -> None:
    bad = tmp_path / "broken.tq"
    bad.write_text(
        "intent broken\nrequires username, password, ip_address\nflow:\n",
        encoding="utf-8",
    )
    bundle, err, _ = parse_stage(bad)
    assert bundle is None and err is not None


def test_semantically_invalid_bundle_does_not_materialize_successfully(tmp_path: Path) -> None:
    bundle, err, _ = parse_stage(FLAGSHIP_TQ)
    assert err is None and bundle is not None
    broken = json.loads(json.dumps(bundle))
    broken["ir_goal"]["transitions"] = [
        {
            "transition_id": "t_0001",
            "effect_name": "__invalid_benchmark_effect__",
            "arguments": [{"type": "identifier", "name": "username"}],
            "from_state": "before",
            "to_state": "after",
        }
    ]
    ok, summary, written = materialize_project(broken, tmp_path, engine_mode="python_only")
    assert ok is False
    assert written == []
