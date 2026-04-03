"""Deterministic token measurement (prompt, .tq, IR, generated paths)."""

from __future__ import annotations

import json
from pathlib import Path

from src.benchmarks.compression_report import public_benchmark_report, run_compression_benchmark
from src.benchmarks.token_estimate import ESTIMATOR_ID, estimate_tokens
from src.benchmarks.token_measurement import (
    build_token_measurement_metrics,
    build_token_measurement_report,
    canonical_ir_goal_json,
    measurement_report_to_canonical_json,
    metrics_to_compression_p32_shape,
    run_measurement_for_p31_benchmark_dir,
    sum_tokens_for_text_files,
)
from src.project_materialize import materialize_project, parse_stage

REPO = Path(__file__).resolve().parents[1]
FLAGSHIP = REPO / "examples" / "benchmark_flagship"


def test_canonical_ir_json_stable() -> None:
    g = {"z": 1, "a": {"b": 2}}
    a = canonical_ir_goal_json(g)
    b = canonical_ir_goal_json({"a": {"b": 2}, "z": 1})
    assert a == b
    assert a == '{"a":{"b":2},"z":1}'


def test_sum_tokens_path_order_independent(tmp_path: Path) -> None:
    (tmp_path / "b.txt").write_text("bbbb", encoding="utf-8")
    (tmp_path / "a.txt").write_text("aaaa", encoding="utf-8")
    t1 = sum_tokens_for_text_files([tmp_path / "b.txt", tmp_path / "a.txt"])
    t2 = sum_tokens_for_text_files([tmp_path / "a.txt", tmp_path / "b.txt"])
    assert t1 == t2 == estimate_tokens("aaaa") + estimate_tokens("bbbb")


def test_semantic_compression_ratio_matches_definition() -> None:
    m = build_token_measurement_metrics(
        prompt_text="x" * 40,
        torqa_surface_text="y" * 8,
        ir_goal={"goal": "G"},
        generated_file_paths=None,
    )
    assert m["semantic_compression_ratio"] == round(
        m["prompt_tokens"] / max(1, m["torqa_tokens"]), 6
    )
    legacy = metrics_to_compression_p32_shape(m)
    assert legacy["semantic_compression_ratio"] == m["semantic_compression_ratio"]


def test_flagship_benchmark_dir_matches_compression_numbers(tmp_path: Path) -> None:
    bundle, err, _ = parse_stage(FLAGSHIP / "app.tq")
    assert err is None and bundle is not None
    ok, _s, _w = materialize_project(bundle, tmp_path, engine_mode="python_only")
    assert ok is True

    r1 = run_measurement_for_p31_benchmark_dir(FLAGSHIP, repo_root=REPO, materialize_root=tmp_path)
    r2 = run_measurement_for_p31_benchmark_dir(FLAGSHIP, repo_root=REPO, materialize_root=tmp_path)
    p1 = json.loads(measurement_report_to_canonical_json({k: v for k, v in r1.items() if not k.startswith("_")}))
    p2 = json.loads(measurement_report_to_canonical_json({k: v for k, v in r2.items() if not k.startswith("_")}))
    assert p1 == p2
    assert p1["estimator_id"] == ESTIMATOR_ID
    m = p1["metrics"]
    assert m["semantic_compression_ratio"] == round(
        m["prompt_tokens"] / max(1, m["torqa_tokens"]), 6
    )
    c = public_benchmark_report(run_compression_benchmark(FLAGSHIP, repo_root=REPO, materialize_root=tmp_path))
    tm = metrics_to_compression_p32_shape(m)
    assert c["metrics"] == tm


def test_build_report_includes_method_and_schema() -> None:
    rep = build_token_measurement_report(
        prompt_text="hi",
        torqa_surface_text="yo",
        ir_goal={"goal": "X", "metadata": {"ir_version": "1.4"}},
        generated_file_paths=None,
    )
    assert rep["schema_version"] == 1
    assert "estimator_method_en" in rep
    assert "semantic_compression_ratio" in rep["metrics"]
