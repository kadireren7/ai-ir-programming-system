"""
Deterministic token measurement reports (prompt, .tq surface, IR JSON, generated files).

Single estimator: ``utf8_bytes_div_4_v1`` (see ``token_estimate``). All file reads use UTF-8.
Generated paths are summed in sorted POSIX path order for stable totals.
"""

from __future__ import annotations

import json
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Mapping, Optional, Sequence

from src.benchmarks.token_estimate import ESTIMATOR_ID, ESTIMATOR_METHOD_EN, estimate_tokens
from src.project_materialize import materialize_project
from src.surface.parse_tq import parse_tq_source

MEASUREMENT_SCHEMA_VERSION = 1

_NOTES = [
    "semantic_compression_ratio = prompt_tokens / max(1, torqa_tokens).",
    "ir_to_torqa_ratio = ir_tokens / max(1, torqa_tokens).",
    "generated_to_torqa_ratio = generated_code_tokens / max(1, torqa_tokens) when measured, else null.",
    "ir_tokens are computed from canonical IR JSON (sorted keys, compact separators).",
    "generated_code_tokens: sum of estimates over listed files in sorted path order; missing paths skipped.",
]


def canonical_ir_goal_json(ir_goal: Mapping[str, Any]) -> str:
    """Deterministic JSON wire for IR goal (sorted keys, no extra whitespace)."""
    return json.dumps(dict(ir_goal), sort_keys=True, separators=(",", ":"))


def sum_tokens_for_text_files(paths: Sequence[Path]) -> int:
    """Sum ``estimate_tokens`` for existing files; ``paths`` sorted by POSIX path string."""
    resolved = [Path(p).resolve() for p in paths]
    ordered = sorted(resolved, key=lambda x: x.as_posix())
    total = 0
    for p in ordered:
        if p.is_file():
            total += estimate_tokens(p.read_text(encoding="utf-8"))
    return total


def build_token_measurement_metrics(
    *,
    prompt_text: str,
    torqa_surface_text: str,
    ir_goal: Mapping[str, Any],
    generated_file_paths: Optional[Sequence[Path]] = None,
) -> Dict[str, Any]:
    """
    Core numeric metrics (stable key names).

    ``generated_file_paths``: if provided (including empty sequence), ``generated_code_measured`` is True
    and listed files are counted; if None, generated counts are zero and measured is False.
    """
    prompt_tokens = estimate_tokens(prompt_text)
    torqa_tokens = estimate_tokens(torqa_surface_text)
    ir_json = canonical_ir_goal_json(ir_goal)
    ir_tokens = estimate_tokens(ir_json)

    if generated_file_paths is None:
        gen_tokens = 0
        measured = False
    else:
        gen_tokens = sum_tokens_for_text_files(list(generated_file_paths))
        measured = True

    sem = round(prompt_tokens / max(1, torqa_tokens), 6)
    ir_torqa = round(ir_tokens / max(1, torqa_tokens), 6)
    gen_torqa: Optional[float] = (
        round(gen_tokens / max(1, torqa_tokens), 6) if measured else None
    )

    return {
        "prompt_tokens": prompt_tokens,
        "torqa_tokens": torqa_tokens,
        "ir_tokens": ir_tokens,
        "generated_code_tokens": gen_tokens,
        "generated_code_measured": measured,
        "semantic_compression_ratio": sem,
        "ir_to_torqa_ratio": ir_torqa,
        "generated_to_torqa_ratio": gen_torqa,
    }


