"""
Built-in trust profile names (deterministic; no config files).
"""

from __future__ import annotations

from typing import FrozenSet, Literal

TrustProfileId = Literal["default", "strict", "review-heavy", "enterprise"]

BUILTIN_PROFILES: FrozenSet[str] = frozenset({"default", "strict", "review-heavy", "enterprise"})


def normalize_trust_profile(name: str) -> TrustProfileId:
    """
    Return canonical profile id or raise ValueError with a stable message.
    """
    key = name.strip().lower()
    if key == "review-heavy":
        return "review-heavy"
    if key == "enterprise":
        return "enterprise"
    if key == "strict":
        return "strict"
    if key == "default":
        return "default"
    raise ValueError(
        "Unknown trust profile "
        f"{name!r}; use one of: default, strict, review-heavy, enterprise"
    )
