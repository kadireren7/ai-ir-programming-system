"""N8nAdapter — SourceAdapter implementation for n8n workflow exports.

Wraps existing parse/convert/analysis logic; adds WorkflowBundle mapping.
Existing convert.py functions are NOT changed — adapter calls them internally.
"""

from __future__ import annotations

from typing import Any, Dict, List

from torqa.bundle.model import ExternalConnection, WorkflowBundle, WorkflowEdge, WorkflowNode
from torqa.integrations.n8n.analysis import (
    _is_code_node,
    _is_external_side_effect,
    _is_http_node,
    _is_trigger_type,
    analyze_n8n_workflow,
)
from torqa.integrations.n8n.convert import n8n_workflow_to_bundle
from torqa.integrations.n8n.parser import (
    N8nWorkflow,
    _targets_from_connection_block,
    parse_n8n_export,
)
from torqa.ir.canonical_ir import ir_goal_from_json


def _node_generic_type(platform_type: str) -> str:
    """Map n8n platform type string to a generic category."""
    if _is_trigger_type(platform_type):
        return "trigger"
    if _is_code_node(platform_type):
        return "code"
    if _is_http_node(platform_type):
        return "http"
    return "action"


def _map_nodes(wf: N8nWorkflow) -> List[WorkflowNode]:
    nodes = []
    for n in wf.nodes:
        cred_names = list(n.credentials.keys()) if n.credentials else []
        nodes.append(
            WorkflowNode(
                node_id=n.node_id,
                name=n.name,
                type=_node_generic_type(n.type),
                platform_type=n.type,
                parameters=n.parameters,
                credentials=cred_names,
                disabled=n.disabled,
            )
        )
    return nodes


def _map_edges(wf: N8nWorkflow) -> List[WorkflowEdge]:
    name_to_id = {n.name: n.node_id for n in wf.nodes}
    edges: List[WorkflowEdge] = []
    idx = 0
    for src_name, block in wf.connections.items():
        src_id = name_to_id.get(src_name)
        if src_id is None:
            continue
        for tgt_name, _ in _targets_from_connection_block(block):
            tgt_id = name_to_id.get(tgt_name)
            if tgt_id is None:
                continue
            idx += 1
            edges.append(
                WorkflowEdge(
                    edge_id=f"e_{idx:04d}",
                    from_node=src_id,
                    to_node=tgt_id,
                )
            )
    return edges


def _detect_external_connections(wf: N8nWorkflow) -> List[ExternalConnection]:
    ext: List[ExternalConnection] = []
    idx = 0
    for n in wf.nodes:
        if n.disabled or not _is_external_side_effect(n.type):
            continue
        # Resolve target: use URL for HTTP nodes, service name otherwise
        if _is_http_node(n.type) and isinstance(n.parameters, dict):
            raw_url = n.parameters.get("url") or n.parameters.get("uri") or ""
            target = str(raw_url).strip() or "http_external"
        else:
            # Last segment of dotted type string is the service name
            target = n.type.split(".")[-1] if "." in n.type else n.type

        # Infer auth_type from credential key name
        auth_type = None
        if n.credentials:
            first_key = next(iter(n.credentials.keys()), "").lower()
            if "oauth" in first_key:
                auth_type = "oauth2"
            elif "api" in first_key or "key" in first_key or "token" in first_key:
                auth_type = "api_key"
            elif "basic" in first_key or "password" in first_key:
                auth_type = "basic"
            else:
                auth_type = "credential"

        idx += 1
        ext.append(
            ExternalConnection(
                connection_id=f"ec_{idx:04d}",
                target=target,
                auth_type=auth_type,
                guarded=False,  # governance findings determine this at policy layer
            )
        )
    return ext


class N8nAdapter:
    """SourceAdapter for n8n workflow JSON exports.

    Implements the SourceAdapter protocol. All existing convert.py functions
    remain unchanged — this class delegates to them.
    """

    source_id: str = "n8n"
    display_name: str = "n8n"

    def parse(self, raw: Dict[str, Any]) -> N8nWorkflow:
        """Parse raw n8n export dict → N8nWorkflow.

        Raises ValueError on invalid input (wraps existing error string).
        """
        wf, err = parse_n8n_export(raw)
        if err is not None:
            raise ValueError(err)
        assert wf is not None
        return wf

    def to_bundle(self, parsed: N8nWorkflow) -> WorkflowBundle:
        """Convert N8nWorkflow → WorkflowBundle.

        Calls the existing n8n_workflow_to_bundle() for IR generation.
        The raw IR dict is stored in metadata["_ir_bundle"] so io.py can
        extract it for the existing pipeline without behavioral change.
        """
        nodes = _map_nodes(parsed)
        edges = _map_edges(parsed)
        ext_conns = _detect_external_connections(parsed)

        # Existing IR pipeline — unchanged
        ir_bundle_dict = n8n_workflow_to_bundle(parsed)
        ir_goal = ir_goal_from_json(ir_bundle_dict["ir_goal"])

        sev = ir_goal.metadata.get("surface_meta", {}).get("severity", "low")

        metadata: Dict[str, Any] = {
            "owner": "n8n_integration",
            "severity": sev,
            "_ir_bundle": ir_bundle_dict,  # io.py backward-compat unwrap key
        }

        return WorkflowBundle(
            bundle_id=parsed.workflow_id or f"n8n:{parsed.name}",
            source="n8n",
            workflow_name=parsed.name,
            workflow_id=parsed.workflow_id,
            nodes=nodes,
            edges=edges,
            external_connections=ext_conns,
            metadata=metadata,
            ir_goal=ir_goal,
        )

    def analyze(self, parsed: N8nWorkflow) -> List[Dict[str, Any]]:
        """Run n8n-specific pre-IR findings. Delegates to existing analysis module."""
        return analyze_n8n_workflow(parsed)
