"""P32: compression benchmark utility — runs, stable JSON, deterministic ratios."""

from __future__ import annotations

import json
from pathlib import Path

from src.benchmarks.compression_report import (
    benchmark_report_to_canonical_json,
    public_benchmark_report,
    run_compression_benchmark,
)
from src.benchmarks.token_estimate import ESTIMATOR_ID, estimate_tokens
from src.project_materialize import materialize_project, parse_stage

REPO = Path(__file__).resolve().parents[1]
FLAGSHIP = REPO / "examples" / "benchmark_flagship"
BASELINE_JSON = FLAGSHIP / "compression_baseline_report.json"


def test_estimate_tokens_deterministic() -> None:
    assert estimate_tokens("") == 0
    assert estimate_tokens("abcd") == 1
    x = "hello" * 100
    a = estimate_tokens(x)
    b = estimate_tokens(x)
    assert a == b and a > 10


def test_flagship_report_json_shape_and_ratios(tmp_path: Path) -> None:
    bundle, err, _ = parse_stage(FLAGSHIP / "app.tq")
    assert err is None and bundle is not None
    ok, _summary, _w = materialize_project(bundle, tmp_path, engine_mode="python_only")
    assert ok is True

    r1 = run_compression_benchmark(FLAGSHIP, repo_root=REPO, materialize_root=tmp_path)
    r2 = run_compression_benchmark(FLAGSHIP, repo_root=REPO, materialize_root=tmp_path)
    pub1 = public_benchmark_report(r1)
    pub2 = public_benchmark_report(r2)
    assert pub1 == pub2

    assert pub1["schema_version"] == 1
    assert pub1["benchmark_id"] == "p31_login_dashboard_shell_v1"
    assert pub1["estimator_id"] == ESTIMATOR_ID
    m = pub1["metrics"]
    assert set(m.keys()) == {
        "task_prompt_token_estimate",
        "torqa_source_token_estimate",
        "ir_bundle_token_estimate",
        "generated_output_token_estimate",
        "generated_output_measured",
        "semantic_compression_ratio",
        "surface_to_ir_ratio",
        "generated_to_surface_ratio",
    }
    assert m["generated_output_measured"] is True
    assert m["torqa_source_token_estimate"] >= 1
    assert m["task_prompt_token_estimate"] > m["torqa_source_token_estimate"]
    assert m["semantic_compression_ratio"] == round(
        m["task_prompt_token_estimate"] / max(1, m["torqa_source_token_estimate"]), 6
    )
    assert m["surface_to_ir_ratio"] == round(
        m["ir_bundle_token_estimate"] / max(1, m["torqa_source_token_estimate"]), 6
    )
    assert m["generated_to_surface_ratio"] == round(
        m["generated_output_token_estimate"] / max(1, m["torqa_source_token_estimate"]), 6
    )
    assert m["generated_output_token_estimate"] > m["torqa_source_token_estimate"]

    js = benchmark_report_to_canonical_json(r1)
    roundtrip = json.loads(js)
    assert roundtrip == pub1


def test_no_generated_branch() -> None:
    r = run_compression_benchmark(FLAGSHIP, repo_root=REPO)
    m = public_benchmark_report(r)["metrics"]
    assert m["generated_output_measured"] is False
    assert m["generated_output_token_estimate"] == 0
    assert m["generated_to_surface_ratio"] is None


def test_baseline_report_file_matches_schema() -> None:
    assert BASELINE_JSON.is_file()
    data = json.loads(BASELINE_JSON.read_text(encoding="utf-8"))
    assert data["schema_version"] == 1
    assert "metrics" in data
    assert data["metrics"]["generated_output_measured"] is True
