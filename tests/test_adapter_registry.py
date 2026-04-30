"""Tests for the adapter registry."""

from __future__ import annotations

from pathlib import Path

import pytest

from torqa.integrations.registry import (
    AdapterEntry,
    get_adapter,
    list_adapters,
    list_available_adapters,
    register_adapter,
)
from torqa.integrations.base import SourceAdapter

REPO = Path(__file__).resolve().parents[1]
FIX = REPO / "tests" / "fixtures" / "n8n"


# ---------------------------------------------------------------------------
# AdapterEntry
# ---------------------------------------------------------------------------

def test_adapter_entry_is_frozen():
    entry = AdapterEntry(
        source_id="test", display_name="Test", description="desc", available=True
    )
    with pytest.raises(Exception):
        entry.source_id = "mutated"  # type: ignore[misc]


def test_adapter_entry_defaults():
    entry = AdapterEntry(
        source_id="x", display_name="X", description="", available=False
    )
    assert entry.tags == []


# ---------------------------------------------------------------------------
# list_adapters / list_available_adapters
# ---------------------------------------------------------------------------

def test_list_adapters_includes_n8n():
    ids = {e.source_id for e in list_adapters()}
    assert "n8n" in ids


def test_list_adapters_includes_placeholders():
    ids = {e.source_id for e in list_adapters()}
    assert "github_actions" in ids
    assert "agent" in ids


def test_list_adapters_sorted_by_source_id():
    entries = list_adapters()
    ids = [e.source_id for e in entries]
    assert ids == sorted(ids)


def test_list_available_adapters_only_available():
    available = list_available_adapters()
    assert all(e.available for e in available)


def test_list_available_adapters_includes_n8n():
    ids = {e.source_id for e in list_available_adapters()}
    assert "n8n" in ids


def test_list_available_adapters_excludes_placeholders():
    ids = {e.source_id for e in list_available_adapters()}
    assert "github_actions" not in ids
    assert "agent" not in ids


# ---------------------------------------------------------------------------
# get_adapter — happy path
# ---------------------------------------------------------------------------

def test_get_adapter_n8n_returns_source_adapter():
    adapter = get_adapter("n8n")
    assert isinstance(adapter, SourceAdapter)


def test_get_adapter_n8n_source_id():
    adapter = get_adapter("n8n")
    assert adapter.source_id == "n8n"


def test_get_adapter_n8n_display_name():
    adapter = get_adapter("n8n")
    assert adapter.display_name == "n8n"


def test_get_adapter_returns_fresh_instance_each_call():
    a1 = get_adapter("n8n")
    a2 = get_adapter("n8n")
    assert a1 is not a2


# ---------------------------------------------------------------------------
# get_adapter — error paths
# ---------------------------------------------------------------------------

def test_get_adapter_unknown_raises_value_error():
    with pytest.raises(ValueError, match="Unknown source"):
        get_adapter("zapier")


def test_get_adapter_unknown_error_lists_known():
    with pytest.raises(ValueError, match="n8n"):
        get_adapter("does_not_exist")


def test_get_adapter_placeholder_raises_not_implemented():
    with pytest.raises(NotImplementedError, match="not yet implemented"):
        get_adapter("github_actions")


def test_get_adapter_agent_placeholder_raises_not_implemented():
    with pytest.raises(NotImplementedError, match="not yet implemented"):
        get_adapter("agent")


# ---------------------------------------------------------------------------
# register_adapter — custom registration
# ---------------------------------------------------------------------------

def test_register_custom_adapter_appears_in_list():
    from torqa.integrations.registry import _REGISTRY

    entry = AdapterEntry(
        source_id="_test_custom",
        display_name="Custom Test",
        description="Test only.",
        available=False,
    )
    register_adapter(entry)
    try:
        ids = {e.source_id for e in list_adapters()}
        assert "_test_custom" in ids
    finally:
        _REGISTRY.pop("_test_custom", None)


def test_register_custom_available_adapter():
    from torqa.integrations.registry import _REGISTRY, _FACTORIES
    from torqa.integrations.n8n.adapter import N8nAdapter

    entry = AdapterEntry(
        source_id="_test_real",
        display_name="Real Test",
        description="Test only.",
        available=True,
    )
    register_adapter(entry, factory=lambda: N8nAdapter())
    try:
        adapter = get_adapter("_test_real")
        assert isinstance(adapter, SourceAdapter)
    finally:
        _REGISTRY.pop("_test_real", None)
        _FACTORIES.pop("_test_real", None)


# ---------------------------------------------------------------------------
# n8n entry metadata
# ---------------------------------------------------------------------------

def test_n8n_entry_available():
    entries = {e.source_id: e for e in list_adapters()}
    assert entries["n8n"].available is True


def test_n8n_entry_has_tags():
    entries = {e.source_id: e for e in list_adapters()}
    assert entries["n8n"].tags


def test_github_actions_entry_not_available():
    entries = {e.source_id: e for e in list_adapters()}
    assert entries["github_actions"].available is False


def test_agent_entry_not_available():
    entries = {e.source_id: e for e in list_adapters()}
    assert entries["agent"].available is False


# ---------------------------------------------------------------------------
# io.py backward-compat: uses registry internally
# ---------------------------------------------------------------------------

def test_io_load_input_n8n_still_works_via_registry(tmp_path):
    """load_input with source='n8n' still returns {"ir_goal": ...} after registry switch."""
    from torqa.cli.io import load_input

    dest = tmp_path / "minimal_chain.json"
    dest.write_text((FIX / "minimal_chain.json").read_text(encoding="utf-8"), encoding="utf-8")
    payload, err, input_type = load_input(dest, integration_source="n8n")

    assert err is None
    assert input_type == "n8n"
    assert isinstance(payload, dict)
    assert "ir_goal" in payload


def test_io_load_input_n8n_ir_goal_has_goal_field(tmp_path):
    from torqa.cli.io import load_input

    dest = tmp_path / "minimal_chain.json"
    dest.write_text((FIX / "minimal_chain.json").read_text(encoding="utf-8"), encoding="utf-8")
    payload, err, _ = load_input(dest, integration_source="n8n")

    assert err is None
    assert payload is not None
    assert "goal" in payload["ir_goal"]


# ---------------------------------------------------------------------------
# Public surface via torqa.integrations
# ---------------------------------------------------------------------------

def test_registry_symbols_importable_from_integrations():
    from torqa.integrations import (
        get_adapter as ga,
        list_adapters as la,
        list_available_adapters as laa,
        register_adapter as ra,
        AdapterEntry as AE,
    )
    assert ga is get_adapter
    assert la is list_adapters
    assert laa is list_available_adapters
    assert ra is register_adapter
    assert AE is AdapterEntry
