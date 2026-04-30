"""Tests for N8nAdapter — SourceAdapter implementation for n8n."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from torqa.bundle.model import WorkflowBundle, WorkflowEdge, WorkflowNode
from torqa.integrations.base import SourceAdapter
from torqa.integrations.n8n.adapter import N8nAdapter
from torqa.integrations.n8n.parser import N8nWorkflow

REPO = Path(__file__).resolve().parents[1]
FIX = REPO / "tests" / "fixtures" / "n8n"


def _raw_minimal() -> dict:
    return json.loads((FIX / "minimal_chain.json").read_text(encoding="utf-8"))


def _raw_credentials() -> dict:
    return json.loads((FIX / "with_code_credentials.json").read_text(encoding="utf-8"))


# ---------------------------------------------------------------------------
# Protocol conformance
# ---------------------------------------------------------------------------

def test_n8n_adapter_satisfies_source_adapter_protocol():
    assert isinstance(N8nAdapter(), SourceAdapter)


def test_n8n_adapter_source_id():
    assert N8nAdapter.source_id == "n8n"
    assert N8nAdapter().source_id == "n8n"


def test_n8n_adapter_display_name():
    assert N8nAdapter().display_name == "n8n"


# ---------------------------------------------------------------------------
# parse()
# ---------------------------------------------------------------------------

def test_parse_returns_n8n_workflow():
    adapter = N8nAdapter()
    wf = adapter.parse(_raw_minimal())
    assert isinstance(wf, N8nWorkflow)
    assert wf.name == "Minimal chain"
    assert len(wf.nodes) == 2


def test_parse_raises_value_error_on_invalid():
    adapter = N8nAdapter()
    with pytest.raises(ValueError):
        adapter.parse({"not": "a workflow"})


def test_parse_raises_on_non_dict():
    adapter = N8nAdapter()
    with pytest.raises((ValueError, Exception)):
        adapter.parse([])  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# analyze()
# ---------------------------------------------------------------------------

def test_analyze_delegates_to_existing_engine():
    adapter = N8nAdapter()
    wf = adapter.parse(_raw_credentials())
    findings = adapter.analyze(wf)
    assert isinstance(findings, list)
    rule_ids = {f["rule_id"] for f in findings}
    assert "n8n.code_node" in rule_ids
    assert "n8n.credentials.attached" in rule_ids


# ---------------------------------------------------------------------------
# to_bundle() — structure
# ---------------------------------------------------------------------------

def test_to_bundle_returns_workflow_bundle():
    adapter = N8nAdapter()
    wf = adapter.parse(_raw_minimal())
    wb = adapter.to_bundle(wf)
    assert isinstance(wb, WorkflowBundle)


def test_to_bundle_source_is_n8n():
    adapter = N8nAdapter()
    wb = adapter.to_bundle(adapter.parse(_raw_minimal()))
    assert wb.source == "n8n"


def test_to_bundle_workflow_name():
    adapter = N8nAdapter()
    wb = adapter.to_bundle(adapter.parse(_raw_minimal()))
    assert wb.workflow_name == "Minimal chain"


def test_to_bundle_workflow_id():
    adapter = N8nAdapter()
    wb = adapter.to_bundle(adapter.parse(_raw_minimal()))
    assert wb.workflow_id == "wf_minimal"


# ---------------------------------------------------------------------------
# to_bundle() — nodes
# ---------------------------------------------------------------------------

def test_to_bundle_maps_nodes():
    adapter = N8nAdapter()
    wb = adapter.to_bundle(adapter.parse(_raw_minimal()))
    assert len(wb.nodes) == 2
    assert all(isinstance(n, WorkflowNode) for n in wb.nodes)


def test_to_bundle_node_ids_preserved():
    adapter = N8nAdapter()
    wb = adapter.to_bundle(adapter.parse(_raw_minimal()))
    ids = {n.node_id for n in wb.nodes}
    assert ids == {"n1", "n2"}


def test_to_bundle_node_platform_type_preserved():
    adapter = N8nAdapter()
    wb = adapter.to_bundle(adapter.parse(_raw_minimal()))
    node_by_id = {n.node_id: n for n in wb.nodes}
    assert node_by_id["n2"].platform_type == "n8n-nodes-base.httpRequest"


def test_to_bundle_node_generic_type_http():
    adapter = N8nAdapter()
    wb = adapter.to_bundle(adapter.parse(_raw_minimal()))
    node_by_id = {n.node_id: n for n in wb.nodes}
    assert node_by_id["n2"].type == "http"


def test_to_bundle_node_generic_type_trigger():
    adapter = N8nAdapter()
    wb = adapter.to_bundle(adapter.parse(_raw_minimal()))
    node_by_id = {n.node_id: n for n in wb.nodes}
    # n8n-nodes-base.start is a trigger
    assert node_by_id["n1"].type == "trigger"


def test_to_bundle_node_credentials_names_only():
    adapter = N8nAdapter()
    wb = adapter.to_bundle(adapter.parse(_raw_credentials()))
    cred_nodes = [n for n in wb.nodes if n.credentials]
    assert cred_nodes, "expected at least one node with credentials"
    for n in cred_nodes:
        assert all(isinstance(c, str) for c in n.credentials)


# ---------------------------------------------------------------------------
# to_bundle() — edges
# ---------------------------------------------------------------------------

def test_to_bundle_maps_edges():
    adapter = N8nAdapter()
    wb = adapter.to_bundle(adapter.parse(_raw_minimal()))
    # minimal_chain: Start → Ping — one edge
    assert len(wb.edges) >= 1
    assert all(isinstance(e, WorkflowEdge) for e in wb.edges)


def test_to_bundle_edge_connects_correct_nodes():
    adapter = N8nAdapter()
    wb = adapter.to_bundle(adapter.parse(_raw_minimal()))
    edge = wb.edges[0]
    assert edge.from_node == "n1"   # Start
    assert edge.to_node == "n2"     # Ping
    assert edge.edge_id == "e_0001"


# ---------------------------------------------------------------------------
# to_bundle() — external connections
# ---------------------------------------------------------------------------

def test_to_bundle_detects_http_external_connection():
    adapter = N8nAdapter()
    wb = adapter.to_bundle(adapter.parse(_raw_minimal()))
    # Ping node is an HTTP node → external connection
    assert len(wb.external_connections) >= 1
    conn = wb.external_connections[0]
    assert "example.com" in conn.target or conn.target == "http_external"
    assert conn.connection_id == "ec_0001"


# ---------------------------------------------------------------------------
# to_bundle() — IR goal preserved
# ---------------------------------------------------------------------------

def test_to_bundle_ir_goal_is_set():
    adapter = N8nAdapter()
    wb = adapter.to_bundle(adapter.parse(_raw_minimal()))
    assert wb.ir_goal is not None


def test_to_bundle_ir_goal_has_correct_goal_name():
    adapter = N8nAdapter()
    wb = adapter.to_bundle(adapter.parse(_raw_minimal()))
    assert wb.ir_goal is not None
    assert wb.ir_goal.goal == "Minimal chain"


def test_to_bundle_ir_bundle_in_metadata_for_backward_compat():
    adapter = N8nAdapter()
    wb = adapter.to_bundle(adapter.parse(_raw_minimal()))
    assert "_ir_bundle" in wb.metadata
    assert "ir_goal" in wb.metadata["_ir_bundle"]


# ---------------------------------------------------------------------------
# Backward-compat: existing IR pipeline unchanged
# ---------------------------------------------------------------------------

def test_adapter_ir_bundle_matches_direct_convert():
    """WorkflowBundle._ir_bundle must equal what n8n_workflow_to_bundle returns directly."""
    from torqa.integrations.n8n.convert import n8n_workflow_to_bundle
    from torqa.integrations.n8n.parser import parse_n8n_export

    raw = _raw_minimal()
    wf, _ = parse_n8n_export(raw)
    assert wf is not None
    direct = n8n_workflow_to_bundle(wf)

    adapter = N8nAdapter()
    wb = adapter.to_bundle(adapter.parse(raw))
    via_adapter = wb.metadata["_ir_bundle"]

    # Goal name, adapter tag, transition must match
    assert direct["ir_goal"]["goal"] == via_adapter["ir_goal"]["goal"]
    assert (
        direct["ir_goal"]["metadata"]["integration"]["adapter"]
        == via_adapter["ir_goal"]["metadata"]["integration"]["adapter"]
    )
    assert direct["ir_goal"]["transitions"] == via_adapter["ir_goal"]["transitions"]


def test_io_load_input_n8n_path_unchanged(tmp_path):
    """load_input with integration_source='n8n' still returns {"ir_goal": ...} dict."""
    from torqa.cli.io import load_input

    dest = tmp_path / "minimal_chain.json"
    dest.write_text((FIX / "minimal_chain.json").read_text(encoding="utf-8"), encoding="utf-8")
    payload, err, input_type = load_input(dest, integration_source="n8n")
    assert err is None
    assert input_type == "n8n"
    assert isinstance(payload, dict)
    assert "ir_goal" in payload
