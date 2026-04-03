"""
Canonical language-independent IR (V1.4).

Pure data boundary for future Rust core engine: no parser, verifier, or runtime logic.
"""

from __future__ import annotations

import copy
import hashlib
import json
import math
import re
from typing import Any, Dict, List, Optional, Set, Tuple, Union

# --- Frozen handoff contract (Rust migration boundary) -----------------------------------------

CANONICAL_IR_VERSION = "1.4"

# --- Mandatory IR metadata (included in serialized IR) ----------------------------------------

DEFAULT_IR_METADATA: Dict[str, Any] = {
    "ir_version": CANONICAL_IR_VERSION,
    "source": "python_prototype",
    "canonical_language": "english",
    "source_map": {"available": True, "prototype_only": True},
}

_ALLOWED_INPUT_TYPES = frozenset({"text", "number", "boolean", "void", "unknown"})
_ALLOWED_SEMANTIC_TYPES = frozenset({"text", "number", "boolean", "void", "unknown"})
_ALLOWED_CONDITION_KINDS = frozenset({"require", "forbid", "postcondition"})
_ALLOWED_STATE_NAMES = frozenset({"before", "after"})


# --- IR expression nodes (pure data) ------------------------------------------------------------


class IRExpr:
    pass


class IRIdentifier(IRExpr):
    def __init__(self, name: str, semantic_type: Optional[str] = None):
        self.name = name
        self.semantic_type = semantic_type


class IRStringLiteral(IRExpr):
    def __init__(self, value: str):
        self.value = value


class IRNumberLiteral(IRExpr):
    def __init__(self, value: Union[int, float]):
        self.value = value


class IRBooleanLiteral(IRExpr):
    def __init__(self, value: bool):
        self.value = value


class IRCall(IRExpr):
    def __init__(self, name: str, arguments: List[IRExpr]):
        self.name = name
        self.arguments = arguments


class IRBinary(IRExpr):
    def __init__(self, left: IRExpr, operator: str, right: IRExpr):
        self.left = left
        self.operator = operator
        self.right = right


class IRLogical(IRExpr):
    def __init__(self, left: IRExpr, operator: str, right: IRExpr):
        self.left = left
        self.operator = operator
        self.right = right


# --- IR goal structures ------------------------------------------------------------------------


class IRInput:
    def __init__(self, name: str, type_name: str):
        self.name = name
        self.type_name = type_name


class IRCondition:
    def __init__(self, condition_id: str, kind: str, expr: IRExpr):
        self.condition_id = condition_id
        self.kind = kind
        self.expr = expr


class IRTransition:
    def __init__(
        self,
        transition_id: str,
        effect_name: str,
        arguments: List[IRExpr],
        from_state: str,
        to_state: str,
    ):
        self.transition_id = transition_id
        self.effect_name = effect_name
        self.arguments = arguments
        self.from_state = from_state
        self.to_state = to_state


class IRGoal:
    def __init__(
        self,
        goal: str,
        inputs: List[IRInput],
        preconditions: List[IRCondition],
        forbids: List[IRCondition],
        transitions: List[IRTransition],
        postconditions: List[IRCondition],
        result: Optional[str],
        metadata: Optional[Dict[str, Any]] = None,
    ):
        self.goal = goal
        self.inputs = inputs
        self.preconditions = preconditions
        self.forbids = forbids
        self.transitions = transitions
        self.postconditions = postconditions
        self.result = result
        merged: Dict[str, Any] = copy.deepcopy(DEFAULT_IR_METADATA)
        if metadata:
            merged.update(metadata)
        self.metadata = merged


# --- JSON serialization (stable, English-only keys) ----------------------------------------------


def _canonical_metadata_for_json(md: Dict[str, Any]) -> dict:
    """Recursively sort dict keys in metadata for stable JSON."""

    def walk(v: Any) -> Any:
        if isinstance(v, dict):
            return {k: walk(v[k]) for k in sorted(v.keys())}
        if isinstance(v, list):
            return [walk(x) for x in v]
        return v

    return walk(md)


def ir_expr_to_json(expr: IRExpr) -> dict:
    if isinstance(expr, IRIdentifier):
        out: dict = {"type": "identifier", "name": expr.name}
        if expr.semantic_type is not None:
            out["semantic_type"] = expr.semantic_type
        return out
    if isinstance(expr, IRStringLiteral):
        return {"type": "string_literal", "value": expr.value}
    if isinstance(expr, IRNumberLiteral):
        v = expr.value
        if isinstance(v, float) and v.is_integer():
            return {"type": "number_literal", "value": int(v)}
        return {"type": "number_literal", "value": v}
    if isinstance(expr, IRBooleanLiteral):
        return {"type": "boolean_literal", "value": expr.value}
    if isinstance(expr, IRCall):
        return {
            "type": "call",
            "name": expr.name,
            "arguments": [ir_expr_to_json(a) for a in expr.arguments],
        }
    if isinstance(expr, IRBinary):
        return {
            "type": "binary",
            "operator": expr.operator,
            "left": ir_expr_to_json(expr.left),
            "right": ir_expr_to_json(expr.right),
        }
    if isinstance(expr, IRLogical):
        return {
            "type": "logical",
            "operator": expr.operator,
            "left": ir_expr_to_json(expr.left),
            "right": ir_expr_to_json(expr.right),
        }
    raise TypeError(f"Unsupported IR expression type: {type(expr)!r}")


