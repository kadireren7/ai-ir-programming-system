"""
AI IR suggestion retry statistics per benchmark task (``examples/benchmarks/*/TASK.md``).

Default report is **deterministic** without network: ``live=False`` or missing ``OPENAI_API_KEY``.
Use ``live=True`` with a key set to record real ``suggest_ir_bundle_from_prompt`` behavior.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from src.benchmarks.benchmark_initial import discover_benchmark_task_dirs
from src.diagnostics.codes import PX_AI_NO_KEY

REPORT_SCHEMA_VERSION = 1
REPORT_ID = "retry_stats"

SUGGEST_WRAPPER = Callable[[str, int], Dict[str, Any]]


def extract_benchmark_nl_prompt(task_md_text: str) -> str:
    """Prefer the ``## Natural language description`` section; else whole file."""
    marker = "## Natural language description"
    if marker in task_md_text:
        after = task_md_text.split(marker, 1)[1].lstrip("\n")
        for sep in ("\r\n## ", "\n## "):
            if sep in after:
                after = after.split(sep, 1)[0]
                break
        body = after.strip()
    else:
        body = task_md_text.strip()
    prefix = (
        "Produce a single JSON object with top-level key ir_goal that passes TORQA IR validation "
        "for this product intent. Use supported effects and handoff metadata rules.\n\nIntent:\n"
    )
    return (prefix + body).strip()


def _skip_suggest(_prompt: str, _max_retries: int) -> Dict[str, Any]:
    return {
        "ok": False,
        "ir_bundle": None,
        "attempts": [],
        "issues": [
            {
                "message": "Live AI retry measurement disabled (use --live and OPENAI_API_KEY).",
            }
        ],
        "code": PX_AI_NO_KEY,
    }


def _metrics_from_suggest_result(res: Dict[str, Any], *, max_retries: int) -> Dict[str, Any]:
    attempts = list(res.get("attempts") or [])
    api_rounds = len(attempts)
    retries_after_first = max(0, api_rounds - 1) if api_rounds else 0
    ok = bool(res.get("ok"))
    code = res.get("code")
    return {
        "success": ok,
        "failure_code": None if ok else code,
        "api_rounds": api_rounds,
        "retries_after_first": retries_after_first,
        "max_retries_configured": max_retries,
        "max_model_rounds": max_retries + 1,
    }


def run_retry_stats(
    repo_root: Path,
    *,
    max_retries: int = 3,
    live: bool = False,
    suggest_fn: Optional[SUGGEST_WRAPPER] = None,
) -> Dict[str, Any]:
    """
    ``suggest_fn(prompt, max_retries) -> dict`` like ``suggest_ir_bundle_from_prompt`` output.
    If omitted and ``live`` is True with ``OPENAI_API_KEY`` set, uses the real adapter.
    """
    root = repo_root.resolve()
    bench_root = root / "examples" / "benchmarks"
    task_dirs = discover_benchmark_task_dirs(bench_root)

    key_ok = bool(os.environ.get("OPENAI_API_KEY", "").strip())
    effective_live = bool(live and key_ok)

    if suggest_fn is not None:
        fn: SUGGEST_WRAPPER = suggest_fn
        mode = "custom_suggest_fn"
        measured = True
    elif effective_live:
        from src.ai.adapter import suggest_ir_bundle_from_prompt

        def fn(p: str, mr: int) -> Dict[str, Any]:
            return suggest_ir_bundle_from_prompt(p, max_retries=mr)

        mode = "live_openai"
        measured = True
    else:
        fn = _skip_suggest
        mode = "skipped_no_live_or_no_api_key"
        measured = False

    rows: List[Dict[str, Any]] = []
    successes = 0
    failures = 0
    retries_success: List[int] = []
    rounds_success: List[int] = []

    for td in task_dirs:
        task_id = td.name
        task_path = td / "TASK.md"
        prompt_full = task_path.read_text(encoding="utf-8") if task_path.is_file() else ""
        nl = extract_benchmark_nl_prompt(prompt_full)

        res = fn(nl, max_retries)
        m = _metrics_from_suggest_result(res, max_retries=max_retries)

        row: Dict[str, Any] = {
            "task_id": task_id,
            "path": str(task_path.relative_to(root)).replace("\\", "/"),
            "live_measured": measured,
            "measurement_mode": mode,
            "prompt_char_count": len(nl),
            "max_retries_configured": m["max_retries_configured"],
            "max_model_rounds": m["max_model_rounds"],
        }
        if measured:
            row["success"] = m["success"]
            row["failure_code"] = m["failure_code"]
            row["api_rounds"] = m["api_rounds"]
            row["retries_after_first"] = m["retries_after_first"]
            if m["success"]:
                successes += 1
                retries_success.append(m["retries_after_first"])
                rounds_success.append(m["api_rounds"])
            else:
                failures += 1
        else:
            row["success"] = None
            row["failure_code"] = None
            row["api_rounds"] = None
            row["retries_after_first"] = None

        rows.append(row)

    n_m = successes + failures
    summary: Dict[str, Any] = {
        "tasks_total": len(rows),
        "tasks_live_measured": n_m if measured else 0,
        "success_count": successes if measured else 0,
        "failure_count": failures if measured else 0,
        "failure_rate": round(failures / max(1, n_m), 6) if measured and n_m else None,
        "mean_retries_after_first_on_success": round(
            sum(retries_success) / max(1, len(retries_success)), 6
        )
        if measured and retries_success
        else None,
        "mean_api_rounds_on_success": round(
            sum(rounds_success) / max(1, len(rounds_success)), 6
        )
        if measured and rounds_success
        else None,
        "max_retries_configured": max_retries,
        "measurement_mode": mode,
        "live_flag_requested": bool(live),
        "openai_api_key_present": key_ok,
    }

    return {
        "schema_version": REPORT_SCHEMA_VERSION,
        "report_id": REPORT_ID,
        "summary": summary,
        "tasks": rows,
    }


def retry_stats_to_canonical_json(report: Dict[str, Any]) -> str:
    return json.dumps(report, sort_keys=True, indent=2, ensure_ascii=False) + "\n"


def write_retry_stats_report(
    repo_root: Path,
    out_path: Path,
    *,
    max_retries: int = 3,
    live: bool = False,
    suggest_fn: Optional[SUGGEST_WRAPPER] = None,
) -> Dict[str, Any]:
    report = run_retry_stats(
        repo_root, max_retries=max_retries, live=live, suggest_fn=suggest_fn
    )
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(retry_stats_to_canonical_json(report), encoding="utf-8")
    return report
