"""Workflow bundle — top-level model wrapping any source's workflow."""

from torqa.bundle.model import (
    ExternalConnection,
    WorkflowBundle,
    WorkflowEdge,
    WorkflowNode,
)

__all__ = [
    "WorkflowBundle",
    "WorkflowNode",
    "WorkflowEdge",
    "ExternalConnection",
]