def ir_expr_from_json(obj: Any) -> IRExpr:
    """Deserialize IR expression from canonical JSON (inverse of ir_expr_to_json)."""
    if not isinstance(obj, dict):
        raise TypeError(f"ir_expr_from_json: expected dict, got {type(obj)!r}")
    t = obj.get("type")
    if t == "identifier":
        st = obj.get("semantic_type")
        return IRIdentifier(str(obj["name"]), semantic_type=st if st is not None else None)
    if t == "string_literal":
        return IRStringLiteral(str(obj["value"]))
    if t == "number_literal":
        return IRNumberLiteral(obj["value"])
    if t == "boolean_literal":
        return IRBooleanLiteral(bool(obj["value"]))
    if t == "call":
        return IRCall(
            str(obj["name"]),
            [ir_expr_from_json(a) for a in obj.get("arguments", [])],
        )
    if t == "binary":
        return IRBinary(
            ir_expr_from_json(obj["left"]),
            str(obj["operator"]),
            ir_expr_from_json(obj["right"]),
        )
    if t == "logical":
        return IRLogical(
            ir_expr_from_json(obj["left"]),
            str(obj["operator"]),
            ir_expr_from_json(obj["right"]),
        )
    raise TypeError(f"ir_expr_from_json: unknown type {t!r}")


def ir_condition_from_json(obj: Dict[str, Any]) -> IRCondition:
    return IRCondition(
        str(obj["condition_id"]),
        str(obj["kind"]),
        ir_expr_from_json(obj["expr"]),
    )


def ir_transition_from_json(obj: Dict[str, Any]) -> IRTransition:
    return IRTransition(
        str(obj["transition_id"]),
        str(obj["effect_name"]),
        [ir_expr_from_json(a) for a in obj.get("arguments", [])],
        str(obj["from_state"]),
        str(obj["to_state"]),
    )


def ir_goal_from_json(data: Dict[str, Any]) -> IRGoal:
    """
    Deserialize IRGoal from the object produced under ir_goal_to_json()['ir_goal'].
    Accepts either {'ir_goal': {...}} or the inner ir_goal dict.
    """
    ig = data.get("ir_goal", data) if isinstance(data, dict) else data
    if not isinstance(ig, dict):
        raise TypeError("ir_goal_from_json: expected dict or envelope with ir_goal")
    md = copy.deepcopy(DEFAULT_IR_METADATA)
    if isinstance(ig.get("metadata"), dict):
        md.update(ig["metadata"])
    inputs = [IRInput(str(i["name"]), str(i["type"])) for i in ig.get("inputs", [])]
    return IRGoal(
        goal=str(ig.get("goal") or ""),
        inputs=inputs,
        preconditions=[ir_condition_from_json(c) for c in ig.get("preconditions", [])],
        forbids=[ir_condition_from_json(c) for c in ig.get("forbids", [])],
        transitions=[ir_transition_from_json(t) for t in ig.get("transitions", [])],
        postconditions=[ir_condition_from_json(c) for c in ig.get("postconditions", [])],
        result=ig.get("result"),
        metadata=md,
    )


def ir_condition_to_json(c: IRCondition) -> dict:
    return {
        "condition_id": c.condition_id,
        "kind": c.kind,
        "expr": ir_expr_to_json(c.expr),
    }


def ir_transition_to_json(t: IRTransition) -> dict:
    return {
        "transition_id": t.transition_id,
        "effect_name": t.effect_name,
        "arguments": [ir_expr_to_json(a) for a in t.arguments],
        "from_state": t.from_state,
        "to_state": t.to_state,
    }


def ir_goal_to_json(ir_goal: IRGoal) -> dict:
    """Top-level wrapper suitable for engine handoff."""
    inputs_sorted = sorted(ir_goal.inputs, key=lambda x: x.name)
    return {
        "ir_goal": {
            "goal": ir_goal.goal,
            "inputs": [
                {"name": inp.name, "type": inp.type_name} for inp in inputs_sorted
            ],
            "preconditions": [ir_condition_to_json(c) for c in ir_goal.preconditions],
            "forbids": [ir_condition_to_json(c) for c in ir_goal.forbids],
            "transitions": [ir_transition_to_json(t) for t in ir_goal.transitions],
            "postconditions": [ir_condition_to_json(c) for c in ir_goal.postconditions],
            "result": ir_goal.result,
            "metadata": _canonical_metadata_for_json(ir_goal.metadata),
        }
    }


