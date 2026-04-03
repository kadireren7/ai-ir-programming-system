"""AI retry stats report (benchmark tasks)."""

from __future__ import annotations

import json
from pathlib import Path

from src.benchmarks.retry_stats_report import (
    REPORT_ID,
    extract_benchmark_nl_prompt,
    retry_stats_to_canonical_json,
    run_retry_stats,
    write_retry_stats_report,
)

REPO = Path(__file__).resolve().parents[1]


def test_extract_nl_section() -> None:
    md = "# T\n\n## Natural language description\n\nHello world.\n\n## Other\n\nX"
    assert "Hello world" in extract_benchmark_nl_prompt(md)
    assert "Other" not in extract_benchmark_nl_prompt(md)


def test_placeholder_report_deterministic() -> None:
    r1 = run_retry_stats(REPO, live=False)
    r2 = run_retry_stats(REPO, live=False)
    assert r1 == r2
    assert r1["report_id"] == REPORT_ID
    assert r1["summary"]["tasks_live_measured"] == 0
    assert r1["summary"]["failure_rate"] is None
    for t in r1["tasks"]:
        assert t["live_measured"] is False
        assert t["success"] is None
        assert t["api_rounds"] is None
    assert retry_stats_to_canonical_json(r1) == retry_stats_to_canonical_json(r2)


def test_mock_suggest_aggregates_retries_and_failure_rate() -> None:
    calls: list[str] = []

    def fake_suggest(prompt: str, max_retries: int) -> dict:
        calls.append(prompt[:40])
        if "expense" in prompt.lower() and "approver" in prompt.lower():
            return {
                "ok": False,
                "attempts": [{"attempt": i, "fail": True} for i in range(max_retries + 1)],
                "code": "PX_AI_MAX_RETRIES",
                "issues": [],
            }
        return {
            "ok": True,
            "attempts": [{"attempt": 0, "x": 1}, {"attempt": 1, "status": "ok"}],
            "ir_bundle": {"ir_goal": {}},
            "issues": [],
        }

    r = run_retry_stats(REPO, max_retries=3, suggest_fn=fake_suggest)
    assert r["summary"]["tasks_live_measured"] == 7
    assert r["summary"]["success_count"] == 6
    assert r["summary"]["failure_count"] == 1
    assert r["summary"]["failure_rate"] == round(1 / 7, 6)
    assert r["summary"]["mean_retries_after_first_on_success"] == 1.0
    for t in r["tasks"]:
        assert t["live_measured"] is True
        if t["task_id"] == "approval_workflow":
            assert t["success"] is False
            assert t["api_rounds"] == 4
            assert t["retries_after_first"] == 3
        else:
            assert t["success"] is True
            assert t["retries_after_first"] == 1


def test_committed_retry_stats_matches_generator() -> None:
    path = REPO / "reports" / "retry_stats.json"
    assert path.is_file()
    on_disk = json.loads(path.read_text(encoding="utf-8"))
    live = run_retry_stats(REPO, live=False)
    # OPENAI_API_KEY may be set in the developer environment; committed file is usually false.
    on_disk["summary"]["openai_api_key_present"] = live["summary"]["openai_api_key_present"]
    assert on_disk == live


def test_write_roundtrip(tmp_path: Path) -> None:
    out = tmp_path / "retry_stats.json"
    write_retry_stats_report(REPO, out, live=False)
    assert json.loads(out.read_text(encoding="utf-8"))["summary"]["tasks_total"] == 7
