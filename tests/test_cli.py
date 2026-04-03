import io
import json
import subprocess
import sys
import tempfile
from argparse import Namespace
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]


def _run(*args: str):
    return subprocess.run(
        [sys.executable, "-m", "src.cli.main", *args],
        cwd=str(REPO),
        capture_output=True,
        text=True,
    )


def test_cli_module_shim_torqa_invocation():
    r = subprocess.run(
        [sys.executable, "-m", "torqa", "--help"],
        cwd=str(REPO),
        capture_output=True,
        text=True,
    )
    assert r.returncode == 0, r.stderr
    assert "build" in r.stdout


def test_cli_validate_ok():
    p = REPO / "examples" / "core" / "valid_minimal_flow.json"
    r = _run("validate", str(p))
    assert r.returncode == 0, r.stderr
    data = json.loads(r.stdout)
    assert data["ok"] is True


def test_cli_validate_invalid():
    p = REPO / "examples" / "core" / "invalid_duplicate_condition_id.json"
    r = _run("validate", str(p))
    assert r.returncode == 1
    data = json.loads(r.stdout)
    assert data["ok"] is False
    assert data.get("suggested_next")


def test_cli_validate_rejects_tq_with_guidance():
    p = REPO / "examples" / "workspace_minimal" / "app.tq"
    r = _run("validate", str(p))
    assert r.returncode == 1
    data = json.loads(r.stdout)
    assert data["ok"] is False
    assert data.get("suggested_next")
    joined = " ".join(data["suggested_next"]).lower()
    assert "surface" in joined or "project" in joined
    msg = (data.get("issues") or [{}])[0].get("message", "")
    assert "json" in msg.lower() or "surface" in msg.lower()


def test_cli_validate_ir_shape_invalid():
    bad = {
        "ir_goal": {
            "goal": "G",
            "inputs": [],
            "preconditions": [{"condition_id": "c_req_0001", "kind": "require"}],
            "forbids": [],
            "transitions": [],
            "postconditions": [],
            "result": None,
            "metadata": {
                "ir_version": "1.4",
                "source": "test",
                "canonical_language": "english",
            },
        }
    }
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", delete=False, encoding="utf-8"
    ) as f:
        json.dump(bad, f)
        fpath = f.name
    try:
        r = _run("validate", fpath)
        assert r.returncode == 1
        data = json.loads(r.stdout)
        assert data["ok"] is False
        assert data.get("issues")
        assert data.get("suggested_next")
    finally:
        Path(fpath).unlink(missing_ok=True)


def test_cli_surface_tq_unknown_step_has_hint():
    bad_tq = (
        "module x\nintent user_x\nrequires username, password, ip_address\nresult OK\nflow:\n"
        "  totally_unknown_step\n"
    )
    with tempfile.NamedTemporaryFile(mode="w", suffix=".tq", delete=False, encoding="utf-8") as f:
        f.write(bad_tq)
        fpath = f.name
    try:
        r = _run("--json", "surface", fpath)
        assert r.returncode == 1
        data = json.loads(r.stderr)
        assert data.get("hint")
        assert data.get("suggested_next")
        assert data.get("code") == "PX_TQ_UNKNOWN_FLOW_STEP"
    finally:
        Path(fpath).unlink(missing_ok=True)


def test_cli_surface_human_next_respects_display_cap(monkeypatch, tmp_path):
    """Human-mode surface stderr \"Next:\" uses suggested_next_display_cap (P15.1)."""
    from src.cli import main as cli_main

    monkeypatch.setattr(cli_main, "suggested_next_display_cap", lambda **kw: 2)
    bad_tq = tmp_path / "bad.tq"
    bad_tq.write_text(
        "module x\nintent user_x\nrequires username, password, ip_address\nresult OK\nflow:\n"
        "  totally_unknown_step\n",
        encoding="utf-8",
    )
    err = io.StringIO()
    monkeypatch.setattr(sys, "stderr", err)
    rc = cli_main.cmd_surface(Namespace(file=str(bad_tq), json=False, out=None))
    assert rc == 1
    assert err.getvalue().count("  - ") == 2


def test_cli_language_self_host_catalog():
    r = _run("--json", "language", "--self-host-catalog")
    assert r.returncode == 0, r.stderr
    data = json.loads(r.stdout)
    assert data.get("ok") is True
    assert data.get("single_flow")
    assert data.get("group_blurbs")
    assert isinstance(data.get("entries"), list)
    assert len(data["entries"]) >= 10


