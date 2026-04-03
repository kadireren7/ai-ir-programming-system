"""P28: projection stub paths driven by TORQA policy bundle + IR metadata overrides."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from src.codegen.artifact_builder import generate_stub_artifact
from src.ir.canonical_ir import ir_goal_from_json
from src.projection.projection_strategy import ProjectionTarget
from src.projection.stub_paths_layout import (
    clear_policy_stub_paths_cache,
    effective_stub_paths_for_goal,
    policy_projection_stub_paths,
)
from src.surface.parse_tq import TQParseError, parse_tq_source

REPO = Path(__file__).resolve().parents[1]
POLICY_TQ = REPO / "examples" / "torqa" / "projection_stub_paths_policy.tq"
POLICY_BUNDLE = REPO / "examples" / "torqa" / "projection_stub_paths_policy_bundle.json"
MINIMAL_FLOW = REPO / "examples" / "core" / "valid_minimal_flow.json"


def test_policy_bundle_contains_projection_stub_paths() -> None:
    data = json.loads(POLICY_BUNDLE.read_text(encoding="utf-8"))
    sm = data["ir_goal"]["metadata"]["source_map"]
    paths = sm.get("projection_stub_paths")
    assert isinstance(paths, dict)
    assert paths["rust"] == "generated/rust/main.rs"
    assert paths["python"] == "generated/python/main.py"
    assert set(paths.keys()) == {"cpp", "go", "kotlin", "python", "rust", "sql", "typescript"}


def test_policy_tq_surface_matches_bundle_paths() -> None:
    raw = POLICY_TQ.read_text(encoding="utf-8")
    live = parse_tq_source(raw, tq_path=POLICY_TQ)
    committed = json.loads(POLICY_BUNDLE.read_text(encoding="utf-8"))
    assert (
        live["ir_goal"]["metadata"]["source_map"]["projection_stub_paths"]
        == committed["ir_goal"]["metadata"]["source_map"]["projection_stub_paths"]
    )


def test_stub_path_duplicate_rejected() -> None:
    src = """
intent x
requires username, password, ip_address
stub_path rust generated/a.rs
stub_path rust generated/b.rs
result OK
flow:
  create session
  emit login_success
"""
    with pytest.raises(TQParseError) as ei:
        parse_tq_source(src)
    assert ei.value.code == "PX_TQ_STUB_PATH_DUPLICATE"


def test_generate_stub_uses_policy_paths_by_default() -> None:
    clear_policy_stub_paths_cache()
    raw = json.loads(MINIMAL_FLOW.read_text(encoding="utf-8"))
    g = ir_goal_from_json(raw)
    t = ProjectionTarget("rust", "core_runtime", 0.9, ["r"])
    art = generate_stub_artifact(g, t)
    names = {f["filename"] for f in art["files"]}
    assert "generated/rust/main.rs" in names


def test_generate_stub_respects_ir_metadata_override() -> None:
    clear_policy_stub_paths_cache()
    raw = json.loads(MINIMAL_FLOW.read_text(encoding="utf-8"))
    sm = raw["ir_goal"].setdefault("metadata", {}).setdefault("source_map", {})
    sm["projection_stub_paths"] = {"rust": "generated/custom/torqa_main.rs"}
    g = ir_goal_from_json(raw)
    t = ProjectionTarget("rust", "core_runtime", 0.9, ["r"])
    art = generate_stub_artifact(g, t)
    names = {f["filename"] for f in art["files"]}
    assert names == {"generated/custom/torqa_main.rs"}


def test_effective_stub_paths_prefers_goal_over_policy(tmp_path: Path) -> None:
    clear_policy_stub_paths_cache()
    raw = json.loads(MINIMAL_FLOW.read_text(encoding="utf-8"))
    raw["ir_goal"]["metadata"]["source_map"]["projection_stub_paths"] = {
        "rust": "x/custom.rs",
    }
    g = ir_goal_from_json(raw)
    eff = effective_stub_paths_for_goal(g)
    assert eff["rust"] == "x/custom.rs"
    assert eff["python"] == "generated/python/main.py"


def test_policy_load_from_alternate_bundle_merges(tmp_path: Path) -> None:
    clear_policy_stub_paths_cache()
    alt = tmp_path / "pol.json"
    data = json.loads(POLICY_BUNDLE.read_text(encoding="utf-8"))
    data["ir_goal"]["metadata"]["source_map"]["projection_stub_paths"]["rust"] = (
        "generated/rust/from_alt.rs"
    )
    alt.write_text(json.dumps(data), encoding="utf-8")
    got = policy_projection_stub_paths(bundle_path=alt)
    assert got["rust"] == "generated/rust/from_alt.rs"
    assert got["python"] == "generated/python/main.py"
