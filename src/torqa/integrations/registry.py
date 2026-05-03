"""Adapter registry — maps source_id strings to SourceAdapter factories.

Concrete adapters register at module load. CLI and other callers use
get_adapter(source_id) instead of constructing adapters directly.

Planned-but-not-implemented sources appear as AdapterEntry with
available=False; get_adapter raises NotImplementedError for them.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional

from torqa.integrations.base import SourceAdapter


@dataclass(frozen=True)
class AdapterEntry:
    """Registry entry for one source adapter."""

    source_id: str
    display_name: str
    description: str
    available: bool            # False → planned, not yet implemented
    tags: List[str] = field(default_factory=list)


_REGISTRY: Dict[str, AdapterEntry] = {}
_FACTORIES: Dict[str, Callable[[], SourceAdapter]] = {}


def register_adapter(
    entry: AdapterEntry,
    factory: Optional[Callable[[], SourceAdapter]] = None,
) -> None:
    """Register a source adapter entry and optional factory.

    Call this at module load to make a source available via get_adapter().
    Passing factory=None is valid for planned-but-unavailable adapters.
    """
    _REGISTRY[entry.source_id] = entry
    if factory is not None:
        _FACTORIES[entry.source_id] = factory


def get_adapter(source_id: str) -> SourceAdapter:
    """Return a SourceAdapter instance for source_id.

    Raises ValueError for unknown source_ids.
    Raises NotImplementedError for registered-but-unavailable sources.
    """
    entry = _REGISTRY.get(source_id)
    if entry is None:
        known = ", ".join(sorted(_REGISTRY))
        raise ValueError(
            f"Unknown source {source_id!r}. Registered sources: {known}"
        )
    if not entry.available:
        raise NotImplementedError(
            f"Adapter for {source_id!r} ({entry.display_name}) is not yet implemented. "
            f"Planned for a future release."
        )
    factory = _FACTORIES.get(source_id)
    if factory is None:
        raise RuntimeError(
            f"Adapter {source_id!r} is marked available but has no factory registered."
        )
    return factory()


def list_adapters() -> List[AdapterEntry]:
    """Return all registered adapter entries, sorted by source_id."""
    return sorted(_REGISTRY.values(), key=lambda e: e.source_id)


def list_available_adapters() -> List[AdapterEntry]:
    """Return only fully implemented adapter entries."""
    return [e for e in list_adapters() if e.available]


# ---------------------------------------------------------------------------
# Built-in registrations
# ---------------------------------------------------------------------------

def _make_n8n() -> SourceAdapter:
    from torqa.integrations.n8n.adapter import N8nAdapter
    return N8nAdapter()


def _make_github_actions() -> SourceAdapter:
    from torqa.integrations.github_actions.adapter import GitHubActionsAdapter
    return GitHubActionsAdapter()


def _make_agent() -> SourceAdapter:
    from torqa.integrations.agent.adapter import AgentAdapter
    return AgentAdapter()


register_adapter(
    AdapterEntry(
        source_id="n8n",
        display_name="n8n",
        description="n8n workflow automation — parses exported workflow JSON.",
        available=True,
        tags=["automation", "no-code", "self-hosted"],
    ),
    factory=_make_n8n,
)

register_adapter(
    AdapterEntry(
        source_id="github_actions",
        display_name="GitHub Actions",
        description="GitHub Actions CI/CD workflows — parses .github/workflows YAML.",
        available=True,
        tags=["ci-cd", "devops", "github"],
    ),
    factory=_make_github_actions,
)

register_adapter(
    AdapterEntry(
        source_id="agent",
        display_name="AI Agent",
        description="AI agent definitions — parses agent JSON for security and scope violations.",
        available=True,
        tags=["ai", "agent", "llm"],
    ),
    factory=_make_agent,
)
