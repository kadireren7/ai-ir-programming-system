"""GovernanceReport — typed report contract for workflow governance decisions.

Pure data types only. Replaces ad-hoc dicts in a future migration step.
Existing CLI output is NOT changed yet — this contract is forward-only.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Literal, Optional


@dataclass
class Evidence:
    """Source-mapped evidence for a finding."""

    source_location: Optional[str] = None  # node_id, transition_id, or "file:line"
    raw_excerpt: Optional[str] = None      # relevant snippet from source data


@dataclass
class Finding:
    """Single governance finding produced by a rule or policy check."""

    finding_id: str
    code: str                              # TORQA_XXX_NNN rule code
    severity: Literal["error", "warning", "info"]
    title: str
    explanation: str
    fix_suggestion: str
    evidence: List[Evidence] = field(default_factory=list)
    rule_pack: Optional[str] = None        # policy pack that triggered this finding


@dataclass
class GovernanceReport:
    """Top-level governance report for a single WorkflowBundle evaluation.

    decision:
        "pass"   — score >= threshold, no policy errors
        "review" — high severity findings or score near threshold
        "block"  — policy hard errors present
    """

    bundle_id: str
    source: str                            # "n8n" | "github_actions" | "agent" | etc.
    workflow_name: str
    decision: Literal["pass", "review", "block"]
    trust_score: int                       # 0-100
    trust_tier: Literal["low", "medium", "high"]
    findings: List[Finding] = field(default_factory=list)
    policy_pack: str = "default"
    ir_version: str = "1.4"
    deterministic: bool = True
