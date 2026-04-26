"""
Load Torqa bundle JSON from disk — full envelope, bare ``ir_goal``, or an array of bundles.

Used by the CLI; keeps behavior deterministic and errors explicit with JSON path hints.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

from torqa.ir.canonical_ir import validate_bundle_envelope

# Minimum keys for a bare ``ir_goal`` object (matches wire shape expected by ``ir_goal_from_json``).
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

# Single normalized bundle, or a list of them (JSON array at root).
BundleLoadResult = Union[Dict[str, Any], List[Dict[str, Any]]]


def _normalize_bundle_dict(data: Dict[str, Any], path: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Normalize one bundle-shaped dict to ``{\"ir_goal\": ...}``.
    ``path`` is a hint such as ``file.json`` or ``file.json[2]`` for error messages.
    """
    if "ir_goal" in data:
        if not isinstance(data["ir_goal"], dict):
            return None, f'{path}: key \"ir_goal\" must be a JSON object, not {type(data["ir_goal"]).__name__}.'
        env_errs = validate_bundle_envelope(data)
        if env_errs:
            return None, f"{path}: " + "; ".join(env_errs)
        return data, None

    if "library_refs" in data:
        return None, (
            f'{path}: key \"library_refs\" is present without \"ir_goal\"; '
            "use a bundle object: {\"ir_goal\": {...}, \"library_refs\": [...]}."
        )

    _allowed_naked = _IR_GOAL_REQUIRED | {"result"}
    unknown = set(data.keys()) - _allowed_naked
    if unknown:
        return None, (
            f"{path}: unknown keys in bare ir_goal object: {sorted(unknown)}. "
            f"Allowed top-level keys: {sorted(_allowed_naked)}."
        )

    missing = _IR_GOAL_REQUIRED - data.keys()
    if missing:
        return None, (
            f"{path}: expected a bundle {{\"ir_goal\": {{...}}}} or a bare ir_goal object "
            f"with keys {sorted(_IR_GOAL_REQUIRED)}. Missing: {sorted(missing)}."
        )

    return {"ir_goal": data}, None


def load_bundle_from_json_bytes(raw: bytes, *, path_hint: str = "") -> Tuple[Optional[BundleLoadResult], Optional[str]]:
    """
    Parse JSON bytes into one bundle dict ``{\"ir_goal\": ...}``, a list of such bundles,
    or return ``(None, error_message)``.

    Accepts:

    - **Full bundle:** ``{\"ir_goal\": {...}, \"library_refs\"?: [...]}``
    - **Bare ir_goal:** top-level object with required ir_goal keys (wrapped automatically).
    - **Batch:** JSON array of the above objects, e.g. ``[ {...}, {...} ]``.
    """
    prefix = path_hint if path_hint else "<input>"
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as ex:
        return None, f"{prefix}: file must be UTF-8: {ex}"

    try:
        data = json.loads(text)
    except json.JSONDecodeError as ex:
        return (
            None,
            f"{prefix}: invalid JSON syntax ({ex.msg} at line {ex.lineno}, column {ex.colno}).",
        )

    if isinstance(data, list):
        if len(data) == 0:
            return None, f"{prefix}: JSON array is empty (expected one or more bundle objects)."
        out: List[Dict[str, Any]] = []
        for i, item in enumerate(data):
            ip = f"{prefix}[{i}]"
            if not isinstance(item, dict):
                return None, f"{ip}: expected object, got {type(item).__name__}."
            b, err = _normalize_bundle_dict(item, ip)
            if err:
                return None, err
            out.append(b)
        return out, None

    if isinstance(data, dict):
        b, err = _normalize_bundle_dict(data, prefix)
        if err:
            return None, err
        return b, None

    return (
        None,
        f"{prefix}: JSON root must be an object or an array of objects, not {type(data).__name__}.",
    )


def load_bundle_from_json_path(path: Path) -> Tuple[Optional[BundleLoadResult], Optional[str]]:
    try:
        raw = path.read_bytes()
    except OSError as ex:
        return None, f"{path}: {ex}"
    return load_bundle_from_json_bytes(raw, path_hint=str(path.resolve()))