def build_token_measurement_report(
    *,
    prompt_text: str,
    torqa_surface_text: str,
    ir_goal: Mapping[str, Any],
    generated_file_paths: Optional[Sequence[Path]] = None,
    sources: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """Full JSON-serializable report (schema_version + estimator + metrics + notes)."""
    metrics = build_token_measurement_metrics(
        prompt_text=prompt_text,
        torqa_surface_text=torqa_surface_text,
        ir_goal=ir_goal,
        generated_file_paths=generated_file_paths,
    )
    out: Dict[str, Any] = {
        "schema_version": MEASUREMENT_SCHEMA_VERSION,
        "estimator_id": ESTIMATOR_ID,
        "estimator_method_en": ESTIMATOR_METHOD_EN,
        "metrics": metrics,
        "notes": list(_NOTES),
    }
    if sources:
        out["sources"] = dict(sources)
    return out


def measurement_report_to_canonical_json(report: Dict[str, Any]) -> str:
    """Stable JSON for diffing."""
    return json.dumps(report, sort_keys=True, indent=2, ensure_ascii=False) + "\n"


def run_measurement_for_p31_benchmark_dir(
    benchmark_dir: Path,
    *,
    repo_root: Optional[Path] = None,
    materialize_root: Optional[Path] = None,
    auto_materialize: bool = False,
) -> Dict[str, Any]:
    """
    P31 layout: ``BENCHMARK_TASK.md``, ``app.tq``, ``expected_output_summary.json``.

    Returns a full token measurement report plus ``benchmark_id`` and optional ``_ephemeral_materialize_root``.
    """
    bench_dir = benchmark_dir.resolve()
    tq_path = bench_dir / "app.tq"
    task_path = bench_dir / "BENCHMARK_TASK.md"
    fix_path = bench_dir / "expected_output_summary.json"

    if not tq_path.is_file():
        raise FileNotFoundError(f"missing app.tq under {bench_dir}")
    if not task_path.is_file():
        raise FileNotFoundError(f"missing BENCHMARK_TASK.md under {bench_dir}")
    if not fix_path.is_file():
        raise FileNotFoundError(f"missing expected_output_summary.json under {bench_dir}")

    task_text = task_path.read_text(encoding="utf-8")
    tq_text = tq_path.read_text(encoding="utf-8")
    bundle = parse_tq_source(tq_text, tq_path=tq_path)
    ir_goal = bundle.get("ir_goal")
    if not isinstance(ir_goal, dict):
        raise ValueError("bundle missing ir_goal dict")

    fixture = json.loads(fix_path.read_text(encoding="utf-8"))
    benchmark_id = str(fixture.get("benchmark_id") or "unknown")
    web_paths: List[str] = list(fixture.get("required_webapp_paths") or [])
    web_paths.extend(fixture.get("required_when_transitions_non_empty") or [])
    web_paths_sorted = sorted(set(web_paths))

    gen_root: Optional[Path] = materialize_root
    tmp_dir: Optional[str] = None
    if auto_materialize:
        root = repo_root.resolve() if repo_root else bench_dir.parent.parent
        tmp = tempfile.mkdtemp(prefix="torqa_token_measure_", dir=str(root))
        tmp_dir = tmp
        gen_root = Path(tmp)
        ok, summary, _written = materialize_project(bundle, gen_root, engine_mode="python_only")
        if not ok:
            raise RuntimeError(f"materialize failed: {summary}")

    gen_paths_opt: Optional[List[Path]] = None
    if gen_root is not None:
        root_res = gen_root.resolve()
        gen_paths_opt = [root_res / Path(rel) for rel in web_paths_sorted]

    report = build_token_measurement_report(
        prompt_text=task_text,
        torqa_surface_text=tq_text,
        ir_goal=ir_goal,
        generated_file_paths=gen_paths_opt,
        sources={"prompt": "BENCHMARK_TASK.md", "torqa_surface": "app.tq"},
    )
    report["benchmark_id"] = benchmark_id
    report["paths"] = {
        "benchmark_dir": _bench_display_path(bench_dir, repo_root),
        "task_spec": "BENCHMARK_TASK.md",
        "torqa_surface": "app.tq",
        "generated_paths_relative": web_paths_sorted,
    }
    if tmp_dir:
        report["_ephemeral_materialize_root"] = tmp_dir
    return report


def public_measurement_report(report: Dict[str, Any]) -> Dict[str, Any]:
    """Strip keys starting with ``_`` for publishing."""
    return {k: v for k, v in report.items() if not str(k).startswith("_")}


def metrics_to_compression_p32_shape(m: Mapping[str, Any]) -> Dict[str, Any]:
    """Map standard measurement metrics to legacy P32 compression_report field names."""
    return {
        "task_prompt_token_estimate": int(m["prompt_tokens"]),
        "torqa_source_token_estimate": int(m["torqa_tokens"]),
        "ir_bundle_token_estimate": int(m["ir_tokens"]),
        "generated_output_token_estimate": int(m["generated_code_tokens"]),
        "generated_output_measured": bool(m["generated_code_measured"]),
        "semantic_compression_ratio": m["semantic_compression_ratio"],
        "surface_to_ir_ratio": m["ir_to_torqa_ratio"],
        "generated_to_surface_ratio": m["generated_to_torqa_ratio"],
    }


def _bench_display_path(bench_dir: Path, repo_root: Optional[Path]) -> str:
    if repo_root is not None:
        try:
            rel = bench_dir.relative_to(repo_root.resolve())
            return str(rel).replace("\\", "/")
        except ValueError:
            pass
    return str(bench_dir).replace("\\", "/")
