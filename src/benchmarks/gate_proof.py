"""
P33: run manifest-driven gate proof cases; summarize accepted vs rejected by stage.

Invalid bundles never reach ``project_stage`` when ``validate_stage`` fails (see ``materialize_project``).
Malformed ``.tq`` never produces a bundle for validation.
"""

from __future__ import annotations

import json
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional


@dataclass
class GateCaseResult:
    case_id: str
    path: str
    expect_accepted: bool
    expect_reject_at: Optional[str]
    outcome_accepted: bool
    reject_stage: Optional[str]
    parse_stage_ok: Optional[bool]
    validate_stage_ok: Optional[bool]
    project_stage_ok: Optional[bool]
    mismatch: bool
    detail: str


def _load_manifest(manifest_path: Path) -> Dict[str, Any]:
    return json.loads(manifest_path.read_text(encoding="utf-8"))


def run_gate_proof_for_path(
    source_path: Path,
    *,
    run_project: bool = True,
) -> GateCaseResult:
    """Classify a single source file (.tq or .json bundle)."""
    from src.project_materialize import materialize_project, parse_stage, validate_stage

    source_path = source_path.resolve()
    case_id = source_path.name
    expect_accepted = True
    expect_reject_at: Optional[str] = None

    parse_ok: Optional[bool] = None
    validate_ok: Optional[bool] = None
    project_ok: Optional[bool] = None
    reject_stage: Optional[str] = None
    detail = ""

    if source_path.suffix.lower() == ".tq":
        bundle, perr, _pinfo = parse_stage(source_path)
        parse_ok = perr is None
        if perr is not None:
            reject_stage = "parse"
            detail = str(perr)
            accepted = False
            return GateCaseResult(
                case_id,
                str(source_path),
                expect_accepted,
                expect_reject_at,
                accepted,
                reject_stage,
                parse_ok,
                None,
                None,
                False,
                detail,
            )
        assert bundle is not None
    else:
        parse_ok = True
        try:
            bundle = json.loads(source_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as ex:
            reject_stage = "parse"
            detail = str(ex)
            return GateCaseResult(
                case_id,
                str(source_path),
                expect_accepted,
                expect_reject_at,
                False,
                "parse",
                False,
                None,
                None,
                False,
                detail,
            )

    trace: List[Dict[str, Any]] = []
    vr = validate_stage(bundle, pipeline_trace=trace)
    validate_ok = vr.ok
    if not vr.ok:
        reject_stage = "validate"
        errs = vr.failure_payload.get("errors") if vr.failure_payload else []
        detail = "; ".join(str(e) for e in (errs or [])[:3])
        accepted = False
        return GateCaseResult(
            case_id,
            str(source_path),
            expect_accepted,
            expect_reject_at,
            accepted,
            reject_stage,
            parse_ok,
            validate_ok,
            None,
            False,
            detail,
        )

    if not run_project:
        accepted = True
        return GateCaseResult(
            case_id,
            str(source_path),
            expect_accepted,
            expect_reject_at,
            accepted,
            None,
            parse_ok,
            validate_ok,
            None,
            False,
            "",
        )

    with tempfile.TemporaryDirectory() as td:
        ok, summary, written = materialize_project(bundle, Path(td), pipeline_trace=trace)
        project_ok = ok
        if not ok:
            reject_stage = "project"
            ce = summary.get("consistency_errors") or summary.get("errors") or []
            detail = "; ".join(str(e) for e in ce[:3])
            accepted = False
        else:
            accepted = True
            detail = f"written_files={len(written)}"

    return GateCaseResult(
        case_id,
        str(source_path),
        expect_accepted,
        expect_reject_at,
        accepted,
        reject_stage,
        parse_ok,
        validate_ok,
        project_ok,
        False,
        detail,
    )


def run_gate_proof_manifest(
    manifest_path: Path,
    *,
    run_project: bool = True,
) -> Dict[str, Any]:
    """Run all cases in ``manifest.json``; return summary + rows."""
    base = manifest_path.parent.resolve()
    man = _load_manifest(manifest_path)
    cases = man.get("cases") or []
    rows: List[Dict[str, Any]] = []
    accepted_n = 0
    rejected_n = 0
    by_stage: Dict[str, int] = {"parse": 0, "validate": 0, "project": 0, "accepted": 0}
    mismatches = 0

    for c in cases:
        cid = str(c.get("id", ""))
        rel = str(c.get("path", ""))
        expect_acc = bool(c.get("expect_accepted", False))
        expect_stage = c.get("reject_at")

        src = (base / rel).resolve()
        r = run_gate_proof_for_path(src, run_project=run_project)
        r.case_id = cid
        r.expect_accepted = expect_acc
        r.expect_reject_at = expect_stage
        r.mismatch = (expect_acc != r.outcome_accepted) or (
            not expect_acc
            and expect_stage is not None
            and r.reject_stage is not None
            and expect_stage != r.reject_stage
        )

        if r.outcome_accepted:
            accepted_n += 1
            by_stage["accepted"] += 1
        else:
            rejected_n += 1
            if r.reject_stage in by_stage:
                by_stage[r.reject_stage] += 1
        if r.mismatch:
            mismatches += 1

        rows.append(
            {
                "id": cid,
                "path": rel,
                "expect_accepted": expect_acc,
                "expect_reject_at": expect_stage,
                "outcome_accepted": r.outcome_accepted,
                "reject_stage": r.reject_stage,
                "parse_ok": r.parse_stage_ok,
                "validate_ok": r.validate_stage_ok,
                "project_ok": r.project_stage_ok,
                "mismatch": r.mismatch,
                "detail": r.detail[:500],
            }
        )

    return {
        "schema_version": 1,
        "manifest_path": str(manifest_path).replace("\\", "/"),
        "summary": {
            "total": len(rows),
            "accepted": accepted_n,
            "rejected": rejected_n,
            "rejections_by_stage": {k: v for k, v in by_stage.items() if k != "accepted"},
            "mismatch_with_expectation": mismatches,
        },
        "cases": rows,
    }


def gate_proof_report_to_json(report: Dict[str, Any]) -> str:
    return json.dumps(report, indent=2, sort_keys=True, ensure_ascii=False) + "\n"
