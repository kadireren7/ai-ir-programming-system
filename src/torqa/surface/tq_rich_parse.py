"""
TORQA rich surface helpers (``surface torqa_rich v0``).

Keeps tq_v1 strict; rich mode adds model typing, lightweight validation rules,
abstract side-effect steps, groups, and ``each`` loops — still declarative, not a PL.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

from torqa.surface.tq_errors import TQParseError

_WHEN_IDENT_RE = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*$")


def _validate_when_guard(ident: str, requires: List[str], lineno: int) -> None:
    if ident == "ip_address":
        return
    if ident in requires:
        return
    raise TQParseError(
        "PX_TQ_WHEN_UNKNOWN_IDENT",
        f"tq: guard {ident!r} must be ip_address or one of requires (line {lineno}). "
        f"Fix: add {ident!r} to requires, or use when/if ip_address for optional audit.",
    )

# --- Flow AST -----------------------------------------------------------------


@dataclass
class RichFlowNode:
    """One rich flow construct (group, loop, or leaf side effect)."""

    kind: str  # "http" | "db" | "event" | "each" | "group"
    payload: str
    guard: Optional[str] = None
    children: List["RichFlowNode"] = field(default_factory=list)


# --- model: block -------------------------------------------------------------

_MODEL_SCALAR = re.compile(
    r"^(?P<name>[a-zA-Z_][a-zA-Z0-9_]*)\s+"
    r"(?P<stype>string|text|number|boolean)\s*"
    r"(?P<req>required)?\s*$"
)
_MODEL_LIST = re.compile(
    r"^(?P<name>[a-zA-Z_][a-zA-Z0-9_]*)\s+"
    r"list\s+(?P<elem>string|text|number|boolean)\s*"
    r"(?P<req>required)?\s*$"
)
_MODEL_MAP = re.compile(
    r"^(?P<name>[a-zA-Z_][a-zA-Z0-9_]*)\s+"
    r"map\s+(?P<kt>string|text|number|boolean)\s+"
    r"(?P<vt>string|text|number|boolean)\s*"
    r"(?P<req>required)?\s*$"
)


def parse_model_block(lines: List[str], start_i: int) -> Tuple[List[Dict[str, Any]], int]:
    """Parse ``model:`` body (two-space indented lines). Returns (field dicts, next line index)."""
    out: List[Dict[str, Any]] = []
    i = start_i
    n = len(lines)
    while i < n:
        raw = lines[i]
        lineno = i + 1
        if not raw.strip():
            i += 1
            continue
        if not raw.startswith("  "):
            break
        if len(raw) >= 3 and raw[2] in (" ", "\t"):
            raise TQParseError(
                "PX_TQ_MODEL_INDENT",
                f"tq: model line must use exactly two spaces then text (line {lineno}).",
            )
        body = raw[2:].rstrip()
        if not body or body.lstrip().startswith("#"):
            i += 1
            continue
        req = bool(re.search(r"\brequired\b", body))
        m = _MODEL_MAP.match(body)
        if m:
            out.append(
                {
                    "name": m.group("name"),
                    "shape": "map",
                    "key_type": m.group("kt"),
                    "value_type": m.group("vt"),
                    "required": req,
                }
            )
            i += 1
            continue
        m = _MODEL_LIST.match(body)
        if m:
            out.append(
                {
                    "name": m.group("name"),
                    "shape": "list",
                    "element_type": m.group("elem"),
                    "required": req,
                }
            )
            i += 1
            continue
        m = _MODEL_SCALAR.match(body)
        if m:
            out.append(
                {
                    "name": m.group("name"),
                    "shape": "scalar",
                    "type": m.group("stype"),
                    "required": req,
                }
            )
            i += 1
            continue
        raise TQParseError(
            "PX_TQ_MODEL_LINE",
            f"tq: bad model line (line {lineno}): {body!r}. "
            "Expected: name string|number|boolean [required], name list elem [required], "
            "or name map key val [required].",
        )
    return out, i


# --- validate: block ----------------------------------------------------------

_VALIDATE_CMP = re.compile(
    r"^(?P<left>[a-zA-Z_][a-zA-Z0-9_]*)\s*"
    r"(?P<op>==|!=|>=|<=|>|<)\s*"
    r"(?P<right>-?\d+(?:\.\d+)?)\s*$"
)


def parse_validate_block(lines: List[str], start_i: int) -> Tuple[List[Dict[str, Any]], int]:
    """
    Parse ``validate:`` body lines into compare specs or raw strings.
    Compare lines become IR preconditions (number literals only on the right).
    """
    out: List[Dict[str, Any]] = []
    i = start_i
    n = len(lines)
    while i < n:
        raw = lines[i]
        lineno = i + 1
        if not raw.strip():
            i += 1
            continue
        if not raw.startswith("  "):
            break
        if len(raw) >= 3 and raw[2] in (" ", "\t"):
            raise TQParseError(
                "PX_TQ_VALIDATE_INDENT",
                f"tq: validate line must use exactly two spaces then text (line {lineno}).",
            )
        body = raw[2:].rstrip()
        if not body or body.lstrip().startswith("#"):
            i += 1
            continue
        m = _VALIDATE_CMP.match(body)
        if m:
            rhs = m.group("right")
            if "." in rhs:
                num: Any = float(rhs)
            else:
                num = int(rhs)
            out.append(
                {
                    "kind": "compare",
                    "left": m.group("left"),
                    "op": m.group("op"),
                    "right": num,
                }
            )
            i += 1
            continue
        out.append({"kind": "raw", "text": body})
        i += 1
    return out, i


# --- effects: block (documentation + metadata) --------------------------------


def parse_effects_block(lines: List[str], start_i: int) -> Tuple[List[str], int]:
    out: List[str] = []
    i = start_i
    n = len(lines)
    while i < n:
        raw = lines[i]
        lineno = i + 1
        if not raw.strip():
            i += 1
            continue
        if not raw.startswith("  "):
            break
        if len(raw) >= 3 and raw[2] in (" ", "\t"):
            raise TQParseError(
                "PX_TQ_EFFECTS_INDENT",
                f"tq: effects line must use exactly two spaces then text (line {lineno}).",
            )
        body = raw[2:].rstrip()
        if not body or body.lstrip().startswith("#"):
            i += 1
            continue
        out.append(body)
        i += 1
    return out, i


# --- Rich flow ----------------------------------------------------------------

_EACH_HEADER = re.compile(r"^each\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+in\s+([a-zA-Z_][a-zA-Z0-9_]*):\s*$")


def _rich_leading_spaces(raw: str, lineno: int) -> int:
    n = 0
    for ch in raw:
        if ch == " ":
            n += 1
        elif ch == "\t":
            raise TQParseError(
                "PX_TQ_FLOW_INDENT",
                f"tq: tabs are not allowed in rich flow (line {lineno}). Use two spaces per level.",
            )
        else:
            break
    return n


def _parse_guard_prefix(body: str, lineno: int, requires: List[str]) -> Tuple[Optional[str], str]:
    if body.startswith("when "):
        rest = body[5:]
        parts = rest.split(None, 1)
        if len(parts) < 2:
            raise TQParseError(
                "PX_TQ_WHEN_EMPTY",
                f"tq: when needs a guard and a step (line {lineno}). Example: when paid call http GET /x",
            )
        ident, tail = parts[0], parts[1]
        _validate_when_guard(ident, requires, lineno)
        if not tail.strip():
            raise TQParseError(
                "PX_TQ_WHEN_EMPTY",
                f"tq: when needs a step after the guard (line {lineno}).",
            )
        return ident, tail.strip()
    if body.startswith("if "):
        rest = body[3:]
        parts = rest.split(None, 1)
        if len(parts) < 2:
            raise TQParseError(
                "PX_TQ_WHEN_EMPTY",
                f"tq: if needs a guard and a step (line {lineno}). Same rules as when.",
            )
        ident, tail = parts[0], parts[1]
        _validate_when_guard(ident, requires, lineno)
        if not tail.strip():
            raise TQParseError(
                "PX_TQ_WHEN_EMPTY",
                f"tq: if needs a step after the guard (line {lineno}).",
            )
        return ident, tail.strip()
    return None, body


def _parse_leaf_step(rest: str, lineno: int, guard: Optional[str]) -> RichFlowNode:
    if rest.startswith("call http "):
        pay = rest[len("call http ") :].strip()
        if not pay:
            raise TQParseError(
                "PX_TQ_RICH_STEP",
                f"tq: call http needs a method and target (line {lineno}).",
            )
        return RichFlowNode("http", pay, guard, [])
    if rest.startswith("call db "):
        pay = rest[len("call db ") :].strip()
        if not pay:
            raise TQParseError(
                "PX_TQ_RICH_STEP",
                f"tq: call db needs an operation (line {lineno}).",
            )
        return RichFlowNode("db", pay, guard, [])
    if rest.startswith("emit event "):
        pay = rest[len("emit event ") :].strip()
        if not pay:
            raise TQParseError(
                "PX_TQ_RICH_STEP",
                f"tq: emit event needs a name (line {lineno}).",
            )
        return RichFlowNode("event", pay, guard, [])
    raise TQParseError(
        "PX_TQ_RICH_STEP",
        f"tq: unsupported rich flow step (line {lineno}): {rest!r}. "
        "Use: call http …, call db …, emit event …, group name:, or each x in items:.",
    )


def parse_rich_flow_tree(
    lines: List[str],
    start_i: int,
    min_indent: int,
    requires: List[str],
) -> Tuple[List[RichFlowNode], int]:
    nodes: List[RichFlowNode] = []
    i = start_i
    n = len(lines)
    while i < n:
        raw = lines[i]
        lineno = i + 1
        if not raw.strip():
            raise TQParseError(
                "PX_TQ_FLOW_BLANK_LINE",
                f"tq: blank line inside flow: is not allowed (line {lineno}).",
            )
        indent = _rich_leading_spaces(raw, lineno)
        if indent < min_indent:
            break
        line = raw.rstrip()
        body = line[indent:].strip()
        if body.startswith("#"):
            i += 1
            continue

        guard, rest = _parse_guard_prefix(body, lineno, requires)

        if rest.startswith("group ") and rest.endswith(":"):
            inner = rest[6:-1].strip()
            if not inner or not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", inner):
                raise TQParseError(
                    "PX_TQ_RICH_GROUP",
                    f"tq: group needs a single identifier and a colon (line {lineno}). Example: group validate:",
                )
            child_indent = indent + 2
            children, j = parse_rich_flow_tree(lines, i + 1, child_indent, requires)
            nodes.append(RichFlowNode("group", inner, guard, children))
            i = j
            continue

        em = _EACH_HEADER.match(rest)
        if em:
            var, coll = em.group(1), em.group(2)
            child_indent = indent + 2
            children, j = parse_rich_flow_tree(lines, i + 1, child_indent, requires)
            nodes.append(RichFlowNode("each", f"{var}|{coll}", guard, children))
            i = j
            continue

        nodes.append(_parse_leaf_step(rest, lineno, guard))
        i += 1

    return nodes, i


def flatten_rich_flow(
    nodes: List[RichFlowNode],
) -> List[Tuple[str, str, Optional[str]]]:
    """
    DFS flatten to (effect_kind, literal_payload, guard_ident).
    effect_kind: http | db | event | each
    """
    out: List[Tuple[str, str, Optional[str]]] = []
    for node in nodes:
        if node.kind == "group":
            out.extend(flatten_rich_flow(node.children))
            continue
        if node.kind == "each":
            desc = node.payload
            inner = flatten_rich_flow(node.children)
            guard_part = f"when:{node.guard}|" if node.guard else ""
            out.append(("each", f"{guard_part}each {desc} ({len(inner)} steps)", node.guard))
            out.extend(inner)
            continue
        if node.kind in ("http", "db", "event"):
            guard_part = f"when:{node.guard}|" if node.guard else ""
            out.append((node.kind, f"{guard_part}{node.payload}", node.guard))
            continue
    return out


def ir_input_type_for_model_field(f: Dict[str, Any]) -> str:
    """Map rich model field to canonical IR input type (list/map → unknown)."""
    if f.get("shape") == "scalar":
        t = str(f.get("type") or "text")
        if t == "string":
            return "text"
        if t in ("text", "number", "boolean"):
            return t
        return "unknown"
    return "unknown"
