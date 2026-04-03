"""
P24 — Controlled Rust concentration: structural IR validation via rust-core bridge.

**Why this area:** ``rust-core/src/ir/validate.rs`` already implements a compact structural
walk aligned with the canonical IR shape. Surfacing it next to Python diagnostics improves
visibility for maintainers without moving the product pipeline.

**Remains Python (authoritative for now):** ``canonical_ir.validate_ir`` (stricter condition_id
patterns, kind checks, metadata keys), envelope checks, full ``build_full_diagnostic_report``,
``materialize_project``, and CLI ``validate``.

**Do not migrate yet (P24 scope):** handoff compatibility, semantic determinism, semantic
registry checks, diagnostics hint attachment, self-host bundles, or CLI entrypoints.

TORQA stays the product; this module is a narrow optional bridge + digest only.
"""

from __future__ import annotations

from typing import Any, Dict

from src.ir.canonical_ir import IRGoal, ir_goal_to_json


def rust_structural_validation_digest(ir_goal: IRGoal) -> Dict[str, Any]:
    """
    Call rust-core ``validate_ir`` action; return a small structured digest.

    On bridge failure (no toolchain, timeout, etc.), ``bridge_ok`` is False and callers
    should rely on Python validation only.
    """
    envelope = {"ir_goal": ir_goal_to_json(ir_goal)}
    return rust_structural_validation_digest_from_bundle(envelope)


def rust_structural_validation_digest_from_bundle(envelope: Dict[str, Any]) -> Dict[str, Any]:
    """Same as ``rust_structural_validation_digest`` but accepts a bundle-shaped dict."""
    from src.bridge.rust_bridge import rust_validate_ir

    resp = rust_validate_ir(envelope)
    if not resp.get("ok"):
        return {
            "bridge_ok": False,
            "error": resp.get("error"),
            "detail": resp.get("detail"),
            "ir_valid": None,
            "validation_error_count": None,
            "fingerprint": None,
        }
    result = resp.get("result") or {}
    errs = list(result.get("validation_errors") or [])
    return {
        "bridge_ok": True,
        "error": None,
        "detail": None,
        "ir_valid": bool(result.get("ir_valid")),
        "validation_error_count": len(errs),
        "fingerprint": result.get("fingerprint"),
    }
