import json
from pathlib import Path

from src.ir.canonical_ir import CANONICAL_IR_VERSION
from src.language.authoring_prompt import (
    build_ai_authoring_system_prompt,
    language_reference_payload,
    minimal_valid_bundle_json,
)


def test_minimal_bundle_matches_golden_file():
    repo = Path(__file__).resolve().parents[1]
    path = repo / "examples" / "core" / "valid_minimal_flow.json"
    from_disk = json.loads(path.read_text(encoding="utf-8"))
    from_api = json.loads(minimal_valid_bundle_json())
    assert from_disk == from_api


def test_language_reference_has_builtins_and_version():
    p = language_reference_payload()
    assert p["canonical_ir_version"] == CANONICAL_IR_VERSION
    names = {b["name"] for b in p["builtins"]}
    assert "exists" in names
    assert "start_session" in names
    assert "verify_username" in names
    assert p["minimal_valid_bundle"]["ir_goal"]["goal"] == "MinimalDemoFlow"


def test_ai_system_prompt_covers_registry_and_rules():
    text = build_ai_authoring_system_prompt()
    assert CANONICAL_IR_VERSION in text
    assert "Multi-surface" in text
    assert "exists" in text and "log_successful_login" in text
    assert "c_req_" in text and "c_forbid_" in text
    assert "python_prototype" in text
    assert "TORQA" in text
    assert "formal_phase" in text
    assert "AEM" in text
