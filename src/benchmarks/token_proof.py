"""
P75 — reproducible token comparison: NL task + baseline code vs .tq (and IR).

Uses the same estimator as ``token_estimate`` / ``token_measurement``. No fabricated numbers:
failed validation surfaces are reported with ``ok: false`` and excluded from aggregate averages.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from src.benchmarks.token_estimate import ESTIMATOR_ID, ESTIMATOR_METHOD_EN, estimate_tokens
from src.benchmarks.token_measurement import canonical_ir_goal_json
from src.diagnostics.report import build_full_diagnostic_report
from src.ir.canonical_ir import ir_goal_from_json
from src.surface.parse_tq import TQParseError, parse_tq_source


def _round_ratio(num: float) -> float:
    return round(float(num), 6)


def _load_manifest(repo_root: Path) -> Dict[str, Any]:
    p = repo_root / "examples" / "benchmarks" / "token_proof" / "manifest.json"
    return json.loads(p.read_text(encoding="utf-8"))


def measure_scenario(repo_root: Path, scenario: Dict[str, Any]) -> Dict[str, Any]:
    """
    Returns one scenario record: metrics when validation ok, else errors and null metric fields.
    """
    sid = str(scenario["id"])
    rel_dir = str(scenario["relative_dir"])
    category = str(scenario.get("category", sid))
    base = (repo_root / rel_dir).resolve()
    task_path = base / "TASK.md"
    baseline_path = base / "BASELINE_CODE.txt"
    tq_path = base / "app.tq"

    out: Dict[str, Any] = {
        "id": sid,
        "category": category,
        "relative_dir": rel_dir.replace("\\", "/"),
        "ok": False,
        "errors": [],
    }

    missing = [str(p.relative_to(repo_root)) for p in (task_path, baseline_path, tq_path) if not p.is_file()]
    if missing:
        out["errors"] = [f"missing files: {', '.join(missing)}"]
        return out

    prompt_text = task_path.read_text(encoding="utf-8")
    baseline_code_text = baseline_path.read_text(encoding="utf-8")
    tq_text = tq_path.read_text(encoding="utf-8")

    prompt_tokens = estimate_tokens(prompt_text)
    baseline_code_tokens = estimate_tokens(baseline_code_text)
    torqa_tokens = estimate_tokens(tq_text)

    out["sources"] = {
        "task_md": str(task_path.relative_to(repo_root)).replace("\\", "/"),
        "baseline_code": str(baseline_path.relative_to(repo_root)).replace("\\", "/"),
        "app_tq": str(tq_path.relative_to(repo_root)).replace("\\", "/"),
    }
    out["token_counts"] = {
        "prompt_tokens": prompt_tokens,
        "baseline_code_tokens": baseline_code_tokens,
        "torqa_tokens": torqa_tokens,
        "combined_nl_and_code_tokens": prompt_tokens + baseline_code_tokens,
    }

    try:
        bundle = parse_tq_source(tq_text, tq_path=tq_path)
    except TQParseError as ex:
        out["errors"] = [f"TQParseError: {ex.code}: {ex}"]
        out["token_counts"]["ir_tokens"] = None
        out["compression_ratio_prompt_per_torqa"] = None
        return out

    ir_goal = bundle.get("ir_goal")
    if not isinstance(ir_goal, dict):
        out["errors"] = ["bundle missing ir_goal dict"]
        out["token_counts"]["ir_tokens"] = None
        out["compression_ratio_prompt_per_torqa"] = None
        return out

    ir_json = canonical_ir_goal_json(ir_goal)
    ir_tokens = estimate_tokens(ir_json)
    out["token_counts"]["ir_tokens"] = ir_tokens

    try:
        g = ir_goal_from_json(bundle)
        rep = build_full_diagnostic_report(g)
    except Exception as ex:  # noqa: BLE001 — surface unexpected shape as failure
        out["errors"] = [f"ir/diagnostics: {ex}"]
        out["compression_ratio_prompt_per_torqa"] = None
        return out

    if not rep.get("ok", False):
        issues = rep.get("issues") or []
        msgs = [str(i.get("message", i)) for i in issues[:12]]
        out["errors"] = msgs if msgs else ["diagnostics not ok"]
        out["compression_ratio_prompt_per_torqa"] = None
        return out

    out["ok"] = True
    out["compression_ratio_prompt_per_torqa"] = _round_ratio(prompt_tokens / max(1, torqa_tokens))
    out["compression_ratio_combined_per_torqa"] = _round_ratio(
        (prompt_tokens + baseline_code_tokens) / max(1, torqa_tokens),
    )
    out["ir_to_torqa_ratio"] = _round_ratio(ir_tokens / max(1, torqa_tokens))
    return out


def build_token_proof_report(repo_root: Path) -> Dict[str, Any]:
    repo_root = repo_root.resolve()
    manifest = _load_manifest(repo_root)
    scenarios_in = list(manifest.get("scenarios") or [])
    rows: List[Dict[str, Any]] = []
    for sc in scenarios_in:
        rows.append(measure_scenario(repo_root, sc))

    ok_rows = [r for r in rows if r.get("ok")]
    fail_rows = [r for r in rows if not r.get("ok")]

    avg_prompt_per_tq: Optional[float] = None
    avg_combined_per_tq: Optional[float] = None
    avg_reduction_pct: Optional[float] = None
    if ok_rows:
        ratios = [float(r["compression_ratio_prompt_per_torqa"]) for r in ok_rows]
        avg_prompt_per_tq = _round_ratio(sum(ratios) / len(ratios))
        comb = [float(r["compression_ratio_combined_per_torqa"]) for r in ok_rows]
        avg_combined_per_tq = _round_ratio(sum(comb) / len(comb))
        # "Reduction": (torqa - prompt) / prompt is negative when torqa smaller; report (1 - torqa/prompt) as NL→TQ savings
        savings = []
        for r in ok_rows:
            tc = r["token_counts"]
            pt = int(tc["prompt_tokens"])
            tt = int(tc["torqa_tokens"])
            if pt > 0:
                savings.append((pt - tt) / pt)
        if savings:
            avg_reduction_pct = _round_ratio(100.0 * (sum(savings) / len(savings)))

    return {
        "schema_version": 1,
        "estimator_id": ESTIMATOR_ID,
        "estimator_method_en": ESTIMATOR_METHOD_EN,
        "manifest_relative": "examples/benchmarks/token_proof/manifest.json",
        "scenarios": rows,
        "summary": {
            "scenario_count": len(rows),
            "passed_count": len(ok_rows),
            "failed_count": len(fail_rows),
            "average_compression_ratio_prompt_per_torqa": avg_prompt_per_tq,
            "average_compression_ratio_combined_nl_code_per_torqa": avg_combined_per_tq,
            "average_prompt_token_reduction_percent_vs_torqa": avg_reduction_pct,
        },
        "notes": [
            "compression_ratio_prompt_per_torqa = prompt_tokens / max(1, torqa_tokens).",
            "compression_ratio_combined_per_torqa = (prompt_tokens + baseline_code_tokens) / max(1, torqa_tokens).",
            "average_prompt_token_reduction_percent_vs_torqa = mean over passing scenarios of (prompt_tokens - torqa_tokens) / prompt_tokens * 100.",
            "baseline_code_tokens: fixed BASELINE_CODE.txt per scenario (approximate non-TORQA implementation).",
            "ir_to_torqa_ratio > 1 means canonical IR JSON is larger than the .tq surface (expected); NL→TQ compression is the headline claim.",
            "Failed scenarios are listed with errors; they are excluded from summary averages.",
        ],
    }


def report_to_canonical_json(report: Dict[str, Any]) -> str:
    return json.dumps(report, sort_keys=True, indent=2, ensure_ascii=False) + "\n"


def render_token_proof_markdown(report: Dict[str, Any]) -> str:
    lines: List[str] = []
    lines.append("# TORQA token proof (P75)")
    lines.append("")
    lines.append("Reproducible comparison of **natural-language task specs** and **fixed baseline code stubs** ")
    lines.append("against **`.tq` surfaces** using the repository estimator (see `docs/BENCHMARK_COMPRESSION.md`).")
    lines.append("")
    lines.append(f"- **Estimator:** `{report.get('estimator_id')}`")
    lines.append(f"- **Method:** {report.get('estimator_method_en', '')}")
    lines.append("")
    lines.append("## Regenerate")
    lines.append("")
    lines.append("```bash")
    lines.append("torqa-token-proof")
    lines.append("# or: python -m src.benchmarks.token_proof_cli")
    lines.append("```")
    lines.append("")
    summ = report.get("summary") or {}
    lines.append("## Summary")
    lines.append("")
    lines.append(f"| Metric | Value |")
    lines.append(f"|--------|-------|")
    lines.append(f"| Scenarios | {summ.get('scenario_count')} |")
    lines.append(f"| Passed validation | {summ.get('passed_count')} |")
    lines.append(f"| Failed | {summ.get('failed_count')} |")
    lines.append(f"| Avg prompt ÷ TORQA tokens | {summ.get('average_compression_ratio_prompt_per_torqa')} |")
    lines.append(f"| Avg (prompt + baseline code) ÷ TORQA | {summ.get('average_compression_ratio_combined_nl_code_per_torqa')} |")
    lines.append(f"| Avg prompt-token reduction % vs `.tq` | {summ.get('average_prompt_token_reduction_percent_vs_torqa')} |")
    lines.append("")
    lines.append("## Per-scenario")
    lines.append("")
    lines.append("| ID | Category | OK | prompt | baseline code | `.tq` | IR | prompt÷TQ | (prompt+code)÷TQ |")
    lines.append("|----|----------|----|--------|---------------|-------|----|----------|----------------|")
    for r in report.get("scenarios") or []:
        tc = r.get("token_counts") or {}
        ir_t = tc.get("ir_tokens")
        ir_s = "" if ir_t is None else str(ir_t)
        ok = "yes" if r.get("ok") else "no"
        pr = tc.get("prompt_tokens", "")
        bc = tc.get("baseline_code_tokens", "")
        tq = tc.get("torqa_tokens", "")
        c1 = r.get("compression_ratio_prompt_per_torqa", "")
        c2 = r.get("compression_ratio_combined_per_torqa", "")
        lines.append(
            f"| {r.get('id')} | {r.get('category')} | {ok} | {pr} | {bc} | {tq} | {ir_s} | {c1} | {c2} |",
        )
    lines.append("")
    fails = [r for r in (report.get("scenarios") or []) if not r.get("ok")]
    if fails:
        lines.append("## Failures")
        lines.append("")
        for r in fails:
            lines.append(f"### `{r.get('id')}`")
            lines.append("")
            for e in r.get("errors") or []:
                lines.append(f"- {e}")
            lines.append("")
    lines.append("## Notes")
    lines.append("")
    for n in report.get("notes") or []:
        lines.append(f"- {n}")
    lines.append("")
    lines.append("## Machine-readable report")
    lines.append("")
    lines.append("See `reports/token_proof.json`.")
    lines.append("")
    return "\n".join(lines)
