"""Torqa advanced static analysis (modular rules on canonical IR)."""

from torqa.analysis.engine import advanced_analysis_report, run_advanced_analysis
from torqa.analysis.types import RuleFinding

__all__ = [
    "RuleFinding",
    "run_advanced_analysis",
    "advanced_analysis_report",
]
