"""Rule: identifiers in postconditions not covered by inputs or prior writes."""

from __future__ import annotations

from typing import List, Set

from torqa.analysis.context import AnalysisContext
from torqa.analysis.rules._helpers import transition_writes
from torqa.analysis.types import RuleFinding
from torqa.semantics.ir_semantics import extract_ir_identifiers


def rule_undefined_references(ctx: AnalysisContext) -> List[RuleFinding]:
    inputs = {inp.name for inp in ctx.ir_goal.inputs}
    written: Set[str] = set()
    findings: List[RuleFinding] = []

    for t in ctx.ir_goal.transitions:
        written |= transition_writes(t, ctx.function_registry)

    for i, c in enumerate(ctx.ir_goal.postconditions):
        ids = extract_ir_identifiers(c.expr)
        unknown = ids - inputs - written
        if unknown:
            findings.append(
                RuleFinding(
                    code="TORQA_UNDEF_001",
                    severity="warning",
                    explanation=(
                        f"Postcondition {c.condition_id} references {sorted(unknown)!r}, which are not workflow "
                        "inputs and are not written by any modeled transition."
                    ),
                    fix_suggestion=(
                        "Declare these as inputs, add transitions that establish them in the registry writes map, "
                        "or narrow the postcondition to identifiers your executor guarantees."
                    ),
                    detail=f"postconditions[{i}]",
                )
            )
    return findings
