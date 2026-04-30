"""Tests for PolicyPack model, registry, and build_policy_report_from_pack."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from torqa.policy.packs import (
    BUILTIN_RULE_IDS,
    POLICY_PACK_REGISTRY,
    PolicyPack,
    resolve_policy_pack,
)
from torqa.policy.risk_engine import ProfileRiskConfig
from torqa.policy import build_policy_report, build_policy_report_from_pack

REPO = Path(__file__).resolve().parents[1]
FIX = REPO / "tests" / "fixtures" / "n8n"


def _minimal_ir():
    """Load minimal_chain IR bundle and return IRGoal."""
    from torqa.cli.io import goal_from_bundle
    from torqa.integrations.n8n.adapter import N8nAdapter

    raw = json.loads((FIX / "minimal_chain.json").read_text(encoding="utf-8"))
    adapter = N8nAdapter()
    wb = adapter.to_bundle(adapter.parse(raw))
    goal, err = goal_from_bundle(wb.metadata["_ir_bundle"])
    assert err is None
    return goal


# ---------------------------------------------------------------------------
# PolicyPack dataclass
# ---------------------------------------------------------------------------

def test_policy_pack_is_frozen():
    pack = POLICY_PACK_REGISTRY["default"]
    with pytest.raises(Exception):
        pack.pack_id = "hacked"  # type: ignore[misc]


def test_policy_pack_required_fields():
    pack = PolicyPack(
        pack_id="test",
        name="Test Pack",
        description="A test pack.",
        min_trust_score=60,
        severity_high_weight=10,
        transition_band5_weight=8,
        transition_band10_extra=5,
    )
    assert pack.pack_id == "test"
    assert pack.tags == []
    assert pack.rules == []


def test_policy_pack_to_risk_config_returns_profile_risk_config():
    pack = POLICY_PACK_REGISTRY["default"]
    cfg = pack.to_risk_config()
    assert isinstance(cfg, ProfileRiskConfig)


def test_policy_pack_to_risk_config_values_match():
    pack = POLICY_PACK_REGISTRY["strict"]
    cfg = pack.to_risk_config()
    assert cfg.min_trust_score == pack.min_trust_score
    assert cfg.severity_high_weight == pack.severity_high_weight
    assert cfg.transition_band5_weight == pack.transition_band5_weight
    assert cfg.transition_band10_extra == pack.transition_band10_extra


def test_policy_pack_to_dict_has_all_keys():
    pack = POLICY_PACK_REGISTRY["enterprise"]
    d = pack.to_dict()
    for key in ("pack_id", "name", "description", "min_trust_score",
                "severity_high_weight", "transition_band5_weight",
                "transition_band10_extra", "tags", "rules"):
        assert key in d, f"missing key: {key}"


# ---------------------------------------------------------------------------
# POLICY_PACK_REGISTRY
# ---------------------------------------------------------------------------

def test_registry_has_all_builtin_packs():
    for pid in ("default", "strict", "review-heavy", "enterprise"):
        assert pid in POLICY_PACK_REGISTRY, f"missing pack: {pid}"


def test_registry_pack_ids_match_keys():
    for key, pack in POLICY_PACK_REGISTRY.items():
        assert pack.pack_id == key


def test_default_pack_thresholds():
    p = POLICY_PACK_REGISTRY["default"]
    assert p.min_trust_score == 55
    assert p.severity_high_weight == 15
    assert p.transition_band5_weight == 12
    assert p.transition_band10_extra == 8


def test_strict_pack_thresholds():
    p = POLICY_PACK_REGISTRY["strict"]
    assert p.min_trust_score == 70
    assert p.severity_high_weight == 20
    assert p.transition_band5_weight == 15
    assert p.transition_band10_extra == 10


def test_review_heavy_pack_thresholds():
    p = POLICY_PACK_REGISTRY["review-heavy"]
    assert p.min_trust_score == 65
    assert p.severity_high_weight == 18
    assert p.transition_band5_weight == 14
    assert p.transition_band10_extra == 9


def test_enterprise_pack_thresholds():
    p = POLICY_PACK_REGISTRY["enterprise"]
    assert p.min_trust_score == 80
    assert p.severity_high_weight == 22
    assert p.transition_band5_weight == 16
    assert p.transition_band10_extra == 12


def test_all_builtin_packs_include_all_rules():
    for pid, pack in POLICY_PACK_REGISTRY.items():
        for rule_id in BUILTIN_RULE_IDS:
            assert rule_id in pack.rules, f"{pid}: missing rule {rule_id}"


def test_pack_tags_are_non_empty_for_builtins():
    for pid, pack in POLICY_PACK_REGISTRY.items():
        assert pack.tags, f"{pid}: tags should not be empty"


def test_enterprise_floor_is_highest():
    floors = {pid: p.min_trust_score for pid, p in POLICY_PACK_REGISTRY.items()}
    assert floors["enterprise"] > floors["strict"] > floors["review-heavy"] > floors["default"]


def test_enterprise_weights_are_highest():
    packs = POLICY_PACK_REGISTRY
    assert packs["enterprise"].severity_high_weight > packs["default"].severity_high_weight
    assert packs["enterprise"].transition_band5_weight > packs["default"].transition_band5_weight


# ---------------------------------------------------------------------------
# resolve_policy_pack
# ---------------------------------------------------------------------------

def test_resolve_from_string():
    pack = resolve_policy_pack("default")
    assert isinstance(pack, PolicyPack)
    assert pack.pack_id == "default"


def test_resolve_from_string_all_builtins():
    for pid in ("default", "strict", "review-heavy", "enterprise"):
        pack = resolve_policy_pack(pid)
        assert pack.pack_id == pid


def test_resolve_passthrough_for_pack_instance():
    original = POLICY_PACK_REGISTRY["strict"]
    resolved = resolve_policy_pack(original)
    assert resolved is original


def test_resolve_raises_for_unknown():
    with pytest.raises(ValueError, match="Unknown policy pack"):
        resolve_policy_pack("nonexistent-pack")


def test_resolve_strips_whitespace():
    pack = resolve_policy_pack("  default  ")
    assert pack.pack_id == "default"


def test_resolve_case_insensitive():
    pack = resolve_policy_pack("DEFAULT")
    assert pack.pack_id == "default"


# ---------------------------------------------------------------------------
# normalize_trust_profile uses registry
# ---------------------------------------------------------------------------

def test_normalize_trust_profile_accepts_all_registry_keys():
    from torqa.policy.profiles import normalize_trust_profile

    for pid in POLICY_PACK_REGISTRY:
        result = normalize_trust_profile(pid)
        assert result == pid


def test_normalize_trust_profile_raises_for_unknown():
    from torqa.policy.profiles import normalize_trust_profile

    with pytest.raises(ValueError, match="Unknown trust profile"):
        normalize_trust_profile("banana")


# ---------------------------------------------------------------------------
# build_policy_report_from_pack — correctness and compat
# ---------------------------------------------------------------------------

def test_build_policy_report_from_pack_returns_dict():
    goal = _minimal_ir()
    pack = POLICY_PACK_REGISTRY["default"]
    rep = build_policy_report_from_pack(goal, pack)
    assert isinstance(rep, dict)


def test_build_policy_report_from_pack_has_required_keys():
    goal = _minimal_ir()
    pack = POLICY_PACK_REGISTRY["default"]
    rep = build_policy_report_from_pack(goal, pack)
    for key in ("policy_ok", "risk_level", "trust_score", "trust_profile", "errors", "warnings"):
        assert key in rep, f"missing key: {key}"


def test_build_policy_report_from_pack_matches_string_api():
    """build_policy_report_from_pack must return identical result to build_policy_report."""
    goal = _minimal_ir()
    for pid in ("default", "strict", "review-heavy", "enterprise"):
        pack = POLICY_PACK_REGISTRY[pid]
        from_pack = build_policy_report_from_pack(goal, pack)
        from_string = build_policy_report(goal, profile=pid)
        assert from_pack == from_string, f"mismatch for pack {pid!r}"


def test_build_policy_report_from_pack_trust_profile_field():
    goal = _minimal_ir()
    pack = POLICY_PACK_REGISTRY["strict"]
    rep = build_policy_report_from_pack(goal, pack)
    assert rep["trust_profile"] == "strict"


def test_build_policy_report_from_pack_enterprise_has_highest_floor():
    """Enterprise pack should produce a lower or equal score ceiling than default."""
    goal = _minimal_ir()
    rep_default = build_policy_report_from_pack(goal, POLICY_PACK_REGISTRY["default"])
    rep_enterprise = build_policy_report_from_pack(goal, POLICY_PACK_REGISTRY["enterprise"])
    # Enterprise min floor is higher so harder to pass, not necessarily lower score
    assert rep_enterprise["min_trust_score"] > rep_default["min_trust_score"]


# ---------------------------------------------------------------------------
# torqa.policy public surface
# ---------------------------------------------------------------------------

def test_policy_pack_importable_from_policy_module():
    from torqa.policy import PolicyPack as PP
    assert PP is PolicyPack


def test_policy_pack_registry_importable_from_policy_module():
    from torqa.policy import POLICY_PACK_REGISTRY as REG
    assert REG is POLICY_PACK_REGISTRY


def test_resolve_policy_pack_importable_from_policy_module():
    from torqa.policy import resolve_policy_pack as rp
    assert rp is resolve_policy_pack


def test_build_policy_report_from_pack_importable_from_policy_module():
    from torqa.policy import build_policy_report_from_pack as fn
    assert fn is build_policy_report_from_pack


# ---------------------------------------------------------------------------
# CLI _PACK_CHOICES derives from registry
# ---------------------------------------------------------------------------

def test_cli_pack_choices_includes_all_builtins():
    from torqa.cli.main import _PACK_CHOICES

    for pid in ("default", "strict", "review-heavy", "enterprise"):
        assert pid in _PACK_CHOICES, f"missing: {pid}"


def test_cli_pack_choices_no_unknown_entries():
    from torqa.cli.main import _PACK_CHOICES

    for choice in _PACK_CHOICES:
        assert choice in POLICY_PACK_REGISTRY, f"unknown choice in CLI: {choice}"