def test_cli_language():
    r = _run("language")
    assert r.returncode == 0, r.stderr
    data = json.loads(r.stdout)
    assert data.get("canonical_ir_version")
    assert isinstance(data.get("builtins"), list)
    assert len(data["builtins"]) >= 3
    assert data.get("formal_validation_phases") == [
        "syntax",
        "kind_type",
        "wellformed",
        "policy",
    ]
    names = {b["name"] for b in data["builtins"]}
    assert "session_stored_for_user" in names


def test_cli_language_minimal_json():
    r = _run("language", "--minimal-json")
    assert r.returncode == 0, r.stderr
    data = json.loads(r.stdout)
    assert data["ir_goal"]["goal"] == "MinimalDemoFlow"


def test_cli_bundle_lint_ok():
    p = REPO / "examples" / "core" / "valid_minimal_flow.json"
    r = _run("bundle-lint", str(p))
    assert r.returncode == 0, r.stderr
    data = json.loads(r.stdout)
    assert data["ok"] is True
    assert data["issue_count"] == 0
    assert "by_formal_phase" in data


def test_cli_proposal_gate_minimal_ok():
    p = REPO / "examples" / "core" / "valid_minimal_flow.json"
    r = _run("proposal-gate", str(p))
    assert r.returncode == 0, r.stderr
    data = json.loads(r.stdout)
    assert data.get("rejected") is False


def test_cli_demo_prints_canonical_path():
    r = _run("demo")
    assert r.returncode == 0, r.stderr
    out = r.stdout + r.stderr
    assert "torqa demo verify" in out
    assert "torqa demo benchmark" in out
    assert "examples/benchmark_flagship/app.tq" in out


def test_cli_demo_benchmark():
    r = _run("demo", "benchmark")
    assert r.returncode == 0, r.stderr
    assert "semantic_compression_ratio" in r.stdout


def test_cli_demo_verify_matches_flagship():
    r = _run("demo", "verify")
    assert r.returncode == 0, r.stderr


def test_cli_demo_multi_surface():
    demo = REPO / "examples" / "core" / "demo_multi_surface_flow.json"
    with tempfile.TemporaryDirectory() as td:
        r = _run("demo", "emit", str(demo), "--out", td, "--engine-mode", "python_only")
        assert r.returncode == 0, r.stderr
        data = json.loads(r.stdout)
        assert data.get("ok") is True
        langs = {s.get("target_language") for s in data.get("surfaces", [])}
        assert "sql" in langs
        assert (Path(td) / "generated" / "sql" / "schema.sql").is_file()


def test_cli_guided_minimal():
    p = REPO / "examples" / "core" / "valid_minimal_flow.json"
    r = _run("guided", str(p), "--inputs-json", '{"username":"alice"}')
    assert r.returncode == 0, r.stderr
    data = json.loads(r.stdout)
    assert data.get("stage") == "complete"
    assert data.get("diagnostics", {}).get("ok") is True
    assert "execution_trace" in data


def test_cli_ai_suggest_resilient():
    """With no API key, ai-suggest fails with a structured code; with a key it may succeed."""
    r = _run("ai-suggest", "minimal login flow")
    data = json.loads(r.stdout)
    if r.returncode == 0:
        assert data.get("ok") is True
    else:
        assert data.get("ok") is False
        assert data.get("code") in (
            "PX_AI_NO_KEY",
            "PX_AI_MAX_RETRIES",
            "PX_AI_HTTP",
        )


def test_cli_build_json_matches_project(tmp_path):
    """build is orchestration-only: same payload as project --source for the same file."""
    src = REPO / "examples" / "core" / "valid_minimal_flow.json"
    rb = _run(
        "--json",
        "build",
        str(src),
        "--root",
        str(tmp_path),
        "--out",
        "g",
        "--engine-mode",
        "python_only",
    )
    rp = _run(
        "--json",
        "project",
        "--root",
        str(tmp_path),
        "--source",
        str(src),
        "--out",
        "g2",
        "--engine-mode",
        "python_only",
    )
    assert rb.returncode == 0, rb.stderr + rb.stdout
    assert rp.returncode == 0, rp.stderr + rp.stdout
    jb = json.loads(rb.stdout)
    jp = json.loads(rp.stdout)
    assert sorted(jb.get("written") or []) == sorted(jp.get("written") or [])


def test_cli_project_human_success_summary(tmp_path):
    src = REPO / "examples" / "core" / "valid_minimal_flow.json"
    r = _run(
        "project",
        "--root",
        str(tmp_path),
        "--source",
        str(src),
        "--out",
        "h",
        "--engine-mode",
        "python_only",
    )
    assert r.returncode == 0, r.stderr + r.stdout
    assert "SUCCESS" in r.stdout
    assert "Output:" in r.stdout
    assert "Next:" in r.stdout
    assert not r.stdout.strip().startswith("{")
