"""Built-in static analysis rules (order is stable for deterministic reports)."""

from __future__ import annotations

from typing import Callable, List, Tuple

from torqa.analysis.context import AnalysisContext
from torqa.analysis.rules.approval_steps import rule_approval_steps
from torqa.analysis.rules.circular_dependency import rule_circular_dependency
from torqa.analysis.rules.cost_risk import rule_cost_risk
from torqa.analysis.rules.duplicated_actions import rule_duplicated_actions
from torqa.analysis.rules.execution_order import rule_execution_order
from torqa.analysis.rules.external_access import rule_external_access
from torqa.analysis.rules.impossible_conditions import rule_impossible_conditions
from torqa.analysis.rules.observability import rule_observability
from torqa.analysis.rules.retry_strategy import rule_retry_strategy
from torqa.analysis.rules.undefined_references import rule_undefined_references
from torqa.analysis.types import RuleFinding

RuleFn = Callable[[AnalysisContext], List[RuleFinding]]

ALL_RULES: Tuple[RuleFn, ...] = (
    rule_impossible_conditions,
    rule_execution_order,
    rule_circular_dependency,
    rule_duplicated_actions,
    rule_undefined_references,
    rule_external_access,
    rule_approval_steps,
    rule_retry_strategy,
    rule_cost_risk,
    rule_observability,
)

__all__ = ["ALL_RULES", "RuleFn"]
