"""P29: TORQA semantic policy bundle drives non-blocking warnings; errors stay invariant."""

from __future__ import annotations

import json
from pathlib import Path

from src.ir.canonical_ir import IRGoal, IRInput, ir_goal_from_json
from src.semantics.ir_semantics import default_ir_function_registry, validate_ir_semantics
from src.semantics.torqa_semantic_policy import (
    TorqaSemanticPolicy,
    WARNING_CODE_EMPTY_RESULT,
    WARNING_CODE_NO_AFTER,
    clear_semantic_policy_cache,
    effective_semantic_policy,
    load_global_semantic_policy,
)

REPO = Path(__file__).resolve().parents[1]
POLICY_TQ = REPO / "examples" / "torqa" / "semantic_warning_policy.tq"
POLICY_BUNDLE = REPO / "examples" / "torqa" / "semantic_warning_policy_bundle.json"
MINIMAL = REPO / "examples" / "core" / "valid_minimal_flow.json"


def _goal_with_transition(*, result: str = "OK") -> IRGoal:
    raw = json.loads(MINIMAL.read_text(encoding="utf-8"))
    ig = raw["ir_goal"]
    ig["result"] = result
    ig["transitions"] = [
        {
            "transition_id": "t_0001",
            "effect_name": "start_session",
            "arguments": [{"type": "identifier", "name": "username"}],
            "from_state": "before",
            "to_state": "after",
        }
    ]
    return ir_goal_from_json(raw)


def test_policy_bundle_slugs_match_tq_surface() -> None:
    from src.surface.parse_tq import parse_tq_source

    live = parse_tq_source(POLICY_TQ.read_text(encoding="utf-8"), tq_path=POLICY_TQ)
    committed = json.loads(POLICY_BUNDLE.read_text(encoding="utf-8"))
    n1 = [i["name"] for i in live["ir_goal"]["inputs"]]
    n2 = [i["name"] for i in committed["ir_goal"]["inputs"]]
    assert n1 == n2
    assert "sem_warn_empty_result_when_transitions" in n1
    assert "sem_warn_no_after_guarantees_with_result" in n1
    assert "sem_advisory_max_transitions_100" in n1


def test_global_policy_enables_both_standard_warnings() -> None:
    clear_semantic_policy_cache()
    pol = load_global_semantic_policy()
    assert WARNING_CODE_EMPTY_RESULT in pol.enabled_warning_codes
    assert WARNING_CODE_NO_AFTER in pol.enabled_warning_codes
    assert pol.max_transitions_advisory == 100


def test_empty_result_warning_parity_when_enabled() -> None:
    clear_semantic_policy_cache()
    g = _goal_with_transition(result="")
    reg = default_ir_function_registry()
    errs, warns = validate_ir_semantics(g, reg)
    assert errs == []
    assert any("empty or missing" in w for w in warns)


def test_empty_result_warning_suppressed_when_quiet() -> None:
    clear_semantic_policy_cache()
    g = _goal_with_transition(result="")
    sm = g.metadata.setdefault("source_map", {})
    sm["semantic_quiet"] = [WARNING_CODE_EMPTY_RESULT]
    errs, warns = validate_ir_semantics(g, default_ir_function_registry())
    assert errs == []
    assert not any("empty or missing" in w for w in warns)


def _goal_strings_equal_transition() -> IRGoal:
    """Transition effect with no ``guarantees_after`` → advisory about missing after-state model."""
    raw = json.loads(MINIMAL.read_text(encoding="utf-8"))
    ig = raw["ir_goal"]
    ig["result"] = "OK"
    ig["transitions"] = [
        {
            "transition_id": "t_0001",
            "effect_name": "strings_equal",
            "arguments": [
                {"type": "identifier", "name": "username"},
                {"type": "string_literal", "value": "a"},
            ],
            "from_state": "before",
            "to_state": "after",
        }
    ]
    return ir_goal_from_json(raw)


def test_no_after_warning_fires_for_strings_equal_transition() -> None:
    clear_semantic_policy_cache()
    g = _goal_strings_equal_transition()
    errs, warns = validate_ir_semantics(g, default_ir_function_registry())
    assert errs == []
    assert any("after-state guarantees" in w for w in warns)


def test_no_after_warning_suppressed_via_policy_override() -> None:
    clear_semantic_policy_cache()
    g = _goal_strings_equal_transition()
    sm = g.metadata.setdefault("source_map", {})
    sm["semantic_warnings_enabled"] = [WARNING_CODE_EMPTY_RESULT]
    errs, warns = validate_ir_semantics(g, default_ir_function_registry())
    assert errs == []
    assert not any("after-state guarantees" in w for w in warns)


def test_transition_soft_cap_from_metadata() -> None:
    clear_semantic_policy_cache()
    raw = json.loads(MINIMAL.read_text(encoding="utf-8"))
    ig = raw["ir_goal"]
    ig["transitions"] = [
        {
            "transition_id": f"t_{i:04d}",
            "effect_name": "start_session",
            "arguments": [{"type": "identifier", "name": "username"}],
            "from_state": "before",
            "to_state": "after",
        }
        for i in range(3)
    ]
    ig.setdefault("metadata", {}).setdefault("source_map", {})["semantic_max_transitions_advisory"] = 2
    g = ir_goal_from_json(raw)
    errs, warns = validate_ir_semantics(g, default_ir_function_registry())
    assert errs == []
    assert any("soft limit" in w and "3 > 2" in w for w in warns)


def test_unknown_effect_still_errors_regardless_of_policy() -> None:
    clear_semantic_policy_cache()
    raw = json.loads(MINIMAL.read_text(encoding="utf-8"))
    ig = raw["ir_goal"]
    ig["transitions"] = [
        {
            "transition_id": "t_0001",
            "effect_name": "nonexistent_effect_xyz",
            "arguments": [{"type": "identifier", "name": "username"}],
            "from_state": "before",
            "to_state": "after",
        }
    ]
    g = ir_goal_from_json(raw)
    pol = TorqaSemanticPolicy(frozenset(), None)
    errs, warns = validate_ir_semantics(g, default_ir_function_registry(), torqa_policy=pol)
    assert any("unknown effect" in e for e in errs)


def test_effective_policy_replaces_enabled_set() -> None:
    clear_semantic_policy_cache()
    g = IRGoal("G", [IRInput("username", "text")], [], [], [], [], "OK", metadata={})
    sm = g.metadata.setdefault("source_map", {})
    sm["semantic_warnings_enabled"] = [WARNING_CODE_NO_AFTER]
    eff = effective_semantic_policy(g)
    assert eff.enabled_warning_codes == frozenset({WARNING_CODE_NO_AFTER})
