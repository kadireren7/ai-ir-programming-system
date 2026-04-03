"""Initial benchmark comparison report (examples/benchmarks TASK.md + app.tq)."""

from __future__ import annotations

import json
from pathlib import Path

from src.benchmarks.benchmark_initial import (
    REPORT_ID,
    benchmark_initial_to_canonical_json,
    discover_benchmark_task_dirs,
    run_benchmark_initial,
    write_benchmark_initial_report,
)

REPO = Path(__file__).resolve().parents[1]


def test_discover_benchmark_tasks() -> None:
    root = REPO / "examples" / "benchmarks"
    dirs = discover_benchmark_task_dirs(root)
    assert len(dirs) == 7
    names = {d.name for d in dirs}
    assert names == {
        "approval_workflow",
        "conditional_logic_flow",
        "data_transform_pipeline",
        "multi_step_automation",
        "simple_form_flow",
        "workflow_customer_onboarding",
        "workflow_document_approval",
    }


def test_run_benchmark_initial_all_success_deterministic() -> None:
    r1 = run_benchmark_initial(REPO)
    r2 = run_benchmark_initial(REPO)
    assert r1 == r2
    assert r1["report_id"] == REPORT_ID
    assert r1["schema_version"] == 1
    assert r1["summary"]["task_count"] == 7
    assert r1["summary"]["torqa_validation_success_count"] == 7
    assert r1["summary"]["torqa_validation_failure_count"] == 0
    assert r1["summary"]["mean_ir_structural_element_total"] is not None
    for t in r1["tasks"]:
        assert t["success"] is True
        m = t["metrics"]
        assert m["semantic_compression_nl_task_vs_torqa_surface"] == round(
            m["prompt_tokens"] / max(1, m["torqa_tokens"]), 6
        )
        assert m["ir_to_torqa_ratio"] == round(m["ir_tokens"] / max(1, m["torqa_tokens"]), 6)
        cx = m["complexity"]
        assert cx["ir_structural_element_total"] == (
            cx["ir_input_count"]
            + cx["ir_precondition_count"]
            + cx["ir_forbid_count"]
            + cx["ir_transition_count"]
            + cx["ir_postcondition_count"]
        )
        assert t["retries"]["ai_suggest_attempts"] == 0
    # canonical JSON stable
    j1 = benchmark_initial_to_canonical_json(r1)
    j2 = benchmark_initial_to_canonical_json(r2)
    assert j1 == j2


def test_write_report_roundtrip(tmp_path: Path) -> None:
    out = tmp_path / "benchmark_initial.json"
    write_benchmark_initial_report(REPO, out)
    data = json.loads(out.read_text(encoding="utf-8"))
    assert data["summary"]["task_count"] == 7


def test_committed_report_matches_generator() -> None:
    path = REPO / "reports" / "benchmark_initial.json"
    assert path.is_file()
    on_disk = json.loads(path.read_text(encoding="utf-8"))
    live = run_benchmark_initial(REPO)
    assert on_disk == live
