"""
Parse exported n8n workflow JSON (editor export shape: nodes + connections).

Does not call n8n or the network — structure-only.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Mapping, Optional, Set, Tuple


@dataclass
class N8nNode:
    node_id: str
    name: str
    type: str
    type_version: Any
    parameters: Dict[str, Any] = field(default_factory=dict)
    credentials: Optional[Dict[str, Any]] = None
    disabled: bool = False


@dataclass
class N8nWorkflow:
    """Normalized view of an n8n workflow export."""

    name: str
    workflow_id: Optional[str]
    active: Optional[bool]
    nodes: List[N8nNode]
    connections: Dict[str, Any]
    raw: Dict[str, Any]


def is_n8n_export_shape(data: Any) -> bool:
    """Heuristic: object with ``nodes`` array of dicts containing ``type`` and ``id``."""
    if not isinstance(data, dict):
        return False
    nodes = data.get("nodes")
    if not isinstance(nodes, list) or not nodes:
        return False
    first = nodes[0]
    if not isinstance(first, dict):
        return False
    if "type" not in first or "id" not in first:
        return False
    # n8n node types are dotted strings; Torqa bundles never use this root shape.
    return "connections" in data or isinstance(data.get("connections"), dict)


def _unwrap_export(data: Dict[str, Any]) -> Dict[str, Any]:
    inner = data.get("data")
    if isinstance(inner, dict) and isinstance(inner.get("nodes"), list):
        return inner
    return data


def parse_n8n_export(data: Mapping[str, Any]) -> Tuple[Optional[N8nWorkflow], Optional[str]]:
    root = dict(data) if isinstance(data, Mapping) else None
    if root is None:
        return None, "n8n: root JSON must be an object"
    doc = _unwrap_export(root)
    nodes_raw = doc.get("nodes")
    if not isinstance(nodes_raw, list):
        return None, 'n8n: missing or invalid "nodes" array'
    nodes: List[N8nNode] = []
    for i, n in enumerate(nodes_raw):
        if not isinstance(n, dict):
            return None, f"n8n: nodes[{i}] must be an object"
        nid = n.get("id")
        name = n.get("name")
        typ = n.get("type")
        if not isinstance(nid, str) or not isinstance(name, str) or not isinstance(typ, str):
            return None, f"n8n: nodes[{i}] needs string id, name, type"
        nodes.append(
            N8nNode(
                node_id=nid,
                name=name,
                type=typ,
                type_version=n.get("typeVersion"),
                parameters=n.get("parameters") if isinstance(n.get("parameters"), dict) else {},
                credentials=n.get("credentials") if isinstance(n.get("credentials"), dict) else None,
                disabled=bool(n.get("disabled")),
            )
        )
    con = doc.get("connections")
    connections: Dict[str, Any] = con if isinstance(con, dict) else {}
    name = doc.get("name")
    if not isinstance(name, str) or not name.strip():
        name = "n8n_workflow"
    wf_id = doc.get("id")
    wf_id_s = wf_id if isinstance(wf_id, str) else None
    active = doc.get("active")
    act = active if isinstance(active, bool) else None
    return N8nWorkflow(
        name=name.strip(),
        workflow_id=wf_id_s,
        active=act,
        nodes=nodes,
        connections=connections,
        raw=dict(doc),
    ), None


def _targets_from_connection_block(block: Any) -> List[Tuple[str, int]]:
    """Return list of (target_node_name, input_index) from one node's ``main`` output."""
    out: List[Tuple[str, int]] = []
    if not isinstance(block, dict):
        return out
    main = block.get("main")
    if not isinstance(main, list):
        return out
    for branch in main:
        if not isinstance(branch, list):
            continue
        for link in branch:
            if not isinstance(link, dict):
                continue
            node = link.get("node")
            idx = link.get("index", 0)
            if isinstance(node, str):
                out.append((node, int(idx) if isinstance(idx, int) else 0))
    return out


def build_adjacency(wf: N8nWorkflow) -> Dict[str, List[str]]:
    """Outgoing edges: source node **name** -> list of target node **names** (order preserved)."""
    adj: Dict[str, List[str]] = {n.name: [] for n in wf.nodes}
    for src_name, block in wf.connections.items():
        if src_name not in adj:
            continue
        for tgt, _ in _targets_from_connection_block(block):
            if tgt in adj:
                adj[src_name].append(tgt)
    return adj


def entry_node_names(wf: N8nWorkflow) -> List[str]:
    """Nodes with no incoming edge from another workflow node (by name)."""
    names = {n.name for n in wf.nodes}
    incoming: Set[str] = set()
    for src, block in wf.connections.items():
        if src not in names:
            continue
        for tgt, _ in _targets_from_connection_block(block):
            if tgt in names:
                incoming.add(tgt)
    roots = [n.name for n in wf.nodes if n.name not in incoming]
    if roots:
        return roots
    # cycle or empty connections — fall back to first node
    return [wf.nodes[0].name] if wf.nodes else []


def order_nodes_linear(wf: N8nWorkflow) -> Tuple[List[N8nNode], List[str]]:
    """
    BFS from entry roots; append any unreachable nodes at the end.
    Returns (ordered_nodes, warnings).
    """
    warnings: List[str] = []
    name_to_node = {n.name: n for n in wf.nodes}
    adj = build_adjacency(wf)
    roots = entry_node_names(wf)
    seen: Set[str] = set()
    order_names: List[str] = []
    queue = list(roots)
    while queue:
        cur = queue.pop(0)
        if cur in seen or cur not in name_to_node:
            continue
        seen.add(cur)
        order_names.append(cur)
        for nxt in adj.get(cur, []):
            if nxt not in seen:
                queue.append(nxt)
    for n in wf.nodes:
        if n.name not in seen:
            warnings.append(f"n8n: node {n.name!r} ({n.node_id}) appears disconnected from entry flow")
            order_names.append(n.name)
            seen.add(n.name)
    ordered = [name_to_node[nm] for nm in order_names if nm in name_to_node]
    return ordered, warnings
