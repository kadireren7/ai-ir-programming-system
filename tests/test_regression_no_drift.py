"""
Regression guards: stable CLI flag rules, maintainer doc copy-paste, web API shapes for UIs, entrypoints.

Failing tests here usually mean an accidental behavior or contract change — update code + tests together.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

pytest.importorskip("fastapi")

from fastapi.testclient import TestClient

from website.server.app import app

REPO = Path(__file__).resolve().parents[1]


def test_regression_global_json_must_precede_subcommand() -> None:
    """`--json` is a parent-parser flag; trailing `--json` after `surface` must fail."""
    tq = REPO / "examples" / "torqa" / "auth_login.tq"
    bad = subprocess.run(
        [sys.executable, "-m", "torqa", "surface", str(tq), "--json"],
        cwd=str(REPO),
        capture_output=True,
        text=True,
    )
    assert bad.returncode != 0
    combined = (bad.stderr + bad.stdout).lower()
    assert "unrecognized arguments" in combined or "error:" in bad.stderr.lower()

    good = subprocess.run(
        [sys.executable, "-m", "torqa", "--json", "surface", str(tq)],
        cwd=str(REPO),
        capture_output=True,
        text=True,
    )
    assert good.returncode == 0, good.stderr
    data = json.loads(good.stdout)
    assert data.get("ok") is True
    assert data.get("ir_bundle", {}).get("ir_goal", {}).get("goal")


def test_regression_maintainer_verify_surface_json_order() -> None:
    text = (REPO / "docs" / "MAINTAINER_VERIFY.md").read_text(encoding="utf-8")
    assert "torqa --json surface" in text
    assert "torqa surface examples/torqa/auth_login.tq --json" not in text
    assert "python -m src.cli.main surface examples/torqa/auth_login.tq --json" not in text


def test_regression_webui_benchmark_report_metrics_shape() -> None:
    """P32 UI + site consume these keys from /api/demo/benchmark-report."""
    client = TestClient(app)
    r = client.get("/api/demo/benchmark-report")
    assert r.status_code == 200
    d = r.json()
    assert d.get("ok") is True
    m = d["report"]["metrics"]
    for key in (
        "task_prompt_token_estimate",
        "torqa_source_token_estimate",
        "semantic_compression_ratio",
    ):
        assert key in m, f"missing metrics.{key}"
        assert isinstance(m[key], (int, float)), f"metrics.{key} must be numeric"


def test_regression_webui_diagnostics_ok_minimal_bundle() -> None:
    client = TestClient(app)
    raw = (REPO / "examples" / "core" / "valid_minimal_flow.json").read_text(encoding="utf-8")
    bundle = json.loads(raw)
    r = client.post("/api/diagnostics", json={"ir_bundle": bundle})
    assert r.status_code == 200
    out = r.json()
    assert out.get("ok") is True
    assert out.get("issues") == []


def test_regression_webui_health_contract() -> None:
    client = TestClient(app)
    r = client.get("/api/health")
    assert r.status_code == 200
    d = r.json()
    assert d.get("status") == "ok"
    assert d.get("service") == "torqa-website"
    assert d.get("canonical_ir_version")
    assert d.get("package_version")


def test_regression_static_shell_markers_console_desktop_site() -> None:
    """Site HTML hooks + /console redirect; desktop CTA page."""
    client = TestClient(app)
    console = client.get("/console", follow_redirects=False)
    assert console.status_code == 301
    assert console.headers.get("location") == "/"

    desktop = client.get("/desktop")
    assert desktop.status_code == 200
    d = desktop.content
    assert b"p73-desktop-unified" in d
    assert b"data-torqa-surface=\"desktop-native-cta\"" in d

    site = client.get("/")
    assert site.status_code == 200
    s = site.content
    assert b"site-benchmark-root" in s
    assert b"benchmark_panel.js" in s


def test_regression_pyproject_entrypoint_scripts() -> None:
    text = (REPO / "pyproject.toml").read_text(encoding="utf-8")
    assert 'torqa = "src.cli.main:main"' in text
    for needle in (
        'torqa-console = "website.server.main:main"',
        'torqa-desktop = "src.torqa_desktop_launcher:main"',
        'torqa-gate-proof = "src.benchmarks.gate_proof_cli:main"',
        'torqa-compression-bench = "src.benchmarks.cli:main"',
        'torqa-flagship = "src.benchmarks.flagship_demo_cli:main"',
    ):
        assert needle in text, f"missing or renamed entrypoint: {needle}"


def test_regression_trial_readiness_lists_demo_and_build() -> None:
    text = (REPO / "docs" / "TRIAL_READINESS.md").read_text(encoding="utf-8")
    assert "torqa demo verify" in text
    assert "torqa build examples/benchmark_flagship/app.tq" in text
    assert "2. **`torqa demo`**" in text
    assert "trial_ready/README.md" in text


def test_regression_trial_ready_package_readme_exists() -> None:
    p = REPO / "examples" / "trial_ready" / "README.md"
    assert p.is_file()
    body = p.read_text(encoding="utf-8")
    assert "torqa demo" in body
    assert "torqa demo benchmark" in body
