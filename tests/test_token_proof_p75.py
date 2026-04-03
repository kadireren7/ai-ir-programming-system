"""P75 token proof: deterministic report and real validation (no fake metrics)."""

from __future__ import annotations

import json
from pathlib import Path

from src.benchmarks.token_proof import build_token_proof_report, report_to_canonical_json

REPO = Path(__file__).resolve().parents[1]


def test_token_proof_all_scenarios_pass_and_stable_json():
    r1 = build_token_proof_report(REPO)
    r2 = build_token_proof_report(REPO)
    assert r1 == r2
    assert r1["schema_version"] == 1
    assert r1["estimator_id"] == "utf8_bytes_div_4_v1"
    summ = r1["summary"]
    assert summ["scenario_count"] == 5
    assert summ["failed_count"] == 0
    assert summ["passed_count"] == 5
    for row in r1["scenarios"]:
        assert row["ok"] is True
        assert row["compression_ratio_prompt_per_torqa"] >= 1.0
        tc = row["token_counts"]
        assert tc["prompt_tokens"] > tc["torqa_tokens"]
        assert tc["ir_tokens"] > 0


def test_token_proof_json_roundtrip(tmp_path: Path):
    report = build_token_proof_report(REPO)
    p = tmp_path / "out.json"
    p.write_text(report_to_canonical_json(report), encoding="utf-8")
    again = json.loads(p.read_text(encoding="utf-8"))
    assert again == report


def test_token_proof_cli_writes_files(tmp_path: Path):
    from src.benchmarks.token_proof_cli import main

    j = tmp_path / "token_proof.json"
    m = tmp_path / "TOKEN_PROOF.md"
    code = main(["--repo-root", str(REPO), "--json-out", str(j), "--md-out", str(m)])
    assert code == 0
    data = json.loads(j.read_text(encoding="utf-8"))
    assert data["summary"]["passed_count"] == 5
    assert "Per-scenario" in m.read_text(encoding="utf-8")
