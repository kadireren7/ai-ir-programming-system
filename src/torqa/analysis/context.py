"""Shared read-only context passed into every analysis rule."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Dict, Optional

if TYPE_CHECKING:
    from torqa.ir.canonical_ir import IRGoal
    from torqa.semantics.ir_semantics import IRFunctionSignature


@dataclass
class AnalysisContext:
    """Lazy helpers so rules stay small and testable."""

    ir_goal: "IRGoal"
    function_registry: Dict[str, "IRFunctionSignature"]
    _symbol_table: Optional[Dict[str, str]] = None

    @property
    def symbol_table(self) -> Dict[str, str]:
        if self._symbol_table is not None:
            return self._symbol_table
        from torqa.semantics.ir_semantics import build_ir_symbol_table

        try:
            self._symbol_table = build_ir_symbol_table(self.ir_goal)
        except ValueError:
            self._symbol_table = {}
        return self._symbol_table
