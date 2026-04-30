"""WorkflowBundle — canonical top-level model for any automation source.

Pure data types only. No parsing, no analysis, no CLI interaction.
IRGoal (semantic repr) is optional — set after IR conversion step.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, Dict, List, Optional

if TYPE_CHECKING:
    from torqa.ir.canonical_ir import IRGoal


@dataclass
class WorkflowNode:
    """Single node / step within a workflow."""

    node_id: str
    name: str
    type: str                           # generic category: "trigger", "action", "condition", etc.
    platform_type: str                  # raw type string from source (e.g. "n8n-nodes-base.httpRequest")
    parameters: Dict[str, Any]
    credentials: List[str]              # credential names only — never values
    disabled: bool = False


@dataclass
class WorkflowEdge:
    """Directed connection between two nodes."""

    edge_id: str
    from_node: str                      # node_id
    to_node: str                        # node_id
    condition: Optional[str] = None     # branch condition label if any


@dataclass
class ExternalConnection:
    """Outbound connection to an external system or service."""

    connection_id: str
    target: str                         # URL, hostname, or service name
    auth_type: Optional[str] = None     # "api_key" | "oauth2" | "basic" | "none"
    guarded: bool = False               # True if access is gated by approval/condition


@dataclass
class WorkflowBundle:
    """Universal workflow container — source-agnostic.

    Produced by a SourceAdapter. Holds structural data (nodes/edges/connections)
    and optionally the semantic IRGoal after IR conversion.
    """

    bundle_id: str
    source: str                                 # "n8n" | "github_actions" | "agent" | "zapier"
    workflow_name: str
    workflow_id: Optional[str]
    nodes: List[WorkflowNode] = field(default_factory=list)
    edges: List[WorkflowEdge] = field(default_factory=list)
    external_connections: List[ExternalConnection] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)  # owner, severity, tags, etc.
    ir_goal: Optional[IRGoal] = None            # set after IR conversion; None until then
