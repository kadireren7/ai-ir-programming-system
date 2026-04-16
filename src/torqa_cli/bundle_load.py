"""
Load Torqa bundle JSON from disk — full envelope or bare ``ir_goal`` object.

Used by the CLI; keeps behavior deterministic and errors explicit.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from src.ir.canonical_ir import validate_bundle_envelope

# Minimum keys for a bare ``ir_goal`` object (matches wire shape expected by ``ir_goal_from_json``).
# Align with ``spec/IR_BUNDLE.schema.json`` ``ir_goal`` required keys (``result`` is optional on wire).
_IR_GOAL_REQUIRED = frozenset(
    {
        "goal",
        "inputs",
        "preconditions",
        "forbids",
        "transitions",
        "postconditions",
        "metadata",
    }
)


def load_bundle_from_json_bytes(raw: bytes, *, path_hint: str = "") -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Parse JSON bytes into a bundle dict ``{"ir_goal": ...}`` or return ``(None, error_message)``.
    Accepts:
    - Full bundle: ``{"ir_goal": {...}, "library_refs"?: [...]}``
    - Bare ``ir_goal``: top-level object with all required ir_goal keys (wrapped automatically).
    """
    prefix = f"{path_hint}: " if path_hint else ""
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as ex:
        return None, f"{prefix}file must be UTF-8: {ex}"

    try:
        data = json.loads(text)
    except json.JSONDecodeError as ex:
        return (
            None,
            f"{prefix}invalid JSON syntax ({ex.msg} at line {ex.lineno}, column {ex.colno}).",
        )

    if not isinstance(data, dict):
        return None, f"{prefix}JSON root must be an object, not {type(data).__name__}."

    if "ir_goal" in data:
        if not isinstance(data["ir_goal"], dict):
            return None, f"{prefix}bundle key \"ir_goal\" must be a JSON object."
        env_errs = validate_bundle_envelope(data)
        if env_errs:
            return None, prefix + "; ".join(env_errs)
        return data, None

    if "library_refs" in data:
        return None, (
            f"{prefix}JSON has \"library_refs\" but no \"ir_goal\"; "
            "use a bundle object: {{\"ir_goal\": {{...}}, \"library_refs\": [...]}}."
        )

    _allowed_naked = _IR_GOAL_REQUIRED | {"result"}
    unknown = set(data.keys()) - _allowed_naked
    if unknown:
        return None, (
            f"{prefix}unknown keys in bare ir_goal JSON: {sorted(unknown)}. "
            f"Allowed top-level keys: {sorted(_allowed_naked)}."
        )

    missing = _IR_GOAL_REQUIRED - data.keys()
    if missing:
        return None, (
            f"{prefix}JSON must be either a bundle {{\"ir_goal\": {{...}}}} or a bare ir_goal object "
            f"with at least keys {sorted(_IR_GOAL_REQUIRED)}. Missing: {sorted(missing)}."
        )

    return {"ir_goal": data}, None


def load_bundle_from_json_path(path: Path) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    try:
        raw = path.read_bytes()
    except OSError as ex:
        return None, f"{path}: {ex}"
    return load_bundle_from_json_bytes(raw, path_hint=str(path))
