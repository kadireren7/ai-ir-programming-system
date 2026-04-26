"""Unit tests for deterministic CLI suggestion strings."""

from __future__ import annotations

from torqa.cli.suggestions import (
    suggestion_for_parse_code,
    suggestion_for_policy_line,
    suggested_fix_when_policy_passes,
)


def test_parse_suggestions_short_deterministic():
    assert suggestion_for_parse_code("PX_TQ_HEADER_ORDER") == "Use strict tq_v1 header order"
    assert suggestion_for_parse_code("PX_TQ_UNKNOWN_FLOW_STEP") == "Use supported flow steps"


def test_policy_suggestions_owner_severity_strict():
    assert (
        suggestion_for_policy_line(
            "Policy: metadata.surface_meta.owner is required (non-empty string)."
        )
        == "Add metadata owner"
    )
    assert (
        suggestion_for_policy_line(
            "Policy: metadata.surface_meta.severity is required (non-empty string)."
        )
        == "Add metadata severity"
    )
    assert (
        suggestion_for_policy_line(
            "Policy (strict): severity 'high' is not allowed; lower severity or use escalation."
        )
        == "Lower severity or use review path"
    )


def test_suggested_fix_when_policy_passes_safe():
    rep = {
        "policy_ok": True,
        "review_required": False,
        "risk_level": "low",
    }
    assert suggested_fix_when_policy_passes(rep) == "None - policy satisfied for this profile"


def test_suggested_fix_when_policy_passes_needs_review():
    rep = {
        "policy_ok": True,
        "review_required": True,
        "risk_level": "high",
    }
    assert "review" in suggested_fix_when_policy_passes(rep).lower()
