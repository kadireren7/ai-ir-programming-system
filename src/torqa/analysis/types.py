"""Structured findings for the modular static-analysis rule engine."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Literal, Optional

Severity = Literal["error", "warning", "info"]


@dataclass(frozen=True)
class RuleFinding:
    """One issue produced by a single analysis rule (stable contract for tests and JSON)."""

    code: str
    severity: Severity
    explanation: str
    fix_suggestion: str
    detail: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        d: Dict[str, Any] = {
            "code": self.code,
            "severity": self.severity,
            "explanation": self.explanation,
            "fix_suggestion": self.fix_suggestion,
        }
        if self.detail is not None:
            d["detail"] = self.detail
        return d

    def legacy_message(self) -> str:
        """Single-line message merged into semantic errors/warnings for CLI parity."""
        base = f"{self.code}: {self.explanation}"
        if self.detail:
            base = f"{base} [{self.detail}]"
        return f"{base} — Fix: {self.fix_suggestion}"


def merge_findings_into_lists(
    findings: List[RuleFinding],
) -> tuple[List[str], List[str], List[Dict[str, Any]]]:
    """Split findings into errors, warnings, and info dicts."""
    errors: List[str] = []
    warnings: List[str] = []
    info: List[Dict[str, Any]] = []
    for f in findings:
        if f.severity == "error":
            errors.append(f.legacy_message())
        elif f.severity == "warning":
            warnings.append(f.legacy_message())
        else:
            info.append(f.to_dict())
    return errors, warnings, info
