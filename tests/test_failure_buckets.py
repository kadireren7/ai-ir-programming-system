"""TORQA failure bucket classification (syntax / structure / semantic)."""

from __future__ import annotations

from src.diagnostics.failure_buckets import (
    BUCKET_SEMANTIC,
    BUCKET_STRUCTURE,
    BUCKET_SYNTAX,
    classify_from_diagnostic_issue,
    classify_parse_stage_exception,
)
from src.diagnostics.formal_phases import formal_phase_for_issue
from src.surface.parse_tq import TQParseError


def test_tq_parse_is_syntax() -> None:
    ex = TQParseError("PX_TQ_X", "bad")
    assert classify_parse_stage_exception(ex) == BUCKET_SYNTAX


def test_shape_duplicate_px_parse_failed_is_structure() -> None:
    issue = {
        "code": "PX_PARSE_FAILED",
        "phase": "structural",
        "formal_phase": formal_phase_for_issue("PX_PARSE_FAILED", "structural"),
        "message": "Bundle IR shape invalid (ValueError): IR symbol table: duplicate input name 'x'.",
    }
    assert classify_from_diagnostic_issue(issue) == BUCKET_STRUCTURE


def test_sem_unknown_effect() -> None:
    issue = {
        "code": "PX_SEM_UNKNOWN_EFFECT",
        "phase": "semantic",
        "formal_phase": formal_phase_for_issue("PX_SEM_UNKNOWN_EFFECT", "semantic"),
        "message": "unknown effect",
    }
    assert classify_from_diagnostic_issue(issue) == BUCKET_SEMANTIC


def test_envelope_is_structure() -> None:
    issue = {
        "code": "PX_UNSPECIFIED",
        "phase": "envelope",
        "formal_phase": formal_phase_for_issue("PX_UNSPECIFIED", "envelope"),
        "message": "unknown key",
    }
    assert classify_from_diagnostic_issue(issue) == BUCKET_STRUCTURE
