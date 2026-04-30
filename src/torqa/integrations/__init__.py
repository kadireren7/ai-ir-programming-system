"""Source adapters (n8n, …) that produce canonical Torqa bundles — core IR stays agnostic."""

from torqa.integrations.registry import (
    AdapterEntry,
    get_adapter,
    list_adapters,
    list_available_adapters,
    register_adapter,
)

__all__ = [
    "AdapterEntry",
    "get_adapter",
    "list_adapters",
    "list_available_adapters",
    "register_adapter",
]
