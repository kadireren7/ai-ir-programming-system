"""F1: torqa project idempotency and .tq source."""

import json
import subprocess
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]


def _run(*args: str):
    return subprocess.run(
        [sys.executable, "-m", "src.cli.main", *args],
        cwd=str(REPO),
        capture_output=True,
        text=True,
    )


def test_project_from_json_writes_and_is_idempotent(tmp_path):
    src = REPO / "examples" / "core" / "valid_minimal_flow.json"
    out = tmp_path / "gen"
    r1 = _run("project", "--root", str(tmp_path), "--source", str(src), "--out", "gen", "--engine-mode", "python_only")
    assert r1.returncode == 0, r1.stderr + r1.stdout
    data1 = json.loads(r1.stdout)
    assert data1["ok"] is True
    assert data1["written"]
    r2 = _run("project", "--root", str(tmp_path), "--source", str(src), "--out", "gen", "--engine-mode", "python_only")
    assert r2.returncode == 0, r2.stderr + r2.stdout
    data2 = json.loads(r2.stdout)
    assert sorted(data1["written"]) == sorted(data2["written"])


def test_project_login_flow_includes_local_webapp_hint(tmp_path):
    src = REPO / "examples" / "core" / "valid_login_flow.json"
    r = _run("project", "--root", str(tmp_path), "--source", str(src), "--out", "g", "--engine-mode", "python_only")
    assert r.returncode == 0, r.stderr + r.stdout
    data = json.loads(r.stdout)
    assert data["ok"] is True
    hint = data.get("local_webapp")
    assert hint is not None
    assert hint.get("relative_dir") == "generated/webapp"
    assert "npm run dev" in hint.get("commands_posix", "")
    assert hint.get("webapp_dir_absolute")
    assert "generated" in hint["webapp_dir_absolute"] and "webapp" in hint["webapp_dir_absolute"]
