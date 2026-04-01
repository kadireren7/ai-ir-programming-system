"""
Gate AI-produced bundles before merge / registry promotion (SELF_EVOLUTION_PIPELINE §3–4).

Combines envelope checks, full diagnostics (including formal_phase), and light policy scans.
"""

from __future__ import annotations

import json
import re
from typing import Any, Dict, List

from src.diagnostics.report import build_full_diagnostic_report
from src.ir.canonical_ir import ir_goal_from_json, validate_bundle_envelope

# crude guardrails — extend with org policy
_SECRET_PATTERNS = (
    re.compile(r"sk-[A-Za-z0-9]{20,}", re.I),
    re.compile(r"api[_-]?key\s*[:=]\s*['\"][^'\"]{8,}", re.I),
    re.compile(r"BEGIN (RSA |OPENSSH )?PRIVATE KEY", re.I),
)


def _scan_bundle_text_for_secrets(text: str) -> List[str]:
    hits: List[str] = []
    for pat in _SECRET_PATTERNS:
        if pat.search(text):
            hits.append(f"policy: possible secret material matched {pat.pattern[:40]}...")
    return hits


def evaluate_ai_proposal(bundle: Dict[str, Any]) -> Dict[str, Any]:
    """
    Returns a dict with:
      rejected (bool), reasons (str list), envelope_errors, diagnostics, secret_hints
    """
    envelope_errors = validate_bundle_envelope(bundle)
    secret_hints = _scan_bundle_text_for_secrets(json.dumps(bundle, ensure_ascii=False))

    diag_block: Dict[str, Any] = {}
    parse_error: str | None = None
    try:
        goal = ir_goal_from_json(bundle)
        diag_block = build_full_diagnostic_report(
            goal, bundle_envelope_errors=envelope_errors
        )
    except Exception as ex:
        parse_error = str(ex)
        diag_block = {"ok": False, "issues": [], "warnings": [], "parse_error": parse_error}

    rejected = bool(
        envelope_errors
        or secret_hints
        or parse_error
        or not diag_block.get("ok", False)
    )
    reasons: List[str] = list(envelope_errors)
    reasons.extend(secret_hints)
    if parse_error:
        reasons.append(f"ir_parse: {parse_error}")
    if not diag_block.get("ok", False) and not parse_error:
        for issue in diag_block.get("issues") or []:
            reasons.append(
                f"{issue.get('formal_phase', '?')}:{issue.get('code', '?')}: {issue.get('message', '')}"
            )

    return {
        "rejected": rejected,
        "reasons": reasons,
        "envelope_errors": envelope_errors,
        "diagnostics": diag_block,
        "secret_hints": secret_hints,
    }
