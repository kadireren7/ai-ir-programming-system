"""Governance report contract — typed output for any workflow evaluation."""

from torqa.report.contract import Evidence, Finding, GovernanceReport
from torqa.report.builder import (
    governance_report_blocked,
    governance_report_from_policy,
    governance_report_to_dict,
)

__all__ = [
    "GovernanceReport",
    "Finding",
    "Evidence",
    "governance_report_from_policy",
    "governance_report_blocked",
    "governance_report_to_dict",
]
