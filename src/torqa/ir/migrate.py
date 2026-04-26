"""Deterministic IR bundle migration between documented versions."""

from __future__ import annotations

import copy
from typing import Any, Dict, Tuple

from torqa.ir.canonical_ir import CANONICAL_IR_VERSION, ir_goal_from_json, ir_goal_to_json, validate_ir


def migrate_ir_bundle(bundle: Dict[str, Any], from_version: str, to_version: str) -> Tuple[Dict[str, Any], list[str]]:
    """
    Returns (new_bundle, warnings). Raises ValueError on unsupported migration.
    Supported: identity; **1.3 → 1.4** (metadata ir_version bump, same IR shape).
    """
    warnings: list[str] = []
    if from_version == to_version:
        return copy.deepcopy(bundle), warnings
    if from_version == "1.3" and to_version == "1.4":
        b = copy.deepcopy(bundle)
        ig = b.get("ir_goal")
        if not isinstance(ig, dict):
            raise ValueError("migrate_ir_bundle: bundle must contain an object ir_goal.")
        md = ig.setdefault("metadata", {})
        if not isinstance(md, dict):
            raise ValueError("migrate_ir_bundle: ir_goal.metadata must be an object.")
        md["ir_version"] = "1.4"
        g = ir_goal_from_json(b)
        errs = validate_ir(g)
        if errs:
            raise ValueError("migrate_ir_bundle: result fails validate_ir: " + "; ".join(errs[:8]))
        warnings.append("Migrated bundle ir_version from 1.3 to 1.4 (shape unchanged).")
        out = ir_goal_to_json(g)
        if isinstance(b.get("library_refs"), list):
            out["library_refs"] = copy.deepcopy(b["library_refs"])
        return out, warnings
    if to_version != CANONICAL_IR_VERSION:
        raise ValueError(f"Unsupported target ir_version: {to_version!r}")
    if from_version != CANONICAL_IR_VERSION:
        raise ValueError(
            f"No migration path implemented from {from_version!r} to {to_version!r}. "
            "See docs/concepts.md for versioning notes."
        )
    g = ir_goal_from_json(bundle)
    if g.metadata.get("ir_version") != from_version:
        warnings.append("Bundle metadata ir_version does not match from_version; normalizing metadata only.")
    g.metadata["ir_version"] = to_version
    return ir_goal_to_json(g), warnings
