"""
P32: build a JSON-serializable compression benchmark report for a benchmark directory.

Expects (P31 layout):
  - ``BENCHMARK_TASK.md`` — natural-language task (comparator prompt)
  - ``app.tq`` — TORQA surface
  - ``expected_output_summary.json`` — includes ``required_webapp_paths`` / transitions extras
"""

from __future__ import annotations

import json
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional

from src.benchmarks.token_estimate import ESTIMATOR_ID
from src.benchmarks.token_measurement import (
    build_token_measurement_metrics,
    metrics_to_compression_p32_shape,
)
from src.project_materialize import materialize_project
from src.surface.parse_tq import parse_tq_source


REPORT_SCHEMA_VERSION = 1


def _load_webapp_paths_from_fixture(bench_dir: Path) -> List[str]:
    fix = bench_dir / "expected_output_summary.json"
    data = json.loads(fix.read_text(encoding="utf-8"))
    paths: List[str] = list(data.get("required_webapp_paths") or [])
    paths.extend(data.get("required_when_transitions_non_empty") or [])
    return sorted(set(paths))


def run_compression_benchmark(
    benchmark_dir: Path,
    *,
    repo_root: Optional[Path] = None,
    materialize_root: Optional[Path] = None,
    auto_materialize: bool = False,
) -> Dict[str, Any]:
    """
    ``benchmark_dir``: directory containing ``BENCHMARK_TASK.md``, ``app.tq``, fixture JSON.

    If ``materialize_root`` is set, measure generated webapp files there (must already exist).

    If ``auto_materialize`` is True, create a temp dir under ``repo_root``, materialize, measure,
    and include ``_materialize_root`` in the report (absolute path) for debugging only —
    callers may strip before publishing.
    """
    bench_dir = benchmark_dir.resolve()
    tq_path = bench_dir / "app.tq"
    task_path = bench_dir / "BENCHMARK_TASK.md"

    if not tq_path.is_file():
        raise FileNotFoundError(f"missing app.tq under {bench_dir}")
    if not task_path.is_file():
        raise FileNotFoundError(f"missing BENCHMARK_TASK.md under {bench_dir}")

    task_text = task_path.read_text(encoding="utf-8")
    tq_text = tq_path.read_text(encoding="utf-8")

    bundle = parse_tq_source(tq_text, tq_path=tq_path)
    ir_goal = bundle.get("ir_goal")
    if not isinstance(ir_goal, dict):
        raise ValueError("bundle missing ir_goal dict")

    fixture = json.loads((bench_dir / "expected_output_summary.json").read_text(encoding="utf-8"))
    benchmark_id = str(fixture.get("benchmark_id") or "unknown")

    web_paths = _load_webapp_paths_from_fixture(bench_dir)
    gen_root: Optional[Path] = materialize_root
    tmp_dir: Optional[str] = None
    if auto_materialize:
        root = repo_root.resolve() if repo_root else bench_dir.parent.parent
        tmp = tempfile.mkdtemp(prefix="torqa_compress_bench_", dir=str(root))
        tmp_dir = tmp
        gen_root = Path(tmp)
        ok, summary, _written = materialize_project(bundle, gen_root, engine_mode="python_only")
        if not ok:
            raise RuntimeError(f"materialize failed: {summary}")

    gen_paths_opt: Optional[List[Path]] = None
    if gen_root is not None:
        root_res = gen_root.resolve()
        gen_paths_opt = [root_res / Path(rel) for rel in sorted(web_paths)]

    core = build_token_measurement_metrics(
        prompt_text=task_text,
        torqa_surface_text=tq_text,
        ir_goal=ir_goal,
        generated_file_paths=gen_paths_opt,
    )
    metrics = metrics_to_compression_p32_shape(core)

    if repo_root is not None:
        try:
            bench_rel = bench_dir.relative_to(repo_root.resolve())
        except ValueError:
            bench_rel = bench_dir
        bench_display = str(bench_rel).replace("\\", "/")
    else:
        bench_display = str(bench_dir).replace("\\", "/")

    out: Dict[str, Any] = {
        "schema_version": REPORT_SCHEMA_VERSION,
        "benchmark_id": benchmark_id,
        "estimator_id": ESTIMATOR_ID,
        "paths": {
            "benchmark_dir": bench_display,
            "task_spec": "BENCHMARK_TASK.md",
            "torqa_surface": "app.tq",
        },
        "metrics": metrics,
        "notes": [
            "Ratios use max(1, denominator) for division safety.",
            "semantic_compression_ratio = task_prompt_token_estimate / torqa_source_token_estimate "
            "(how many times larger the NL task is than the .tq surface).",
            "surface_to_ir_ratio = ir_bundle_token_estimate / torqa_source_token_estimate.",
            "generated_to_surface_ratio = generated_output_token_estimate / torqa_source_token_estimate when measured, else null.",
        ],
    }
    if tmp_dir:
        out["_ephemeral_materialize_root"] = tmp_dir
    return out


def public_benchmark_report(report: Dict[str, Any]) -> Dict[str, Any]:
    """Drop keys starting with ``_`` (ephemeral debug fields)."""
    return {k: v for k, v in report.items() if not str(k).startswith("_")}


def benchmark_report_to_canonical_json(report: Dict[str, Any]) -> str:
    """Stable JSON for diffing (strip ephemeral keys)."""
    return json.dumps(public_benchmark_report(report), sort_keys=True, indent=2, ensure_ascii=False) + "\n"
