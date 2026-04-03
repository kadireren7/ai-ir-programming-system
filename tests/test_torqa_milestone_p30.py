"""
P30 milestone: key product behavior is driven by TORQA artifacts (bundles + .tq surface).

Fails if committed policy/self-host bundles go missing, break shape, or loaders stop resolving.
Core invariants remain in Python/Rust — this suite does not replace semantic/schema tests.
"""

from __future__ import annotations

import json
from pathlib import Path

from src.ir.canonical_ir import ir_goal_from_json
from src.projection.projection_strategy import ProjectionTarget
from src.projection.stub_paths_layout import clear_policy_stub_paths_cache, policy_projection_stub_paths
from src.semantics.ir_semantics import default_ir_function_registry, validate_ir_semantics
from src.semantics.torqa_semantic_policy import clear_semantic_policy_cache, load_global_semantic_policy
from src.surface.parse_tq import parse_tq_source
from src.torqa_self.bundle_io import load_bundle_ir_goal
from src.torqa_self.bundle_registry import SELF_HOST_BUNDLE_PAIRS
from src.torqa_self.onboarding_ir import load_onboarding_suggested_next_prefix
from src.codegen.artifact_builder import generate_stub_artifact

REPO = Path(__file__).resolve().parents[1]

POLICY_STUBS = REPO / "examples" / "torqa" / "projection_stub_paths_policy_bundle.json"
POLICY_SEM = REPO / "examples" / "torqa" / "semantic_warning_policy_bundle.json"
WORKSPACE_APP = REPO / "examples" / "workspace_minimal" / "app.tq"
BENCHMARK_FLAGSHIP = REPO / "examples" / "benchmark_flagship" / "app.tq"


def test_benchmark_flagship_tq_surface_to_ir() -> None:
    raw = BENCHMARK_FLAGSHIP.read_text(encoding="utf-8")
    bundle = parse_tq_source(raw, tq_path=BENCHMARK_FLAGSHIP.resolve())
    assert bundle["ir_goal"]["goal"] == "LoginDashboardShell"


def test_workspace_minimal_tq_surface_to_ir() -> None:
    raw = WORKSPACE_APP.read_text(encoding="utf-8")
    bundle = parse_tq_source(raw, tq_path=WORKSPACE_APP.resolve())
    assert bundle["ir_goal"]["goal"] == "HelloDemo"
    assert any(i["name"] == "username" for i in bundle["ir_goal"]["inputs"])


def test_projection_stub_policy_bundle_drives_paths() -> None:
    clear_policy_stub_paths_cache()
    assert POLICY_STUBS.is_file()
    ig = load_bundle_ir_goal(POLICY_STUBS)
    assert ig is not None
    sm = ig["metadata"]["source_map"]
    assert sm["projection_stub_paths"]["rust"] == "generated/rust/main.rs"
    paths = policy_projection_stub_paths()
    assert paths["rust"].endswith("main.rs")
    assert paths["python"].endswith("main.py")


def test_semantic_warning_policy_bundle_loads() -> None:
    clear_semantic_policy_cache()
    assert POLICY_SEM.is_file()
    ig = load_bundle_ir_goal(POLICY_SEM)
    assert ig is not None
    names = [i["name"] for i in ig["inputs"]]
    assert "sem_warn_empty_result_when_transitions" in names
    pol = load_global_semantic_policy()
    assert pol.max_transitions_advisory == 100


def test_self_host_registry_bundles_load() -> None:
    for tq_path, bundle_path in SELF_HOST_BUNDLE_PAIRS:
        assert tq_path.is_file(), f"missing .tq: {tq_path}"
        assert bundle_path.is_file(), f"missing bundle: {bundle_path}"
        ig = load_bundle_ir_goal(bundle_path)
        assert isinstance(ig, dict) and ig.get("goal"), f"bad ir_goal: {bundle_path}"


def test_onboarding_lines_from_torqa_bundle() -> None:
    lines = load_onboarding_suggested_next_prefix()
    assert len(lines) >= 3
    assert any("torqa build" in x for x in lines)
    assert any("workspace_minimal" in x for x in lines)


def test_stub_generation_uses_torqa_path_table() -> None:
    clear_policy_stub_paths_cache()
    raw = json.loads((REPO / "examples/core/valid_minimal_flow.json").read_text(encoding="utf-8"))
    g = ir_goal_from_json(raw)
    art = generate_stub_artifact(g, ProjectionTarget("rust", "core_runtime", 0.9, []))
    fn = art["files"][0]["filename"]
    assert fn == policy_projection_stub_paths()["rust"]


def test_semantic_errors_still_invariant_under_policy() -> None:
    clear_semantic_policy_cache()
    raw = json.loads((REPO / "examples/core/valid_minimal_flow.json").read_text(encoding="utf-8"))
    ig = raw["ir_goal"]
    ig["transitions"] = [
        {
            "transition_id": "t_0999",
            "effect_name": "__nonexistent_torqa_test_effect__",
            "arguments": [{"type": "identifier", "name": "username"}],
            "from_state": "before",
            "to_state": "after",
        }
    ]
    g = ir_goal_from_json(raw)
    errs, _ = validate_ir_semantics(g, default_ir_function_registry())
    assert any("unknown effect" in e for e in errs)
