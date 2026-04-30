"""SourceAdapter — protocol all integration adapters must satisfy.

Pure interface definition. Concrete adapters live in integrations/{source}/.
Existing n8n code is NOT changed — this protocol describes its future shape.
"""

from __future__ import annotations

from typing import Any, Dict, List, Protocol, runtime_checkable

from torqa.bundle.model import WorkflowBundle


@runtime_checkable
class SourceAdapter(Protocol):
    """Adapter protocol for converting a source workflow format into a WorkflowBundle.

    Implementing classes must provide three methods forming a pipeline:
        raw dict  →  parse()  →  source-native struct
        source-native struct  →  to_bundle()  →  WorkflowBundle
        source-native struct  →  analyze()  →  pre-IR findings list
    """

    source_id: str          # machine identifier: "n8n", "github_actions", "zapier", etc.
    display_name: str       # human label: "n8n", "GitHub Actions", "Zapier", etc.

    def parse(self, raw: Dict[str, Any]) -> Any:
        """Parse raw source JSON/dict into a source-native intermediate struct.

        Returns the native struct or raises ValueError on invalid input.
        """
        ...

    def to_bundle(self, parsed: Any) -> WorkflowBundle:
        """Convert source-native struct into a WorkflowBundle.

        Must populate nodes, edges, external_connections, and metadata.
        ir_goal may be left as None — set by a later IR conversion step.
        """
        ...

    def analyze(self, parsed: Any) -> List[Dict[str, Any]]:
        """Run source-specific pre-IR analysis and return findings.

        Each finding dict must contain at minimum:
            {"code": str, "severity": "error"|"warning"|"info", "explanation": str}
        """
        ...
