import json
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]


def _run(*args: str):
    return subprocess.run(
        [sys.executable, "-m", "src.cli.main", *args],
        cwd=str(REPO),
        capture_output=True,
        text=True,
    )


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


def test_cli_demo_multi_surface():
    demo = REPO / "examples" / "core" / "demo_multi_surface_flow.json"
    with tempfile.TemporaryDirectory() as td:
        r = _run("demo", str(demo), "--out", td, "--engine-mode", "python_only")
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
