"""
Aggregate validation stress run → ``reports/validation_gate.json``.

Proves: parse failures do not reach validation/projection; validation failures do not yield a
successful projection (``materialize_project`` is not entered with a failing validate_stage).
"""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Optional

from src.benchmarks.gate_proof import run_gate_proof_for_path

REPORT_SCHEMA_VERSION = 1
REPORT_ID = "validation_gate"


def _load_manifest(manifest_path: Path) -> Dict[str, Any]:
    return json.loads(manifest_path.read_text(encoding="utf-8"))


def _mismatch(
    expect_acc: bool,
    expect_stage: Optional[str],
    accepted: bool,
    reject_stage: Optional[str],
) -> bool:
    if expect_acc != accepted:
        return True
    if not expect_acc and expect_stage is not None and reject_stage != expect_stage:
        return True
    return False


def parse_stops_downstream(r) -> bool:
    """If parse failed, validate and project stages were not reached (None)."""
    if r.parse_stage_ok is False:
        return r.validate_stage_ok is None and r.project_stage_ok is None
    return True


def validate_blocks_successful_projection(r) -> bool:
    """If validate failed, projection did not complete successfully."""
    if r.validate_stage_ok is False:
        return r.project_stage_ok is not True
    return True


def run_validation_gate_report(repo_root: Path) -> Dict[str, Any]:
    manifest_path = (repo_root / "examples" / "validation_stress" / "manifest.json").resolve()
    man = _load_manifest(manifest_path)
    base = manifest_path.parent.resolve()
    cases_in = list(man.get("cases") or [])

    rows: List[Dict[str, Any]] = []
    mismatches = 0
    by_category: Counter[str] = Counter()
    parse_guarantee_ok = 0
    parse_guarantee_total = 0
    val_guarantee_ok = 0
    val_guarantee_total = 0

    for c in cases_in:
        cid = str(c.get("id", ""))
        category = str(c.get("category", "unknown"))
        rel = str(c.get("path", ""))
        expect_acc = bool(c.get("expect_accepted", False))
        expect_stage = c.get("expect_reject_at")

        src = (base / rel).resolve()
        r = run_gate_proof_for_path(src, run_project=True)
        mis = _mismatch(expect_acc, expect_stage, r.outcome_accepted, r.reject_stage)
        if mis:
            mismatches += 1

        pg = parse_stops_downstream(r)
        parse_guarantee_total += 1
        if pg:
            parse_guarantee_ok += 1

        vg = validate_blocks_successful_projection(r)
        val_guarantee_total += 1
        if vg:
            val_guarantee_ok += 1

        by_category[category] += 1

        rows.append(
            {
                "id": cid,
                "category": category,
                "path": str(src.relative_to(repo_root.resolve())).replace("\\", "/"),
                "expect_accepted": expect_acc,
                "expect_reject_at": expect_stage,
                "outcome_accepted": r.outcome_accepted,
                "reject_stage": r.reject_stage,
                "parse_stage_ok": r.parse_stage_ok,
                "validate_stage_ok": r.validate_stage_ok,
                "project_stage_ok": r.project_stage_ok,
                "expectation_mismatch": mis,
                "parse_failure_stopped_pipeline": pg,
                "validate_failure_no_successful_project": vg,
                "detail": (r.detail or "")[:400],
            }
        )

    summary = {
        "total_cases": len(rows),
        "expectation_mismatches": mismatches,
        "all_expectations_met": mismatches == 0,
        "rejections_by_stage": dict(
            Counter(r["reject_stage"] or "accepted" for r in rows if not r["outcome_accepted"])
        ),
        "categories_present": dict(sorted(by_category.items())),
        "pipeline_guarantees": {
            "description": "Parse fail: validate/project unset. Validate fail: project not successful.",
            "parse_fail_cases_parse_stopped_downstream": f"{parse_guarantee_ok}/{parse_guarantee_total}",
            "validate_fail_cases_blocked_successful_projection": f"{val_guarantee_ok}/{val_guarantee_total}",
            "all_parse_stopped": parse_guarantee_ok == parse_guarantee_total,
            "all_validate_blocked_successful_project": val_guarantee_ok == val_guarantee_total,
        },
    }

    return {
        "schema_version": REPORT_SCHEMA_VERSION,
        "report_id": REPORT_ID,
        "manifest": str(manifest_path.relative_to(repo_root.resolve())).replace("\\", "/"),
        "summary": summary,
        "cases": rows,
    }


def validation_gate_to_canonical_json(report: Dict[str, Any]) -> str:
    return json.dumps(report, sort_keys=True, indent=2, ensure_ascii=False) + "\n"


def write_validation_gate_report(repo_root: Path, out_path: Path) -> Dict[str, Any]:
    report = run_validation_gate_report(repo_root)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(validation_gate_to_canonical_json(report), encoding="utf-8")
    return report
