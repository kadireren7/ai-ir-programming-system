"""PolicyPack — first-class governance pack objects replacing raw profile strings.

Each pack bundles threshold values, metadata, and the set of active rule IDs.
Existing profile strings ("default", "strict", ...) map 1-to-1 to pack_ids so
backward compatibility is fully maintained.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Union

from torqa.policy.risk_engine import ProfileRiskConfig

BUILTIN_RULE_IDS: List[str] = [
    "TORQA_EXT_001",
    "TORQA_RETRY_001",
    "TORQA_APPR_001",
    "TORQA_OBS_001",
    "TORQA_COST_001",
    "TORQA_COST_002",
    "TORQA_CYCLE_001",
    "TORQA_CYCLE_002",
    "TORQA_ORDER_001",
    "TORQA_IMPOSS_001",
    "TORQA_UNDEF_001",
]


@dataclass(frozen=True)
class PolicyPack:
    """Reusable governance pack: thresholds + metadata + active rule set."""

    pack_id: str
    name: str
    description: str
    min_trust_score: int
    severity_high_weight: int
    transition_band5_weight: int
    transition_band10_extra: int
    tags: List[str] = field(default_factory=list)
    rules: List[str] = field(default_factory=list)

    def to_risk_config(self) -> ProfileRiskConfig:
        """Extract the ProfileRiskConfig used by the scoring engine."""
        return ProfileRiskConfig(
            min_trust_score=self.min_trust_score,
            severity_high_weight=self.severity_high_weight,
            transition_band5_weight=self.transition_band5_weight,
            transition_band10_extra=self.transition_band10_extra,
        )

    def to_dict(self) -> Dict:
        return {
            "pack_id": self.pack_id,
            "name": self.name,
            "description": self.description,
            "min_trust_score": self.min_trust_score,
            "severity_high_weight": self.severity_high_weight,
            "transition_band5_weight": self.transition_band5_weight,
            "transition_band10_extra": self.transition_band10_extra,
            "tags": list(self.tags),
            "rules": list(self.rules),
        }


POLICY_PACK_REGISTRY: Dict[str, PolicyPack] = {
    "default": PolicyPack(
        pack_id="default",
        name="Default",
        description=(
            "Balanced governance for most automation workflows. "
            "Suitable for development and staging environments."
        ),
        min_trust_score=55,
        severity_high_weight=15,
        transition_band5_weight=12,
        transition_band10_extra=8,
        tags=["general", "development"],
        rules=BUILTIN_RULE_IDS,
    ),
    "strict": PolicyPack(
        pack_id="strict",
        name="Strict",
        description=(
            "Tighter thresholds for production-bound workflows. "
            "High-severity workflows are blocked at policy level."
        ),
        min_trust_score=70,
        severity_high_weight=20,
        transition_band5_weight=15,
        transition_band10_extra=10,
        tags=["production", "strict"],
        rules=BUILTIN_RULE_IDS,
    ),
    "review-heavy": PolicyPack(
        pack_id="review-heavy",
        name="Review-Heavy",
        description=(
            "Mandates manual review for any elevated-risk workflow. "
            "Lower floor than strict; more triggers for review_required."
        ),
        min_trust_score=65,
        severity_high_weight=18,
        transition_band5_weight=14,
        transition_band10_extra=9,
        tags=["review", "compliance"],
        rules=BUILTIN_RULE_IDS,
    ),
    "enterprise": PolicyPack(
        pack_id="enterprise",
        name="Enterprise",
        description=(
            "Maximum governance controls. "
            "Highest trust score floor and penalty weights across all categories."
        ),
        min_trust_score=80,
        severity_high_weight=22,
        transition_band5_weight=16,
        transition_band10_extra=12,
        tags=["enterprise", "production", "compliance"],
        rules=BUILTIN_RULE_IDS,
    ),
}


def resolve_policy_pack(identifier: Union[str, PolicyPack]) -> PolicyPack:
    """Resolve a pack_id string or PolicyPack instance to a PolicyPack.

    Raises ValueError for unknown pack_id strings.
    """
    if isinstance(identifier, PolicyPack):
        return identifier
    key = identifier.strip().lower()
    pack = POLICY_PACK_REGISTRY.get(key)
    if pack is None:
        known = ", ".join(sorted(POLICY_PACK_REGISTRY))
        raise ValueError(f"Unknown policy pack {identifier!r}; use one of: {known}")
    return pack