def ir_goal_to_json_string(ir_goal: IRGoal, *, indent: int = 2) -> str:
    return json.dumps(ir_goal_to_json(ir_goal), indent=indent, ensure_ascii=False, sort_keys=True)


# --- Semantic-preserving normalization (V1.1) ---------------------------------------------------

_COMMUTATIVE_LOGICAL = frozenset({"and", "or"})
_COMMUTATIVE_BINARY = frozenset({"==", "!="})

_CONDITION_ID_REQ = re.compile(r"^c_req_\d{4}$")
_CONDITION_ID_FORBID = re.compile(r"^c_forbid_\d{4}$")
_CONDITION_ID_POST = re.compile(r"^c_post_\d{4}$")
_TRANSITION_ID = re.compile(r"^t_\d{4}$")
_SHA256_HEX_RE = re.compile(r"^[0-9a-f]{64}$")


def _stable_ir_expr_json(expr: IRExpr) -> str:
    """Stable JSON text for an IR subtree (commutative ordering / fingerprinting)."""
    return json.dumps(
        ir_expr_to_json(expr),
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        allow_nan=False,
    )


def normalize_ir_expr(expr: IRExpr) -> IRExpr:
    """
    Recursively normalize IR expressions: commutative and/or and ==/!= operands
    sorted by stable JSON key; strip empty semantic_type noise. Semantics preserved
    for pure boolean / equality (no side effects in IR).
    """
    if isinstance(expr, IRIdentifier):
        st = expr.semantic_type
        if st is not None and str(st).strip() == "":
            st = None
        return IRIdentifier(expr.name, semantic_type=st)
    if isinstance(expr, IRStringLiteral):
        return IRStringLiteral(expr.value)
    if isinstance(expr, IRNumberLiteral):
        v = expr.value
        if isinstance(v, float) and v.is_integer():
            v = int(v)
        return IRNumberLiteral(v)
    if isinstance(expr, IRBooleanLiteral):
        return IRBooleanLiteral(expr.value)
    if isinstance(expr, IRCall):
        return IRCall(
            expr.name,
            [normalize_ir_expr(a) for a in expr.arguments],
        )
    if isinstance(expr, IRBinary):
        op = expr.operator
        left = normalize_ir_expr(expr.left)
        right = normalize_ir_expr(expr.right)
        if op in _COMMUTATIVE_BINARY:
            jl = _stable_ir_expr_json(left)
            jr = _stable_ir_expr_json(right)
            if jr < jl:
                left, right = right, left
        return IRBinary(left, op, right)
    if isinstance(expr, IRLogical):
        op = expr.operator
        left = normalize_ir_expr(expr.left)
        right = normalize_ir_expr(expr.right)
        if op in _COMMUTATIVE_LOGICAL:
            jl = _stable_ir_expr_json(left)
            jr = _stable_ir_expr_json(right)
            if jr < jl:
                left, right = right, left
        return IRLogical(left, op, right)
    raise TypeError(f"normalize_ir_expr: unsupported type {type(expr)!r}")


def normalize_ir_goal(ir_goal: IRGoal) -> IRGoal:
    """
    Build a semantically equivalent IR goal with normalized expressions, inputs sorted
    by name, and stable condition/transition IDs preserved from the source goal.
    """
    inputs_sorted = sorted(
        [IRInput(i.name, i.type_name) for i in ir_goal.inputs],
        key=lambda x: x.name,
    )
    return IRGoal(
        goal=(ir_goal.goal or "").strip(),
        inputs=inputs_sorted,
        preconditions=[
            IRCondition(c.condition_id, c.kind, normalize_ir_expr(c.expr))
            for c in ir_goal.preconditions
        ],
        forbids=[
            IRCondition(c.condition_id, c.kind, normalize_ir_expr(c.expr))
            for c in ir_goal.forbids
        ],
        postconditions=[
            IRCondition(c.condition_id, c.kind, normalize_ir_expr(c.expr))
            for c in ir_goal.postconditions
        ],
        transitions=[
            IRTransition(
                t.transition_id,
                t.effect_name,
                [normalize_ir_expr(a) for a in t.arguments],
                t.from_state,
                t.to_state,
            )
            for t in ir_goal.transitions
        ],
        result=ir_goal.result,
        metadata=copy.deepcopy(ir_goal.metadata),
    )


