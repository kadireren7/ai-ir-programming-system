"""
First benchmark comparison: TORQA surface + IR vs simulated raw-code token footprint.

Deterministic: same ``utf8_bytes_div_4_v1`` estimator as ``token_measurement``; raw proxy is a
closed-form function of prompt and IR token estimates (no randomness, no network).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Mapping

from src.benchmarks.token_estimate import ESTIMATOR_ID
from src.benchmarks.token_measurement import build_token_measurement_metrics
from src.diagnostics.report import build_full_diagnostic_report
from src.ir.canonical_ir import ir_goal_from_json, validate_bundle_envelope
from src.surface.parse_tq import TQParseError, parse_tq_source

REPORT_SCHEMA_VERSION = 1
REPORT_ID = "benchmark_initial"

# Simulated “raw implementation” size: max of NL×a, IR×b, floor c — stand-in for hand-written
# stack / typical NL→codegen expansion (not measured from real competitor repos).
RAW_CODE_SIMULATION = {
    "method": "max(round(prompt_tokens * 4), round(ir_tokens * 10), 400)",
    "prompt_multiplier": 4.0,
    "ir_multiplier": 10.0,
    "floor_tokens": 400,
}


def _simulated_raw_code_tokens(prompt_tokens: int, ir_tokens: int) -> int:
    a = int(round(prompt_tokens * RAW_CODE_SIMULATION["prompt_multiplier"]))
    b = int(round(ir_tokens * RAW_CODE_SIMULATION["ir_multiplier"]))
    floor = int(RAW_CODE_SIMULATION["floor_tokens"])
    return max(a, b, floor)


def _complexity_from_ir_goal(ir_goal: Mapping[str, Any]) -> Dict[str, Any]:
    """Deterministic IR shape counts (validated intent structural size, not NL prose)."""

    def _len_list(key: str) -> int:
        v = ir_goal.get(key)
        return len(v) if isinstance(v, list) else 0

    n_in = _len_list("inputs")
    n_pre = _len_list("preconditions")
    n_forb = _len_list("forbids")
    n_trans = _len_list("transitions")
    n_post = _len_list("postconditions")
    total = n_in + n_pre + n_forb + n_trans + n_post
    return {
        "ir_input_count": n_in,
        "ir_precondition_count": n_pre,
        "ir_forbid_count": n_forb,
        "ir_transition_count": n_trans,
        "ir_postcondition_count": n_post,
        "ir_structural_element_total": total,
    }


def discover_benchmark_task_dirs(benchmarks_root: Path) -> List[Path]:
    """Directories directly under ``benchmarks_root`` that contain ``TASK.md``."""
    root = benchmarks_root.resolve()
    out: List[Path] = []
    if not root.is_dir():
        return out
    for task_md in sorted(root.glob("*/TASK.md")):
        out.append(task_md.parent.resolve())
    return out


def run_benchmark_initial(
    repo_root: Path,
    *,
    benchmarks_subdir: str = "examples/benchmarks",
) -> Dict[str, Any]:
    """
    Build full JSON report for every ``*/TASK.md`` under ``repo_root / benchmarks_subdir``.
    """
    bench_root = (repo_root / benchmarks_subdir).resolve()
    tasks_out: List[Dict[str, Any]] = []
    successes = 0

    for task_dir in discover_benchmark_task_dirs(bench_root):
        task_id = task_dir.name
        task_md = task_dir / "TASK.md"
        tq_path = task_dir / "app.tq"
        rel_base = task_dir.relative_to(repo_root.resolve())

        prompt_text = task_md.read_text(encoding="utf-8") if task_md.is_file() else ""

        retries_block = {
            "ai_suggest_attempts": 0,
            "ai_suggest_max_retries_default": 3,
            "note": "Static batch: no OpenAI IR suggest loop; retries apply only to AI-assisted authoring.",
        }

        row: Dict[str, Any] = {
            "task_id": task_id,
            "paths": {
                "task_md": str(rel_base / "TASK.md").replace("\\", "/"),
                "torqa_surface": str(rel_base / "app.tq").replace("\\", "/"),
            },
            "success": False,
            "failure_stage": None,
            "message": None,
            "retries": retries_block,
            "metrics": {},
        }

        if not tq_path.is_file():
            row["failure_stage"] = "missing_surface"
            row["message"] = "app.tq not found"
            tasks_out.append(row)
            continue

        tq_text = tq_path.read_text(encoding="utf-8")
        try:
            bundle = parse_tq_source(tq_text, tq_path=tq_path)
        except TQParseError as ex:
            row["failure_stage"] = "parse"
            row["message"] = str(ex)
            tasks_out.append(row)
            continue

        ir_goal = bundle.get("ir_goal")
        if not isinstance(ir_goal, dict):
            row["failure_stage"] = "parse"
            row["message"] = "bundle missing ir_goal"
            tasks_out.append(row)
            continue

        try:
            goal = ir_goal_from_json(bundle)
        except Exception as ex:
            row["failure_stage"] = "ir_shape"
            row["message"] = str(ex)
            tasks_out.append(row)
            continue

        env_e = validate_bundle_envelope(bundle)
        rep = build_full_diagnostic_report(goal, bundle_envelope_errors=env_e)
        if not rep.get("ok"):
            row["failure_stage"] = "validate"
            row["message"] = (rep.get("issues") or [{}])[0].get("message", "validation failed")
            row["diagnostics_summary"] = {
                "blocking_issue_count": len(rep.get("issues") or []),
                "warning_row_count": len(rep.get("warnings") or []),
            }
            # Still compute token metrics for partial comparison
            core = build_token_measurement_metrics(
                prompt_text=prompt_text,
                torqa_surface_text=tq_text,
                ir_goal=ir_goal,
                generated_file_paths=None,
            )
            raw_sim = _simulated_raw_code_tokens(core["prompt_tokens"], core["ir_tokens"])
            cx = _complexity_from_ir_goal(ir_goal)
            row["metrics"] = _metrics_block(core, raw_sim, success=False, complexity=cx)
            tasks_out.append(row)
            continue

        core = build_token_measurement_metrics(
            prompt_text=prompt_text,
            torqa_surface_text=tq_text,
            ir_goal=ir_goal,
            generated_file_paths=None,
        )
        raw_sim = _simulated_raw_code_tokens(core["prompt_tokens"], core["ir_tokens"])
        cx = _complexity_from_ir_goal(ir_goal)
        row["success"] = True
        row["failure_stage"] = None
        row["message"] = None
        row["metrics"] = _metrics_block(core, raw_sim, success=True, complexity=cx)
        successes += 1
        tasks_out.append(row)

    # Summary aggregates (successful tasks only for reduction means)
    ok_metrics = [t["metrics"] for t in tasks_out if t.get("success")]
    reductions = [float(m["token_reduction_vs_simulated_raw"]) for m in ok_metrics if m.get("token_reduction_vs_simulated_raw") is not None]
    nl_ratios = [float(m["semantic_compression_nl_task_vs_torqa_surface"]) for m in ok_metrics]
    struct_totals = [
        int(m["complexity"]["ir_structural_element_total"])
        for m in ok_metrics
        if isinstance(m.get("complexity"), dict) and "ir_structural_element_total" in m["complexity"]
    ]

    summary: Dict[str, Any] = {
        "task_count": len(tasks_out),
        "torqa_validation_success_count": successes,
        "torqa_validation_failure_count": len(tasks_out) - successes,
        "mean_token_reduction_vs_simulated_raw": round(sum(reductions) / max(1, len(reductions)), 6)
        if reductions
        else None,
        "mean_semantic_compression_nl_vs_torqa_surface": round(sum(nl_ratios) / max(1, len(nl_ratios)), 6)
        if nl_ratios
        else None,
        "mean_ir_structural_element_total": round(sum(struct_totals) / max(1, len(struct_totals)), 6)
        if struct_totals
        else None,
    }

    return {
        "schema_version": REPORT_SCHEMA_VERSION,
        "report_id": REPORT_ID,
        "estimator_id": ESTIMATOR_ID,
        "raw_code_simulation": dict(RAW_CODE_SIMULATION),
        "tasks": tasks_out,
        "summary": summary,
    }


def _metrics_block(
    core: Dict[str, Any],
    raw_sim: int,
    *,
    success: bool,
    complexity: Dict[str, Any],
) -> Dict[str, Any]:
    pt = int(core["prompt_tokens"])
    tt = int(core["torqa_tokens"])
    it = int(core["ir_tokens"])
    reduction = round((raw_sim - tt) / max(1, raw_sim), 6)
    return {
        "prompt_tokens": pt,
        "torqa_tokens": tt,
        "ir_tokens": it,
        "ir_to_torqa_ratio": float(core["ir_to_torqa_ratio"]),
        "generated_code_tokens": int(core["generated_code_tokens"]),
        "generated_code_measured": bool(core["generated_code_measured"]),
        "raw_code_token_estimate_simulated": raw_sim,
        "semantic_compression_nl_task_vs_torqa_surface": round(pt / max(1, tt), 6),
        "token_reduction_vs_simulated_raw": reduction,
        "torqa_to_simulated_raw_ratio": round(tt / max(1, raw_sim), 6),
        "validation_ok": success,
        "complexity": complexity,
    }


def benchmark_initial_to_canonical_json(report: Dict[str, Any]) -> str:
    return json.dumps(report, sort_keys=True, indent=2, ensure_ascii=False) + "\n"


def write_benchmark_initial_report(repo_root: Path, out_path: Path) -> Dict[str, Any]:
    report = run_benchmark_initial(repo_root)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(benchmark_initial_to_canonical_json(report), encoding="utf-8")
    return report
