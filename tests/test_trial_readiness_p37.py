"""P37: trial readiness — docs, flagship assets, bench/gate run, website + desktop onboarding markers."""

from __future__ import annotations

from pathlib import Path

import pytest

pytest.importorskip("fastapi")

from fastapi.testclient import TestClient

from src.benchmarks.compression_report import public_benchmark_report, run_compression_benchmark
from src.benchmarks.flagship_demo_cli import HELP_TEXT, verify
from src.benchmarks.gate_proof import run_gate_proof_manifest
from website.server.app import app

REPO = Path(__file__).resolve().parents[1]
TRIAL_DOC = REPO / "docs" / "TRIAL_READINESS.md"
FLAGSHIP = REPO / "examples" / "benchmark_flagship"
GATE_MANIFEST = FLAGSHIP / "gate_invalid" / "manifest.json"


def test_trial_readiness_doc_exists_and_references_canonical_commands() -> None:
    assert TRIAL_DOC.is_file()
    text = TRIAL_DOC.read_text(encoding="utf-8")
    assert "examples/benchmark_flagship/app.tq" in text
    assert "2. **`torqa demo`**" in text
    assert "torqa demo verify" in text
    assert "torqa build examples/benchmark_flagship/app.tq" in text
    assert "torqa-compression-bench examples/benchmark_flagship" in text
    assert "torqa-gate-proof" in text
    assert "torqa-console" in text
    assert "torqa-desktop" in text
    assert "torqa-desktop-legacy" not in text
    assert "trial_ready/README.md" in text


def test_flagship_help_includes_trial_doc_and_verify() -> None:
    assert "docs/TRIAL_READINESS.md" in HELP_TEXT
    assert "torqa demo verify" in HELP_TEXT


def test_flagship_verify_and_bench_gate_run_clean() -> None:
    assert verify() == 0
    raw = run_compression_benchmark(FLAGSHIP, repo_root=REPO)
    pub = public_benchmark_report(raw)
    assert pub.get("benchmark_id")
    rep = run_gate_proof_manifest(GATE_MANIFEST)
    assert rep["summary"]["mismatch_with_expectation"] == 0


def test_website_has_start_here_and_what_is_torqa() -> None:
    client = TestClient(app)
    r = client.get("/")
    assert r.status_code == 200
    c = r.content
    assert b"id=\"site-start-here\"" in c
    assert b"id=\"site-what-is\"" in c
    assert b"TRIAL_READINESS.md" in c


def test_desktop_points_to_native_app_p73() -> None:
    client = TestClient(app)
    r = client.get("/desktop")
    assert r.status_code == 200
    c = r.content
    assert b"p73-desktop-unified" in c
    assert b"native" in c.lower()


def test_examples_api_serves_minimal_flow_for_desktop_template() -> None:
    client = TestClient(app)
    r = client.get("/api/examples/valid_minimal_flow.json")
    assert r.status_code == 200
    data = r.json()
    assert data.get("ir_goal", {}).get("goal") == "MinimalDemoFlow"


def test_trial_doc_key_paths_exist_on_disk() -> None:
    assert (REPO / "examples/benchmark_flagship/app.tq").is_file()
    assert (REPO / "examples/benchmark_flagship/compression_baseline_report.json").is_file()
    assert (REPO / "examples/benchmark_flagship/gate_invalid/manifest.json").is_file()