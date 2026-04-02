"""
Line-oriented `.pxir` subset → IR bundle envelope (``ir_goal`` only).

Transitional surface; see also **`.tq`** in `src/surface/parse_tq.py` and `examples/torqa/`.
This is not a full grammar; it is a **reference surface** for tooling and demos.
"""

from __future__ import annotations

from typing import Any, Dict, List

from src.ir.canonical_ir import CANONICAL_IR_VERSION, DEFAULT_IR_METADATA


def _ident_expr(name: str) -> Dict[str, Any]:
    return {"type": "identifier", "name": name}


def _call_expr(name: str, arg_names: List[str]) -> Dict[str, Any]:
    return {
        "type": "call",
        "name": name,
        "arguments": [_ident_expr(n) for n in arg_names],
    }


def parse_pxir_source(text: str) -> Dict[str, Any]:
    goal = ""
    inputs: List[Dict[str, str]] = []
    preconditions: List[Dict[str, Any]] = []
    transitions: List[Dict[str, Any]] = []
    result_val: Any = "OK"

    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split()
        kw = parts[0].lower()
        if kw == "goal" and len(parts) >= 2:
            goal = parts[1]
        elif kw == "input" and len(parts) >= 3:
            inputs.append({"name": parts[1], "type": parts[2]})
        elif kw == "require" and len(parts) >= 4:
            cid = parts[1]
            kind = parts[2]
            if kind == "exists" and len(parts) >= 4:
                ident = parts[3]
                expr = _call_expr("exists", [ident])
            elif kind == "verify_username" and len(parts) >= 4:
                expr = _call_expr("verify_username", [parts[3]])
            elif kind == "verify_password" and len(parts) >= 5:
                expr = _call_expr("verify_password", [parts[3], parts[4]])
            else:
                raise ValueError(f"Unsupported require form: {line!r}")
            preconditions.append({"condition_id": cid, "kind": "require", "expr": expr})
        elif kw == "transition" and len(parts) >= 6:
            tid, eff = parts[1], parts[2]
            if "before" not in parts or "after" not in parts:
                raise ValueError(f"transition must include before and after: {line!r}")
            bi = parts.index("before")
            ai = parts.index("after")
            if bi >= ai:
                raise ValueError(f"Invalid transition states: {line!r}")
            arg_names = parts[3:bi]
            transitions.append(
                {
                    "transition_id": tid,
                    "effect_name": eff,
                    "arguments": [_ident_expr(n) for n in arg_names],
                    "from_state": "before",
                    "to_state": "after",
                }
            )
        elif kw == "result" and len(parts) >= 2:
            result_val = " ".join(parts[1:]).strip() or None
        else:
            raise ValueError(f"Unrecognized surface line: {line!r}")

    if not goal:
        raise ValueError("surface: missing goal line")

    md = dict(DEFAULT_IR_METADATA)
    md["ir_version"] = CANONICAL_IR_VERSION
    md["source_map"] = {"available": True, "prototype_only": True, "surface": "pxir_subset"}

    return {
        "ir_goal": {
            "goal": goal,
            "inputs": inputs,
            "preconditions": preconditions,
            "forbids": [],
            "transitions": transitions,
            "postconditions": [],
            "result": result_val,
            "metadata": md,
        }
    }
