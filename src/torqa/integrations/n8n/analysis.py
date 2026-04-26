"""
n8n-specific static checks (findings) — does not replace Torqa IR policy; complements it.

Each finding maps to an n8n node where applicable for scan/validate JSON reporting.
"""

from __future__ import annotations

from typing import Any, Dict, List, Set

from torqa.integrations.n8n.parser import (
    N8nWorkflow,
    build_adjacency,
    entry_node_names,
    order_nodes_linear,
)


def _type_lower(n_type: str) -> str:
    return n_type.lower()


def _is_trigger_type(n_type: str) -> bool:
    t = _type_lower(n_type)
    return any(
        x in t
        for x in (
            "trigger",
            "webhook",
            "schedule",
            "nodes-base.start",
            "formtrigger",
            "emailreadimap",
        )
    )


def _is_http_node(n_type: str) -> bool:
    t = _type_lower(n_type)
    return "httprequest" in t or "http request" in t or "axios" in t


def _is_code_node(n_type: str) -> bool:
    return "code" in _type_lower(n_type) or "function" in _type_lower(n_type)


def _is_external_side_effect(n_type: str) -> bool:
    t = _type_lower(n_type)
    if _is_http_node(n_type):
        return True
    return any(
        x in t
        for x in (
            "slack",
            "discord",
            "telegram",
            "nodemailer",
            "sendgrid",
            "gmail",
            "postgres",
            "mysql",
            "mongodb",
            "googlesheets",
            "airtable",
            "s3",
        )
    )


def _is_manual_gate(n_type: str) -> bool:
    t = _type_lower(n_type)
    return "manualtrigger" in t or "form" in t and "trigger" in t or "wait" in t


def analyze_n8n_workflow(wf: N8nWorkflow) -> List[Dict[str, Any]]:
    """
    Return a list of finding dicts:

    ``rule_id``, ``severity`` (info|review|high), ``message``, ``n8n_node_id``, ``n8n_node_name``, ``n8n_node_type``.
    """
    findings: List[Dict[str, Any]] = []
    name_to = {n.name: n for n in wf.nodes}

    ordered, topo_warnings = order_nodes_linear(wf)
    for w in topo_warnings:
        findings.append(
            {
                "rule_id": "n8n.graph.disconnected",
                "severity": "review",
                "message": w,
                "n8n_node_id": None,
                "n8n_node_name": None,
                "n8n_node_type": None,
            }
        )

    # Cycle hint: if many nodes but BFS order length < nodes count without disconnected warnings
    adj = build_adjacency(wf)
    reachable: Set[str] = set()
    roots = entry_node_names(wf)
    stack = list(roots)
    while stack:
        u = stack.pop()
        if u in reachable or u not in name_to:
            continue
        reachable.add(u)
        for v in adj.get(u, []):
            if v not in reachable:
                stack.append(v)
    if len(reachable) < len(wf.nodes) and not any(f.get("rule_id") == "n8n.graph.disconnected" for f in findings):
        findings.append(
            {
                "rule_id": "n8n.graph.reachability",
                "severity": "review",
                "message": "n8n: not all nodes are reachable from entry roots (possible cycles or orphan subgraphs)",
                "n8n_node_id": None,
                "n8n_node_name": None,
                "n8n_node_type": None,
            }
        )

    for n in wf.nodes:
        if n.disabled:
            continue
        t = n.type
        tl = _type_lower(t)
        base = {
            "n8n_node_id": n.node_id,
            "n8n_node_name": n.name,
            "n8n_node_type": t,
        }
        if n.credentials:
            findings.append(
                {
                    "rule_id": "n8n.credentials.attached",
                    "severity": "review",
                    "message": "Node references credentials — review scope and rotation policy.",
                    **base,
                }
            )
        if _is_code_node(t):
            findings.append(
                {
                    "rule_id": "n8n.code_node",
                    "severity": "review",
                    "message": "Code / Function node executes arbitrary logic — review inputs and sandboxing.",
                    **base,
                }
            )
        if _is_http_node(t):
            risky = False
            if isinstance(n.parameters, dict):
                if not n.parameters.get("continueOnFail") and not n.parameters.get("onError"):
                    risky = True
            if risky:
                findings.append(
                    {
                        "rule_id": "n8n.http.no_explicit_error_handler",
                        "severity": "review",
                        "message": "HTTP Request node has no explicit onError / continueOnFail — failures may stop the workflow abruptly.",
                        **base,
                    }
                )
            if n.parameters.get("allowUnauthorizedCerts") or n.parameters.get("ignoreSSLIssues"):
                findings.append(
                    {
                        "rule_id": "n8n.http.ssl_relaxed",
                        "severity": "high",
                        "message": "HTTP node relaxes TLS verification — high risk for production.",
                        **base,
                    }
                )
        if "webhook" in tl and wf.active is True:
            findings.append(
                {
                    "rule_id": "n8n.webhook.active_workflow",
                    "severity": "review",
                    "message": "Workflow is active and contains a Webhook — confirm production exposure and auth.",
                    **base,
                }
            )
        if _is_external_side_effect(t) and not _is_trigger_type(t):
            try:
                idx = next(i for i, x in enumerate(ordered) if x.name == n.name)
            except StopIteration:
                idx = 0
            prior = ordered[:idx]
            if not any(_is_manual_gate(p.type) for p in prior):
                findings.append(
                    {
                        "rule_id": "n8n.governance.no_manual_before_side_effect",
                        "severity": "review",
                        "message": "External side-effect node with no Manual / Form gate earlier in the inferred order — consider human approval for production.",
                        **base,
                    }
                )

    # Retry / error path: look for HTTP without error output wiring (simplified)
    for n in wf.nodes:
        if n.disabled or not _is_http_node(n.type):
            continue
        block = wf.connections.get(n.name)
        has_error_branch = False
        if isinstance(block, dict):
            err_out = block.get("error")
            if isinstance(err_out, list) and err_out:
                has_error_branch = True
        if not has_error_branch and isinstance(n.parameters, dict):
            if n.parameters.get("onError") in (None, "stop"):
                findings.append(
                    {
                        "rule_id": "n8n.http.no_error_output_branch",
                        "severity": "info",
                        "message": "HTTP node has no dedicated error output branch in connections — consider wiring error handling.",
                        "n8n_node_id": n.node_id,
                        "n8n_node_name": n.name,
                        "n8n_node_type": n.type,
                    }
                )

    return findings
