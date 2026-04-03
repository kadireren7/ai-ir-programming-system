"""P35: public flagship demo package — assets, bench, gate, UI entrypoints, torqa-flagship."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

pytest.importorskip("fastapi")

from fastapi.testclient import TestClient

from src.benchmarks.flagship_demo_cli import HELP_TEXT, demo_benchmark, verify
from webui.app import app

REPO = Path(__file__).resolve().parents[1]
FLAGSHIP = REPO / "examples" / "benchmark_flagship"


def test_flagship_demo_assets_exist() -> None:
    assert (FLAGSHIP / "app.tq").is_file()
    assert (FLAGSHIP / "BENCHMARK_TASK.md").is_file()
    assert (FLAGSHIP / "expected_output_summary.json").is_file()
    assert (FLAGSHIP / "compression_baseline_report.json").is_file()
    assert (FLAGSHIP / "gate_invalid" / "manifest.json").is_file()


def test_flagship_verify_module() -> None:
    assert verify() == 0


def test_torqa_flagship_cli_verify_subprocess() -> None:
    r = subprocess.run(
        [sys.executable, "-m", "src.benchmarks.flagship_demo_cli", "verify"],
        cwd=str(REPO),
        capture_output=True,
        text=True,
    )
    assert r.returncode == 0, r.stderr + r.stdout


def test_torqa_flagship_help_lists_core_commands() -> None:
    assert "torqa build examples/benchmark_flagship/app.tq" in HELP_TEXT
    assert "torqa demo benchmark" in HELP_TEXT
    assert "examples/trial_ready/README.md" in HELP_TEXT
    assert "torqa-gate-proof" in HELP_TEXT
    assert "torqa-compression-bench" in HELP_TEXT
    assert "torqa-console" in HELP_TEXT
    assert "torqa-desktop" in HELP_TEXT
    assert "desktop_legacy" in HELP_TEXT
    assert "docs/TRIAL_READINESS.md" in HELP_TEXT
    assert "torqa demo verify" in HELP_TEXT


def test_torqa_demo_benchmark_subprocess() -> None:
    r = subprocess.run(
        [sys.executable, "-m", "torqa", "demo", "benchmark"],
        cwd=str(REPO),
        capture_output=True,
        text=True,
    )
    assert r.returncode == 0, r.stderr
    assert "semantic_compression_ratio" in r.stdout
    r2 = subprocess.run(
        [sys.executable, "-m", "torqa", "--json", "demo", "benchmark"],
        cwd=str(REPO),
        capture_output=True,
        text=True,
    )
    assert r2.returncode == 0, r2.stderr
    data = json.loads(r2.stdout)
    assert data.get("schema_version") == 1
    assert "metrics" in data


def test_webui_flagship_demo_api_and_markup() -> None:
    client = TestClient(app)
    r = client.get("/api/demo/flagship-tq")
    assert r.status_code == 200
    assert "flow:" in r.json().get("source", "")
    r2 = client.get("/console")
    assert r2.status_code == 200
    assert b"btn-demo-flagship-tq" in r2.content
    assert b"validation-banner" in r2.content
    r3 = client.get("/desktop")
    assert r3.status_code == 200
    assert b"btn-desk-flagship" in r3.content
