"""
Built-in trust profile names (deterministic; no config files).
"""

from __future__ import annotations

from typing import FrozenSet, Literal

TrustProfileId = Literal["default", "strict", "review-heavy", "enterprise"]

BUILTIN_PROFILES: FrozenSet[str] = frozenset({"default", "strict", "review-heavy", "enterprise"})


def normalize_trust_profile(name: str) -> TrustProfileId:
    """Return canonical profile id or raise ValueError with a stable message.

    Derives valid names from POLICY_PACK_REGISTRY so any registered pack is
    automatically accepted. The returned type is still TrustProfileId for the
    four built-in packs; custom packs share the same validation path.
    """
    from torqa.policy.packs import POLICY_PACK_REGISTRY

    key = name.strip().lower()
    if key in POLICY_PACK_REGISTRY:
        return key  # type: ignore[return-value]
    known = ", ".join(sorted(POLICY_PACK_REGISTRY))
    raise ValueError(f"Unknown trust profile {name!r}; use one of: {known}")
