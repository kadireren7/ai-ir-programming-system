"""Unit tests for deterministic readiness scoring."""

from __future__ import annotations

import pytest

from torqa.cli.readiness import format_readiness_line, readiness_score_100


def test_format_readiness_line():
    assert format_readiness_line(82) == "Readiness score: 82/100"


def test_score_zero_without_load():
    assert (
        readiness_score_100(
            load_ok=False,
            goal_ok=False,
            structural_ok=False,
            semantic_ok=False,
            policy_evaluated=False,
            policy_ok=False,
        )
        == 0
    )


def test_score_12_goal_only_failed():
    assert (
        readiness_score_100(
            load_ok=True,
            goal_ok=False,
            structural_ok=False,
            semantic_ok=False,
            policy_evaluated=False,
            policy_ok=False,
        )
        == 12
    )


def test_score_20_struct_failed():
    assert (
        readiness_score_100(
            load_ok=True,
            goal_ok=True,
            structural_ok=False,
            semantic_ok=False,
            policy_evaluated=False,
            policy_ok=False,
        )
        == 20
    )


def test_score_35_semantic_failed():
    assert (
        readiness_score_100(
            load_ok=True,
            goal_ok=True,
            structural_ok=True,
            semantic_ok=False,
            policy_evaluated=False,
            policy_ok=False,
        )
        == 35
    )


def test_score_50_policy_failed():
    assert (
        readiness_score_100(
            load_ok=True,
            goal_ok=True,
            structural_ok=True,
            semantic_ok=True,
            policy_evaluated=True,
            policy_ok=False,
        )
        == 50
    )


def test_score_100_best_case():
    assert (
        readiness_score_100(
            load_ok=True,
            goal_ok=True,
            structural_ok=True,
            semantic_ok=True,
            policy_evaluated=True,
            policy_ok=True,
            risk_level="low",
            review_required=False,
        )
        == 100
    )


@pytest.mark.parametrize(
    "risk,review,expected",
    [
        ("high", True, 85),
        ("medium", True, 90),
        ("low", True, 95),
        ("high", False, 90),
    ],
)
def test_score_policy_pass_variants(risk: str, review: bool, expected: int):
    assert (
        readiness_score_100(
            load_ok=True,
            goal_ok=True,
            structural_ok=True,
            semantic_ok=True,
            policy_evaluated=True,
            policy_ok=True,
            risk_level=risk,
            review_required=review,
        )
        == expected
    )
