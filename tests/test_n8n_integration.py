"""n8n export adapter: parse, IR bundle, CLI load path."""

from __future__ import annotations

import json
from pathlib import Path

from torqa.integrations.n8n.analysis import analyze_n8n_workflow
from torqa.integrations.n8n.convert import n8n_export_to_bundle, n8n_workflow_to_bundle
from torqa.integrations.n8n.parser import parse_n8n_export
from torqa.ir.canonical_ir import ir_goal_from_json, validate_ir
from torqa.semantics.ir_semantics import build_ir_semantic_report, default_ir_function_registry
from torqa.cli.io import load_input

REPO = Path(__file__).resolve().parents[1]
FIX = REPO / "tests" / "fixtures" / "n8n"


def test_parse_minimal_fixture():
    raw = json.loads((FIX / "minimal_chain.json").read_text(encoding="utf-8"))
    wf, err = parse_n8n_export(raw)
    assert err is None and wf is not None
    assert wf.name == "Minimal chain"
    assert len(wf.nodes) == 2


def test_n8n_to_bundle_semantics_pass():
    raw = json.loads((FIX / "minimal_chain.json").read_text(encoding="utf-8"))
    wf, _ = parse_n8n_export(raw)
    assert wf is not None
    bundle = n8n_workflow_to_bundle(wf)
    goal = ir_goal_from_json(bundle)
    assert validate_ir(goal) == []
    sem = build_ir_semantic_report(goal, default_ir_function_registry())
    assert sem.get("semantic_ok") is True
    md = bundle["ir_goal"]["metadata"]
    assert md["integration"]["adapter"] == "n8n"
    assert "findings" in md["integration"]
    assert any(t["effect_name"] == "integration_external_step" for t in bundle["ir_goal"]["transitions"])


def test_analyze_flags_http_and_webhook_active():
    raw = json.loads((FIX / "with_code_credentials.json").read_text(encoding="utf-8"))
    wf, _ = parse_n8n_export(raw)
    assert wf is not None
    findings = analyze_n8n_workflow(wf)
    rules = {f["rule_id"] for f in findings}
    assert "n8n.code_node" in rules
    assert "n8n.credentials.attached" in rules
    assert "n8n.webhook.active_workflow" in rules


def test_load_input_n8n_source(tmp_path: Path):
    src = FIX / "minimal_chain.json"
    dst = tmp_path / "w.json"
    dst.write_bytes(src.read_bytes())
    bundle, err, it = load_input(dst, integration_source="n8n")
    assert err is None and it == "n8n"
    assert isinstance(bundle, dict)
    assert "ir_goal" in bundle


def test_n8n_export_to_bundle_raw():
    raw = json.loads((FIX / "minimal_chain.json").read_text(encoding="utf-8"))
    bundle, err = n8n_export_to_bundle(raw, path_hint="x.json")
    assert err is None and bundle is not None


def test_cli_scan_json_n8n_source_includes_integration(tmp_path: Path, monkeypatch):
    import subprocess
    import sys

    dst = tmp_path / "w.json"
    dst.write_bytes((FIX / "minimal_chain.json").read_bytes())
    r = subprocess.run(
        [sys.executable, "-m", "torqa", "scan", str(dst), "--source", "n8n", "--json"],
        cwd=str(REPO),
        capture_output=True,
        text=True,
        check=False,
    )
    assert r.returncode == 0, r.stderr
    data = json.loads(r.stdout)
    assert data["schema"] == "torqa.cli.scan.v1"
    row = data["rows"][0]
    assert row.get("integration", {}).get("adapter") == "n8n"
    assert "findings" in row["integration"]


def test_cli_import_n8n(tmp_path: Path):
    import subprocess
    import sys

    out = tmp_path / "bundle.json"
    r = subprocess.run(
        [
            sys.executable,
            "-m",
            "torqa",
            "import",
            "n8n",
            str(FIX / "minimal_chain.json"),
            "--out",
            str(out),
        ],
        cwd=str(REPO),
        capture_output=True,
        text=True,
        check=False,
    )
    assert r.returncode == 0, r.stderr
    bundle = json.loads(out.read_text(encoding="utf-8"))
    assert "ir_goal" in bundle
