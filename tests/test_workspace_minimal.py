"""Priority 2: examples/workspace_minimal/app.tq happy path — parse, surface CLI, project, determinism, golden written list."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

from src.cli.main import main
from src.diagnostics.report import build_full_diagnostic_report
from src.ir.canonical_ir import CANONICAL_IR_VERSION, ir_goal_from_json, validate_bundle_envelope
from src.surface.parse_tq import parse_tq_source

REPO = Path(__file__).resolve().parents[1]
APP_TQ = REPO / "examples" / "workspace_minimal" / "app.tq"
PROJECT_WRITTEN_GOLDEN = REPO / "tests" / "data" / "workspace_minimal_project_written.json"
GOLDEN_WEBAPP_INDEX = REPO / "tests" / "data" / "workspace_minimal_webapp_index.html"
GOLDEN_WEBAPP_PACKAGE_JSON = REPO / "tests" / "data" / "workspace_minimal_webapp_package.json"

_IR_GOAL_SECTIONS = frozenset(
    {"forbids", "goal", "inputs", "metadata", "postconditions", "preconditions", "result", "transitions"}
)


def _norm_eol(s: str) -> str:
    return s.replace("\r\n", "\n").replace("\r", "\n")


def _run_cli(*args: str):
    return subprocess.run(
        [sys.executable, "-m", "src.cli.main", *args],
        cwd=str(REPO),
        capture_output=True,
        text=True,
    )


def test_workspace_minimal_bundle_shape_stable():
    bundle = parse_tq_source(APP_TQ.read_text(encoding="utf-8"))
    assert list(bundle.keys()) == ["ir_goal"]
    ig = bundle["ir_goal"]
    assert set(ig.keys()) == _IR_GOAL_SECTIONS
    assert ig["goal"] == "HelloDemo"
    assert ig["metadata"]["ir_version"] == CANONICAL_IR_VERSION
    assert isinstance(ig["inputs"], list) and len(ig["inputs"]) == 2
    assert isinstance(ig["transitions"], list)
    assert isinstance(ig["forbids"], list)
    assert isinstance(ig["preconditions"], list)
    assert isinstance(ig["postconditions"], list)


def test_workspace_minimal_app_tq_parse_bundle_and_diagnostics_ok():
    raw = APP_TQ.read_text(encoding="utf-8")
    bundle = parse_tq_source(raw)
    assert bundle["ir_goal"]["goal"] == "HelloDemo"
    env_e = validate_bundle_envelope(bundle)
    g = ir_goal_from_json(bundle)
    rep = build_full_diagnostic_report(g, bundle_envelope_errors=env_e)
    assert rep["ok"] is True, rep


def test_workspace_minimal_surface_cli_writes_valid_bundle(tmp_path):
    out = tmp_path / "bundle.json"
    rc = main(["surface", str(APP_TQ), "--out", str(out)])
    assert rc == 0, out
    from_disk = json.loads(out.read_text(encoding="utf-8"))
    expected = parse_tq_source(APP_TQ.read_text(encoding="utf-8"))
    assert json.dumps(from_disk, sort_keys=True) == json.dumps(expected, sort_keys=True)


def test_workspace_minimal_project_e2e_determinism_and_tree(tmp_path):
    expected_written = sorted(json.loads(PROJECT_WRITTEN_GOLDEN.read_text(encoding="utf-8")))
    r1 = _run_cli(
        "project",
        "--root",
        str(tmp_path),
        "--source",
        str(APP_TQ),
        "--out",
        "out",
        "--engine-mode",
        "python_only",
    )
    assert r1.returncode == 0, r1.stderr + r1.stdout
    data1 = json.loads(r1.stdout)
    assert data1["ok"] is True
    w1 = sorted(data1["written"])
    assert w1 == expected_written, w1

    r2 = _run_cli(
        "project",
        "--root",
        str(tmp_path),
        "--source",
        str(APP_TQ),
        "--out",
        "out",
        "--engine-mode",
        "python_only",
    )
    assert r2.returncode == 0, r2.stderr + r2.stdout
    data2 = json.loads(r2.stdout)
    assert data2["ok"] is True
    w2 = sorted(data2["written"])
    assert w2 == expected_written
    assert w1 == w2

    root = tmp_path / "out"
    assert (root / "generated/webapp/package.json").is_file()
    assert (root / "generated/webapp/src/App.tsx").is_file()


def test_workspace_minimal_project_webapp_content_matches_golden(tmp_path):
    r = _run_cli(
        "project",
        "--root",
        str(tmp_path),
        "--source",
        str(APP_TQ),
        "--out",
        "out",
        "--engine-mode",
        "python_only",
    )
    assert r.returncode == 0, r.stderr + r.stdout
    webroot = tmp_path / "out" / "generated" / "webapp"
    idx = (webroot / "index.html").read_text(encoding="utf-8")
    assert _norm_eol(idx) == _norm_eol(GOLDEN_WEBAPP_INDEX.read_text(encoding="utf-8"))
    pkg_actual = json.loads((webroot / "package.json").read_text(encoding="utf-8"))
    pkg_expected = json.loads(GOLDEN_WEBAPP_PACKAGE_JSON.read_text(encoding="utf-8"))
    assert pkg_actual == pkg_expected


def test_workspace_minimal_project_cli_smoke_torqa_or_module(tmp_path):
    """Prefer ``torqa`` on PATH when installed; else same entrypoint via ``python -m src.cli.main``."""
    torqa = shutil.which("torqa")
    if torqa:
        cmd = [
            torqa,
            "project",
            "--root",
            str(tmp_path),
            "--source",
            str(APP_TQ),
            "--out",
            "smoke_out",
            "--engine-mode",
            "python_only",
        ]
    else:
        cmd = [
            sys.executable,
            "-m",
            "src.cli.main",
            "project",
            "--root",
            str(tmp_path),
            "--source",
            str(APP_TQ),
            "--out",
            "smoke_out",
            "--engine-mode",
            "python_only",
        ]
    r = subprocess.run(cmd, cwd=str(REPO), capture_output=True, text=True)
    assert r.returncode == 0, r.stderr + r.stdout
    assert (tmp_path / "smoke_out" / "generated" / "webapp" / "index.html").is_file()