def compute_ir_fingerprint(ir_goal: IRGoal) -> str:
    """SHA-256 (hex) of canonical JSON for the full ir_goal_to_json payload."""
    payload = ir_goal_to_json(ir_goal)
    canonical = json.dumps(
        payload,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        allow_nan=False,
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _semantic_expr_key(expr: IRExpr) -> str:
    return _stable_ir_expr_json(normalize_ir_expr(expr))


def validate_ir_semantic_determinism(ir_goal: IRGoal) -> List[str]:
    """
    Detect duplicate equivalent conditions or transitions under normalized expr equality.
    """
    errors: List[str] = []

    def check_dupes(conditions: List[IRCondition], label: str) -> None:
        seen: Dict[str, int] = {}
        for i, c in enumerate(conditions):
            k = _semantic_expr_key(c.expr)
            if k in seen:
                errors.append(
                    f"Semantic determinism: duplicate equivalent {label} at indices "
                    f"{seen[k]} and {i} (normalized expression match)."
                )
            else:
                seen[k] = i

    check_dupes(ir_goal.preconditions, "precondition")
    check_dupes(ir_goal.forbids, "forbid")
    check_dupes(ir_goal.postconditions, "postcondition")

    seen_t: Dict[Tuple[str, str, str, Tuple[str, ...]], int] = {}
    for i, t in enumerate(ir_goal.transitions):
        arg_keys = tuple(_semantic_expr_key(a) for a in t.arguments)
        tk: Tuple[str, str, str, Tuple[str, ...]] = (
            t.effect_name,
            t.from_state,
            t.to_state,
            arg_keys,
        )
        if tk in seen_t:
            errors.append(
                f"Semantic determinism: duplicate equivalent transition at indices "
                f"{seen_t[tk]} and {i} "
                f"(effect_name, states, normalized arguments match)."
            )
        else:
            seen_t[tk] = i

    return errors


# --- IR integrity validation (not semantic verification) --------------------------------------


def _validate_ir_expr(expr: IRExpr, errors: List[str], path: str) -> None:
    if isinstance(expr, IRIdentifier):
        if expr.semantic_type is not None and expr.semantic_type not in _ALLOWED_SEMANTIC_TYPES:
            errors.append(
                f"{path}: identifier semantic_type {expr.semantic_type!r} not in allowed set."
            )
        return
    if isinstance(expr, IRStringLiteral):
        return
    if isinstance(expr, IRNumberLiteral):
        return
    if isinstance(expr, IRBooleanLiteral):
        return
    if isinstance(expr, IRCall):
        if not expr.name:
            errors.append(f"{path}: call name must be non-empty.")
        for i, a in enumerate(expr.arguments):
            _validate_ir_expr(a, errors, f"{path}.arguments[{i}]")
        return
    if isinstance(expr, IRBinary):
        _validate_ir_expr(expr.left, errors, f"{path}.left")
        _validate_ir_expr(expr.right, errors, f"{path}.right")
        return
    if isinstance(expr, IRLogical):
        _validate_ir_expr(expr.left, errors, f"{path}.left")
        _validate_ir_expr(expr.right, errors, f"{path}.right")
        return
    errors.append(f"{path}: unknown IR expression class {type(expr)!r}.")


def _ids_ascending_by_numeric_suffix(ids: List[str], *, label: str, errors: List[str]) -> None:
    """Require list order to match strictly increasing numeric suffixes (stable wire format)."""
    if len(ids) < 2:
        return
    try:
        nums = [int(x.rsplit("_", 1)[-1]) for x in ids]
    except ValueError:
        return
    if nums != sorted(nums) or len(set(nums)) != len(nums):
        errors.append(
            f"IR validation: {label} must be ascending by numeric suffix (deterministic order); "
            f"reorder entries to match condition_id / transition_id sequence."
        )


def _validate_ir_transition_graph_unambiguous(ir_goal: IRGoal, errors: List[str]) -> None:
    """
    With only ``before`` / ``after`` states, more than one ``before`` → ``after`` edge leaves
    effect order undefined for the prototype engine.
    """
    ba = [t for t in ir_goal.transitions if t.from_state == "before" and t.to_state == "after"]
    if len(ba) > 1:
        errors.append(
            "IR validation: at most one transition may go from 'before' to 'after' "
            f"(found {len(ba)}); merge effects or chain with an intermediate 'after' state."
        )


def validate_ir(ir_goal: IRGoal) -> List[str]:
    """
    Return a list of integrity errors; empty means OK.

    Determinism: ``preconditions``, ``forbids``, ``postconditions``, and ``transitions`` must be
    listed in strictly ascending numeric suffix order (``c_req_0001`` before ``c_req_0002``, etc.).

    Ambiguity: at most one transition may use ``from_state`` ``before`` and ``to_state`` ``after``
    (prototype two-state machine).
    """
    errors: List[str] = []

    if not (ir_goal.goal and str(ir_goal.goal).strip()):
        errors.append("IR validation: goal must be a non-empty string.")

    names = [inp.name for inp in ir_goal.inputs]
    if len(names) != len(set(names)):
        errors.append("IR validation: input names must be unique.")

    for inp in ir_goal.inputs:
        if inp.type_name not in _ALLOWED_INPUT_TYPES:
            errors.append(
                f"IR validation: input {inp.name!r} has type_name {inp.type_name!r} "
                f"not in allowed set."
            )

    cond_ids: List[str] = []

    for i, c in enumerate(ir_goal.preconditions):
        if c.kind != "require":
            errors.append(
                f"IR validation: preconditions[{i}] must have kind 'require', got {c.kind!r}."
            )
        if not _CONDITION_ID_REQ.match(c.condition_id):
            errors.append(
                f"IR validation: preconditions[{i}].condition_id must match c_req_NNNN, "
                f"got {c.condition_id!r}."
            )
        cond_ids.append(c.condition_id)
        _validate_ir_expr(c.expr, errors, f"preconditions[{i}].expr")

    for i, c in enumerate(ir_goal.forbids):
        if c.kind != "forbid":
            errors.append(
                f"IR validation: forbids[{i}] must have kind 'forbid', got {c.kind!r}."
            )
        if not _CONDITION_ID_FORBID.match(c.condition_id):
            errors.append(
                f"IR validation: forbids[{i}].condition_id must match c_forbid_NNNN, "
                f"got {c.condition_id!r}."
            )
        cond_ids.append(c.condition_id)
        _validate_ir_expr(c.expr, errors, f"forbids[{i}].expr")

    for i, c in enumerate(ir_goal.postconditions):
        if c.kind != "postcondition":
            errors.append(
                f"IR validation: postconditions[{i}] must have kind 'postcondition', "
                f"got {c.kind!r}."
            )
        if not _CONDITION_ID_POST.match(c.condition_id):
            errors.append(
                f"IR validation: postconditions[{i}].condition_id must match c_post_NNNN, "
                f"got {c.condition_id!r}."
            )
        cond_ids.append(c.condition_id)
        _validate_ir_expr(c.expr, errors, f"postconditions[{i}].expr")

    if len(cond_ids) != len(set(cond_ids)):
        errors.append("IR validation: all condition_id values must be globally unique.")

    trans_ids: List[str] = []
    for i, t in enumerate(ir_goal.transitions):
        p = f"transitions[{i}]"
        if not _TRANSITION_ID.match(t.transition_id):
            errors.append(
                f"IR validation: {p}.transition_id must match t_NNNN, got {t.transition_id!r}."
            )
        trans_ids.append(t.transition_id)
        if not (t.effect_name and str(t.effect_name).strip()):
            errors.append(f"IR validation: {p}.effect_name must be non-empty.")
        if t.from_state not in _ALLOWED_STATE_NAMES:
            errors.append(
                f"IR validation: {p}.from_state must be 'before' or 'after', got {t.from_state!r}."
            )
        if t.to_state not in _ALLOWED_STATE_NAMES:
            errors.append(
                f"IR validation: {p}.to_state must be 'before' or 'after', got {t.to_state!r}."
            )
        for j, a in enumerate(t.arguments):
            _validate_ir_expr(a, errors, f"{p}.arguments[{j}]")

    if len(trans_ids) != len(set(trans_ids)):
        errors.append("IR validation: all transition_id values must be unique.")

    _ids_ascending_by_numeric_suffix(
        [c.condition_id for c in ir_goal.preconditions],
        label="preconditions[]",
        errors=errors,
    )
    _ids_ascending_by_numeric_suffix(
        [c.condition_id for c in ir_goal.forbids],
        label="forbids[]",
        errors=errors,
    )
    _ids_ascending_by_numeric_suffix(
        [c.condition_id for c in ir_goal.postconditions],
        label="postconditions[]",
        errors=errors,
    )
    _ids_ascending_by_numeric_suffix(trans_ids, label="transitions[] (transition_id)", errors=errors)

    _validate_ir_transition_graph_unambiguous(ir_goal, errors)

    for key in ("ir_version", "source", "canonical_language"):
        if key not in ir_goal.metadata:
            errors.append(f"IR validation: metadata must include {key!r}.")

    if ir_goal.metadata.get("ir_version") != CANONICAL_IR_VERSION:
        errors.append(
            f"IR validation: metadata ir_version must be {CANONICAL_IR_VERSION!r}, "
            f"got {ir_goal.metadata.get('ir_version')!r}."
        )

    return errors


def validate_bundle_envelope(data: Dict[str, Any]) -> List[str]:
    """Optional top-level keys (ecosystem): ``library_refs``."""
    errors: List[str] = []
    if not isinstance(data, dict):
        return ["Bundle envelope must be a JSON object."]
    allowed = frozenset({"ir_goal", "library_refs"})
    for k in data.keys():
        if k not in allowed:
            errors.append(f"Bundle envelope: unknown top-level key {k!r}.")
    refs = data.get("library_refs")
    if refs is None:
        return errors
    if not isinstance(refs, list):
        errors.append("Bundle envelope: library_refs must be an array.")
        return errors
    for i, r in enumerate(refs):
        if not isinstance(r, dict):
            errors.append(f"Bundle envelope: library_refs[{i}] must be an object.")
            continue
        name = r.get("name")
        if not name or not isinstance(name, str):
            errors.append(f"Bundle envelope: library_refs[{i}].name must be a non-empty string.")
        ver = r.get("version")
        if not isinstance(ver, str):
            errors.append(f"Bundle envelope: library_refs[{i}].version must be a string.")
        fp = r.get("fingerprint")
        if fp is not None and (not isinstance(fp, str) or not fp.isascii()):
            errors.append(f"Bundle envelope: library_refs[{i}].fingerprint must be ASCII string if present.")
    return errors


# --- Rust type mapping (documentation / codegen helper) -----------------------------------------

def ir_type_to_rust(type_name: str) -> str:
    """
    Map canonical IR input/semantic type labels to a conservative Rust surface type.
    Convention: number → i64 (fractional values are not represented here; may evolve).
    """
    m = {
        "text": "String",
        "number": "i64",
        "boolean": "bool",
        "void": "()",
        "unknown": "IrUnknown",
    }
    if type_name not in m:
        raise ValueError(f"Unknown IR type_name for Rust mapping: {type_name!r}")
    return m[type_name]


# --- Handoff compatibility (stricter than validate_ir) ----------------------------------------

_ASCII_HANDOFF_KEY = re.compile(r"^[a-z][a-z0-9_]*$")
_ASCII_HANDOFF_IDENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
_ALLOWED_HANDOFF_BINARY_OPS = frozenset({"==", "!=", "<", ">", "<=", ">="})
_ALLOWED_HANDOFF_LOGICAL_OPS = frozenset({"and", "or"})
_ALLOWED_JSON_EXPR_TYPES = frozenset(
    {
        "identifier",
        "string_literal",
        "number_literal",
        "boolean_literal",
        "call",
        "binary",
        "logical",
    }
)


def _validate_handoff_json_keys(obj: Any, path: str, errors: List[str]) -> None:
    """JSON object keys must be ASCII snake_case (contract for Rust serde)."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            if not isinstance(k, str):
                errors.append(f"Handoff: non-string key at {path}")
                continue
            if not _ASCII_HANDOFF_KEY.match(k):
                errors.append(
                    f"Handoff: key {k!r} at {path} must match ASCII snake_case "
                    f"^[a-z][a-z0-9_]*$."
                )
            _validate_handoff_json_keys(v, f"{path}.{k}" if path else k, errors)
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            _validate_handoff_json_keys(item, f"{path}[{i}]", errors)


def _handoff_walk_expr(expr: IRExpr, path: str, errors: List[str]) -> None:
    if isinstance(expr, IRIdentifier):
        if not _ASCII_HANDOFF_IDENT.match(expr.name):
            errors.append(
                f"Handoff: {path} identifier name {expr.name!r} must be ASCII "
                f"[A-Za-z_][A-Za-z0-9_]*."
            )
        if expr.semantic_type is not None and expr.semantic_type not in _ALLOWED_SEMANTIC_TYPES:
            errors.append(f"Handoff: {path} unsupported semantic_type {expr.semantic_type!r}.")
        return
    if isinstance(expr, IRStringLiteral):
        return
    if isinstance(expr, IRNumberLiteral):
        v = expr.value
        if isinstance(v, float):
            if not math.isfinite(v):
                errors.append(f"Handoff: {path} number_literal must be finite.")
            elif not v.is_integer():
                errors.append(
                    f"Handoff: {path} fractional float not allowed in handoff IR "
                    f"(Rust mapping uses i64; use integer or split representation)."
                )
        return
    if isinstance(expr, IRBooleanLiteral):
        return
    if isinstance(expr, IRCall):
        if not _ASCII_HANDOFF_IDENT.match(expr.name):
            errors.append(
                f"Handoff: {path} call name {expr.name!r} must be ASCII "
                f"[A-Za-z_][A-Za-z0-9_]*."
            )
        for i, a in enumerate(expr.arguments):
            _handoff_walk_expr(a, f"{path}.arguments[{i}]", errors)
        return
    if isinstance(expr, IRBinary):
        if expr.operator not in _ALLOWED_HANDOFF_BINARY_OPS:
            errors.append(
                f"Handoff: {path} unsupported binary operator {expr.operator!r}."
            )
        _handoff_walk_expr(expr.left, f"{path}.left", errors)
        _handoff_walk_expr(expr.right, f"{path}.right", errors)
        return
    if isinstance(expr, IRLogical):
        if expr.operator not in _ALLOWED_HANDOFF_LOGICAL_OPS:
            errors.append(
                f"Handoff: {path} unsupported logical operator {expr.operator!r}."
            )
        _handoff_walk_expr(expr.left, f"{path}.left", errors)
        _handoff_walk_expr(expr.right, f"{path}.right", errors)
        return
    errors.append(f"Handoff: {path} expression is not a supported IR node ({type(expr)!r}).")


def _json_expr_types_walk(obj: Any, path: str, errors: List[str]) -> None:
    if obj is None:
        return
    if isinstance(obj, dict):
        if "type" in obj:
            t = obj.get("type")
            if t not in _ALLOWED_JSON_EXPR_TYPES:
                errors.append(f"Handoff: expr JSON {path} has disallowed type {t!r}.")
        for k, v in obj.items():
            if isinstance(v, (dict, list)):
                nk = f"{path}.{k}" if path else k
                _json_expr_types_walk(v, nk, errors)
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            nk = f"{path}[{i}]" if path else f"[{i}]"
            _json_expr_types_walk(item, nk, errors)


def validate_ir_handoff_compatibility(ir_goal: IRGoal) -> List[str]:
    """
    Stricter checks for Rust/engine handoff: ASCII key contract, JSON safety, allowed ops,
    ir_version lock, no non-IR expression classes.
    """
    errors: List[str] = []

    for key in ("ir_version", "source", "canonical_language"):
        if key not in ir_goal.metadata:
            errors.append(f"Handoff: metadata must include {key!r}.")

    if ir_goal.metadata.get("ir_version") != CANONICAL_IR_VERSION:
        errors.append(
            f"Handoff: metadata ir_version must be {CANONICAL_IR_VERSION!r}, "
            f"got {ir_goal.metadata.get('ir_version')!r}."
        )
    if ir_goal.metadata.get("source") != "python_prototype":
        errors.append(
            f"Handoff: metadata source must be 'python_prototype', "
            f"got {ir_goal.metadata.get('source')!r}."
        )
    if ir_goal.metadata.get("canonical_language") != "english":
        errors.append(
            f"Handoff: metadata canonical_language must be 'english', "
            f"got {ir_goal.metadata.get('canonical_language')!r}."
        )

    try:
        json.dumps(ir_goal.result, ensure_ascii=False, allow_nan=False)
    except (TypeError, ValueError):
        errors.append("Handoff: result is not JSON-serializable as a plain value.")

    if ir_goal.goal and not _ASCII_HANDOFF_IDENT.match(ir_goal.goal.strip()):
        errors.append(
            f"Handoff: goal name {ir_goal.goal!r} must be ASCII [A-Za-z_][A-Za-z0-9_]*."
        )

    for inp in ir_goal.inputs:
        if not _ASCII_HANDOFF_IDENT.match(inp.name):
            errors.append(
                f"Handoff: input name {inp.name!r} must be ASCII [A-Za-z_][A-Za-z0-9_]*."
            )

    for i, c in enumerate(ir_goal.preconditions):
        _handoff_walk_expr(c.expr, f"preconditions[{i}].expr", errors)
    for i, c in enumerate(ir_goal.forbids):
        _handoff_walk_expr(c.expr, f"forbids[{i}].expr", errors)
    for i, c in enumerate(ir_goal.postconditions):
        _handoff_walk_expr(c.expr, f"postconditions[{i}].expr", errors)

    for i, t in enumerate(ir_goal.transitions):
        p = f"transitions[{i}]"
        if not (t.effect_name and str(t.effect_name).strip()):
            errors.append(f"Handoff: {p}.effect_name must be non-empty.")
        elif not _ASCII_HANDOFF_IDENT.match(t.effect_name):
            errors.append(
                f"Handoff: {p}.effect_name {t.effect_name!r} must be ASCII "
                f"[A-Za-z_][A-Za-z0-9_]*."
            )
        if t.from_state not in _ALLOWED_STATE_NAMES or t.to_state not in _ALLOWED_STATE_NAMES:
            errors.append(f"Handoff: {p} has invalid state name(s).")
        for j, a in enumerate(t.arguments):
            _handoff_walk_expr(a, f"{p}.arguments[{j}]", errors)

    payload = ir_goal_to_json(ir_goal)
    _validate_handoff_json_keys(payload, "", errors)

    # Expr-shaped subtrees: ensure only known JSON "type" discriminators
    ig = payload.get("ir_goal", {})
    for sec in ("preconditions", "forbids", "postconditions"):
        for i, item in enumerate(ig.get(sec, [])):
            _json_expr_types_walk(item.get("expr"), f"ir_goal.{sec}[{i}].expr", errors)
    for i, tr in enumerate(ig.get("transitions", [])):
        for j, arg in enumerate(tr.get("arguments", [])):
            _json_expr_types_walk(arg, f"ir_goal.transitions[{i}].arguments[{j}]", errors)

    try:
        json.dumps(payload, ensure_ascii=False, sort_keys=True, allow_nan=False)
    except (TypeError, ValueError) as ex:
        errors.append(f"Handoff: canonical IR JSON is not fully serializable: {ex}")

    return errors


def export_ir_bundle(ir_goal: IRGoal) -> dict:
    """
    Official Rust handoff artifact. Normalizes IR before export, computes fingerprint,
    and attaches determinism diagnostics. Raises ValueError if IR metadata ir_version
    does not match CANONICAL_IR_VERSION.
    """
    if ir_goal.metadata.get("ir_version") != CANONICAL_IR_VERSION:
        raise ValueError(
            f"export_ir_bundle: ir_goal.metadata['ir_version'] is "
            f"{ir_goal.metadata.get('ir_version')!r}; must equal "
            f"CANONICAL_IR_VERSION {CANONICAL_IR_VERSION!r}."
        )

    normalized = normalize_ir_goal(ir_goal)
    det_errors = validate_ir_semantic_determinism(normalized)
    fingerprint = compute_ir_fingerprint(normalized)

    base_errors = validate_ir(normalized)
    compat_errors = validate_ir_handoff_compatibility(normalized)
    all_errors: List[str] = []
    _seen_err: Set[str] = set()
    for e in base_errors + compat_errors + det_errors:
        if e not in _seen_err:
            _seen_err.add(e)
            all_errors.append(e)

    ir_payload = ir_goal_to_json(normalized)

    bundle_metadata = {
        "design_intent": "semantic_core_handoff",
        "handoff_format": "json",
        "ir_fingerprint": fingerprint,
        "ownership_model": "rust_native_later",
        "parser_status": "python_prototype_only",
        "source_prototype": "python",
        "target_core": "rust",
    }

    return {
        "bundle_version": CANONICAL_IR_VERSION,
        "determinism": {
            "errors": list(det_errors),
            "ir_fingerprint": fingerprint,
            "normalized": True,
            "semantic_determinism_passed": len(det_errors) == 0,
        },
        "ir": ir_payload,
        "metadata": dict(sorted(bundle_metadata.items())),
        "validation": {
            "errors": list(all_errors),
            "ir_valid": len(all_errors) == 0,
        },
    }


def validate_export_bundle(bundle: dict) -> List[str]:
    """Structural validation of an exported handoff bundle (post-serialization contract)."""
    errors: List[str] = []

    if bundle.get("bundle_version") != CANONICAL_IR_VERSION:
        errors.append(
            f"Export bundle: bundle_version must be {CANONICAL_IR_VERSION!r}, "
            f"got {bundle.get('bundle_version')!r}."
        )

    meta = bundle.get("metadata")
    fp_meta: Optional[str] = None
    if not isinstance(meta, dict):
        errors.append("Export bundle: metadata must be an object.")
    else:
        if meta.get("target_core") != "rust":
            errors.append(
                f"Export bundle: metadata.target_core must be 'rust', "
                f"got {meta.get('target_core')!r}."
            )
        raw_fp = meta.get("ir_fingerprint")
        if isinstance(raw_fp, str):
            fp_meta = raw_fp
        if not fp_meta or not _SHA256_HEX_RE.match(fp_meta):
            errors.append(
                "Export bundle: metadata.ir_fingerprint must be a 64-char lowercase hex SHA-256."
            )

    det = bundle.get("determinism")
    if not isinstance(det, dict):
        errors.append("Export bundle: determinism section must be an object.")
    else:
        for req in ("errors", "ir_fingerprint", "normalized", "semantic_determinism_passed"):
            if req not in det:
                errors.append(f"Export bundle: determinism missing required key {req!r}.")
        if fp_meta and det.get("ir_fingerprint") != fp_meta:
            errors.append(
                "Export bundle: determinism.ir_fingerprint must equal metadata.ir_fingerprint."
            )
        if det.get("normalized") is not True:
            errors.append("Export bundle: determinism.normalized must be true.")
        det_errs = det.get("errors", [])
        if not isinstance(det_errs, list):
            det_errs = []
        if det.get("semantic_determinism_passed") != (len(det_errs) == 0):
            errors.append(
                "Export bundle: determinism.semantic_determinism_passed must match empty errors."
            )

    ir = bundle.get("ir")
    if not isinstance(ir, dict) or "ir_goal" not in ir:
        errors.append("Export bundle: ir.ir_goal missing.")
    else:
        ig = ir["ir_goal"]
        md = ig.get("metadata") if isinstance(ig, dict) else None
        if not isinstance(md, dict) or md.get("ir_version") != CANONICAL_IR_VERSION:
            errors.append(
                f"Export bundle: ir.ir_goal.metadata.ir_version must be {CANONICAL_IR_VERSION!r}."
            )

        cond_ids: List[Any] = []
        if isinstance(ig, dict):
            for sec in ("preconditions", "forbids", "postconditions"):
                for item in ig.get(sec, []) or []:
                    if isinstance(item, dict):
                        cond_ids.append(item.get("condition_id"))
            tids: List[Any] = []
            for tr in ig.get("transitions", []) or []:
                if isinstance(tr, dict):
                    tids.append(tr.get("transition_id"))
            if len(cond_ids) != len(set(cond_ids)) or any(x is None for x in cond_ids):
                errors.append(
                    "Export bundle: all condition_id values must be present and unique in ir.ir_goal."
                )
            if len(tids) != len(set(tids)) or any(x is None for x in tids):
                errors.append(
                    "Export bundle: all transition_id values must be present and unique in ir.ir_goal."
                )

    try:
        s = json.dumps(
            bundle,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
            allow_nan=False,
        )
        json.loads(s)
    except (TypeError, ValueError) as ex:
        errors.append(f"Export bundle: JSON round-trip failed: {ex}")

    return errors


def export_ir_bundle_json(bundle: dict) -> str:
    """
    Deterministic UTF-8 JSON text for the handoff bundle (sorted keys at all levels,
    compact separators, no NaN/Infinity).
    """
    return json.dumps(
        bundle,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        allow_nan=False,
    )
