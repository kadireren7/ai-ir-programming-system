"""
Convert a parsed n8n workflow into a Torqa bundle ``{\"ir_goal\": ...}``.

IR uses one registered ``integration_external_step`` transition for the whole imported graph
(valid IR forbids duplicate effect/state triples); per-node detail lives in
``metadata.integration`` and in static ``findings``.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from torqa.ir.canonical_ir import CANONICAL_IR_VERSION, DEFAULT_IR_METADATA
from torqa.integrations.n8n.analysis import analyze_n8n_workflow
from torqa.integrations.n8n.parser import N8nWorkflow, order_nodes_linear, parse_n8n_export


def _severity_for_findings(findings: List[Dict[str, Any]]) -> str:
    if any(f.get("severity") == "high" for f in findings):
        return "high"
    if any(f.get("severity") == "review" for f in findings):
        return "medium"
    return "low"


def n8n_workflow_to_bundle(wf: N8nWorkflow) -> Dict[str, Any]:
    findings = analyze_n8n_workflow(wf)
    ordered, _ = order_nodes_linear(wf)
    # One IR transition for the whole imported graph — avoids duplicate (effect, state, state)
    # triples while keeping per-node detail in ``metadata.integration`` and in ``findings``.
    transitions: List[Dict[str, Any]] = [
        {
            "transition_id": "t_0001",
            "effect_name": "integration_external_step",
            "arguments": [],
            "from_state": "before",
            "to_state": "after",
        }
    ]
    node_map = {
        "t_0001": {
            "n8n_nodes_ordered": [
                {"n8n_node_id": n.node_id, "n8n_node_name": n.name, "n8n_node_type": n.type} for n in ordered
            ]
        }
    }

    sev = _severity_for_findings(findings)
    md: Dict[str, Any] = dict(DEFAULT_IR_METADATA)
    md["ir_version"] = CANONICAL_IR_VERSION
    md["surface_meta"] = {
        "owner": "n8n_integration",
        "severity": sev,
        "n8n_workflow_name": wf.name,
    }
    md["source_map"] = {"available": True, "prototype_only": True, "surface": "n8n_export"}
    md["integration"] = {
        "adapter": "n8n",
        "workflow_id": wf.workflow_id,
        "active": wf.active,
        "findings": findings,
        "transition_to_node": node_map,
    }

    ir_goal: Dict[str, Any] = {
        "goal": wf.name,
        "inputs": [{"name": "n8n_workflow_context", "type": "unknown"}],
        "preconditions": [],
        "forbids": [],
        "transitions": transitions,
        "postconditions": [],
        "metadata": md,
        "result": wf.name,
    }
    return {"ir_goal": ir_goal}


def n8n_export_to_bundle(
    data: Any, *, path_hint: str = ""
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Parse ``data`` (dict from JSON) into a Torqa bundle, or return ``(None, error)``.
    """
    if not isinstance(data, dict):
        return None, f"{path_hint}: n8n export must be a JSON object"
    wf, err = parse_n8n_export(data)
    if err is not None:
        return None, f"{path_hint}: {err}" if path_hint else err
    assert wf is not None
    try:
        return n8n_workflow_to_bundle(wf), None
    except Exception as ex:  # pragma: no cover — defensive
        return None, f"{path_hint}: n8n conversion failed: {ex}"


def n8n_file_to_bundle(path: Path) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except OSError as ex:
        return None, f"{path}: {ex}"
    except json.JSONDecodeError as ex:
        return None, f"{path}: invalid JSON: {ex}"
    return n8n_export_to_bundle(raw, path_hint=str(path))
