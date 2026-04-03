"""
P74: contract checks for TORQA Desktop — same CLI shapes the Electron shell expects.

Does not launch Electron; verifies ``torqa --json surface|build|demo benchmark`` on samples.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
MINIMAL_TQ = REPO / "examples" / "workspace_minimal" / "app.tq"


def _run_json(args: list[str]) -> tuple[int, dict | None, str, str]:
    cmd = [sys.executable, "-m", "torqa", "--json", *args]
    p = subprocess.run(
        cmd,
        cwd=REPO,
        capture_output=True,
        text=True,
        encoding="utf-8",
        env={**os.environ, "PYTHONPATH": str(REPO), "PYTHONUTF8": "1"},
    )
    raw_out = (p.stdout or "").strip()
    raw_err = (p.stderr or "").strip()
    blob = raw_out or raw_err
    try:
        return p.returncode, json.loads(blob) if blob else None, raw_out, raw_err
    except json.JSONDecodeError:
        return p.returncode, None, raw_out, raw_err


def test_desktop_contract_surface_minimal_tq():
    assert MINIMAL_TQ.is_file(), MINIMAL_TQ
    code, data, out, err = _run_json(["surface", str(MINIMAL_TQ)])
    assert code == 0, (code, out, err)
    assert data is not None
    assert data.get("ok") is True
    assert "diagnostics" in data
    assert "ir_bundle" in data


def test_desktop_contract_build_minimal_tq(tmp_path):
    assert MINIMAL_TQ.is_file()
    import shutil

    dest = tmp_path / "ws"
    dest.mkdir()
    tq = dest / "app.tq"
    shutil.copy(MINIMAL_TQ, tq)
    code, data, out, err = _run_json(
        ["build", str(tq), "--root", str(dest), "--out", "torqa_generated_out", "--engine-mode", "python_only"],
    )
    assert code == 0, (code, out, err)
    assert data is not None
    assert data.get("ok") is True
    assert isinstance(data.get("written"), list)
    assert data.get("written_under")


def test_desktop_contract_demo_benchmark_json():
    code, data, out, err = _run_json(["demo", "benchmark"])
    assert code == 0, (code, out, err)
    assert data is not None
    assert data.get("schema_version") == 1
    assert "metrics" in data
