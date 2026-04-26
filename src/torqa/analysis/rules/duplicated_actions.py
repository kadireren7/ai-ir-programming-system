"""Rule: duplicate equivalent transitions or conditions (determinism)."""

from __future__ import annotations

from typing import List

from torqa.analysis.context import AnalysisContext
from torqa.analysis.types import RuleFinding
from torqa.ir.canonical_ir import validate_ir_semantic_determinism


def rule_duplicated_actions(ctx: AnalysisContext) -> List[RuleFinding]:
    msgs = validate_ir_semantic_determinism(ctx.ir_goal)
    return [
        RuleFinding(
            code="TORQA_DUP_001",
            severity="error",
            explanation=msg,
            fix_suggestion=(
                "Remove or differentiate the duplicate entry so normalized IR is unique, or merge redundant "
                "branches into a single condition/transition."
            ),
            detail="duplicated_actions",
        )
        for msg in msgs
    ]
