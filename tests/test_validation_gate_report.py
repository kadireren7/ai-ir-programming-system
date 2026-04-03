"""Validation stress suite → reports/validation_gate.json."""

from __future__ import annotations

import json
from pathlib import Path

from src.benchmarks.validation_gate_report import (
    REPORT_ID,
    run_validation_gate_report,
    validation_gate_to_canonical_json,
    write_validation_gate_report,
)

REPO = Path(__file__).resolve().parents[1]


def test_validation_gate_report_shape_and_success() -> None:
    r = run_validation_gate_report(REPO)
    assert r["report_id"] == REPORT_ID
    assert r["schema_version"] == 1
    s = r["summary"]
    assert s["total_cases"] == 11
    assert s["expectation_mismatches"] == 0
    assert s["all_expectations_met"] is True
    assert s["pipeline_guarantees"]["all_parse_stopped"] is True
    assert s["pipeline_guarantees"]["all_validate_blocked_successful_project"] is True
    for row in r["cases"]:
        assert row["parse_failure_stopped_pipeline"] is True
        assert row["validate_failure_no_successful_project"] is True
        if not row["outcome_accepted"]:
            assert row["expect_reject_at"] == row["reject_stage"]
    j1 = validation_gate_to_canonical_json(r)
    j2 = validation_gate_to_canonical_json(run_validation_gate_report(REPO))
    assert j1 == j2


def test_committed_validation_gate_json_matches_generator() -> None:
    path = REPO / "reports" / "validation_gate.json"
    assert path.is_file()
    on_disk = json.loads(path.read_text(encoding="utf-8"))
    live = run_validation_gate_report(REPO)
    assert on_disk == live


def test_write_roundtrip(tmp_path: Path) -> None:
    out = tmp_path / "validation_gate.json"
    write_validation_gate_report(REPO, out)
    data = json.loads(out.read_text(encoding="utf-8"))
    assert data["summary"]["total_cases"] == 11
