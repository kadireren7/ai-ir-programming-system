"""failure_types.json report."""

from __future__ import annotations

import json
from pathlib import Path

from src.benchmarks.failure_types_report import (
    REPORT_ID,
    analyze_source_path,
    failure_types_to_canonical_json,
    run_failure_types_report,
    write_failure_types_report,
)
from src.diagnostics.failure_buckets import BUCKET_SEMANTIC, BUCKET_STRUCTURE, BUCKET_SYNTAX

REPO = Path(__file__).resolve().parents[1]


def test_analyze_stress_fixtures() -> None:
    p = REPO / "examples" / "validation_stress" / "cases" / "malformed_garbage.tq"
    a = analyze_source_path(p)
    assert a["reject_stage"] == "parse"
    assert a["failure_bucket"] == BUCKET_SYNTAX

    p2 = REPO / "examples" / "validation_stress" / "cases" / "semantic_unknown_effect.json"
    a2 = analyze_source_path(p2)
    assert a2["reject_stage"] == "validate"
    assert a2["failure_bucket"] == BUCKET_SEMANTIC

    p3 = REPO / "examples" / "validation_stress" / "cases" / "control_valid.tq"
    a3 = analyze_source_path(p3)
    assert a3["failure_bucket"] is None
    assert a3["reject_stage"] is None


def test_report_deterministic() -> None:
    r1 = run_failure_types_report(REPO)
    r2 = run_failure_types_report(REPO)
    assert r1 == r2
    assert r1["report_id"] == REPORT_ID
    assert failure_types_to_canonical_json(r1) == failure_types_to_canonical_json(r2)


def test_committed_failure_types_matches_generator() -> None:
    path = REPO / "reports" / "failure_types.json"
    assert path.is_file()
    on_disk = json.loads(path.read_text(encoding="utf-8"))
    live = run_failure_types_report(REPO)
    assert on_disk == live


def test_write_roundtrip(tmp_path: Path) -> None:
    out = tmp_path / "failure_types.json"
    write_failure_types_report(REPO, out)
    data = json.loads(out.read_text(encoding="utf-8"))
    assert data["summary"]["sources_total"] >= 1
