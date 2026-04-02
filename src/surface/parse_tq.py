"""
Deterministic subset of `.tq` human surface → canonical ``ir_goal`` bundle.

Covers the declarative header plus a ``flow:`` block as in ``examples/torqa/*.tq``.
Unknown flow verbs raise ``TQParseError`` with a stable ``code`` for diagnostics.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

from src.ir.canonical_ir import CANONICAL_IR_VERSION, DEFAULT_IR_METADATA


class TQParseError(ValueError):
    """Surface parse failure with a stable diagnostic code (``PX_TQ_*``)."""

    def __init__(self, code: str, message: str) -> None:
        self.code = code
        super().__init__(message)


def _ident_expr(name: str) -> Dict[str, Any]:
    return {"type": "identifier", "name": name}


def _call_expr(name: str, arg_names: List[str]) -> Dict[str, Any]:
    return {
        "type": "call",
        "name": name,
        "arguments": [_ident_expr(n) for n in arg_names],
    }


def _snake_to_pascal(intent: str) -> str:
    parts = intent.replace("-", "_").split("_")
    return "".join(p[:1].upper() + p[1:] if p else "" for p in parts)


def _split_requires(line: str) -> List[str]:
    _, rest = line.split(None, 1)
    names = [p.strip() for p in rest.split(",")]
    return [n for n in names if n]


def _primary_login_field(input_names: List[str]) -> str:
    for n in input_names:
        if n != "password" and n != "ip_address":
            return n
    raise TQParseError("PX_TQ_NO_LOGIN_FIELD", "tq: requires must name a non-password field (e.g. email or username).")


def _forbid_account_locked_expr(login: str) -> Dict[str, Any]:
    return {
        "type": "binary",
        "operator": "==",
        "left": _call_expr("user_account_status", [login]),
        "right": {"type": "string_literal", "value": "locked"},
    }


def _parse_header_and_flow(
    text: str,
) -> Tuple[Optional[str], str, List[str], Optional[str], Optional[str], List[str], List[str]]:
    module: Optional[str] = None
    intent = ""
    requires: List[str] = []
    ensures: Optional[str] = None
    result_line: Optional[str] = None
    forbid_phrases: List[str] = []
    flow_steps: List[str] = []
    in_flow = False

    for raw in text.splitlines():
        line = raw.rstrip()
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if in_flow:
            if not raw[:1].isspace():
                break
            step = raw.strip()
            if step:
                flow_steps.append(step)
            continue

        stripped = line.strip()
        low = stripped.lower()
        if low.startswith("unless "):
            raise TQParseError(
                "PX_TQ_UNLESS_UNSUPPORTED",
                "tq: unless is not implemented yet; use forbid … or IR forbids[] directly.",
            )
        if low.startswith("module "):
            module = stripped.split(None, 1)[1].strip()
        elif low.startswith("intent "):
            intent = stripped.split(None, 1)[1].strip()
        elif low.startswith("requires "):
            requires = _split_requires(stripped)
        elif low.startswith("ensures "):
            ensures = stripped.split(None, 1)[1].strip() if len(stripped.split(None, 1)) > 1 else ""
        elif low.startswith("forbid "):
            parts = stripped.split(None, 1)
            if len(parts) < 2 or not parts[1].strip():
                raise TQParseError("PX_TQ_FORBID_EMPTY", "tq: forbid line needs a phrase, e.g. forbid locked.")
            forbid_phrases.append(parts[1].strip().lower())
        elif low.startswith("result "):
            parts = stripped.split(None, 1)
            result_line = parts[1].strip() if len(parts) > 1 else "OK"
        elif low == "flow:":
            in_flow = True
        else:
            raise TQParseError("PX_TQ_UNRECOGNIZED_LINE", f"tq: unrecognized line outside flow: {stripped!r}")

    if not intent:
        raise TQParseError("PX_TQ_MISSING_INTENT", "tq: missing intent line.")
    if not requires:
        raise TQParseError("PX_TQ_MISSING_REQUIRES", "tq: missing requires line.")
    return module, intent, requires, ensures, result_line, forbid_phrases, flow_steps


def parse_tq_source(text: str) -> Dict[str, Any]:
    module, intent, requires, ensures_clause, result_line, forbid_phrases, flow_steps = _parse_header_and_flow(
        text
    )
    goal = _snake_to_pascal(intent)
    if not goal:
        raise TQParseError("PX_TQ_BAD_INTENT", f"tq: intent {intent!r} does not map to a PascalCase goal.")

    login = _primary_login_field(requires)
    inputs = [{"name": n, "type": "text"} for n in requires]

    preconditions: List[Dict[str, Any]] = []
    cid = 0

    def add_pre(fn: str, args: List[str]) -> None:
        nonlocal cid
        cid += 1
        preconditions.append(
            {
                "condition_id": f"c_req_{cid:04d}",
                "kind": "require",
                "expr": _call_expr(fn, args),
            }
        )

    for n in requires:
        add_pre("exists", [n])
    add_pre("verify_username", [login])
    if "password" not in requires:
        raise TQParseError("PX_TQ_MISSING_PASSWORD", "tq: login flows require a password input.")
    add_pre("verify_password", [login, "password"])

    forbids: List[Dict[str, Any]] = []
    for fi, phrase in enumerate(forbid_phrases):
        if phrase in ("locked", "locked_account", "account_locked"):
            forbids.append(
                {
                    "condition_id": f"c_forbid_{fi + 1:04d}",
                    "kind": "forbid",
                    "expr": _forbid_account_locked_expr(login),
                }
            )
        else:
            raise TQParseError(
                "PX_TQ_FORBID_UNSUPPORTED",
                f"tq: unknown forbid phrase {phrase!r} (try: locked).",
            )

    transitions: List[Dict[str, Any]] = []
    tid = 0

    def add_transition(effect: str, args: List[str], from_s: str, to_s: str) -> None:
        nonlocal tid
        tid += 1
        transitions.append(
            {
                "transition_id": f"t_{tid:04d}",
                "effect_name": effect,
                "arguments": [_ident_expr(a) for a in args],
                "from_state": from_s,
                "to_state": to_s,
            }
        )

    for step in flow_steps:
        s = step.strip().lower()
        if re.match(r"^validate\s+\w+\s*$", s):
            continue
        if s in ("find user by email", "find user by username") or re.match(r"^find user by \w+$", s):
            continue
        if s == "validate password" or s == "verify password":
            continue
        if s == "create session":
            add_transition("start_session", [login], "before", "after")
            continue
        if s in ("emit login_success", "emit login success"):
            if "ip_address" not in requires:
                raise TQParseError(
                    "PX_TQ_MISSING_IP",
                    "tq: emit login_success needs ip_address in requires (log_successful_login arity).",
                )
            add_transition("log_successful_login", [login, "ip_address"], "before", "after")
            continue
        raise TQParseError("PX_TQ_UNKNOWN_FLOW_STEP", f"tq: unsupported flow step: {step!r}")

    if transitions:
        t_first = transitions[0]
        rest = transitions[1:]
        if t_first["from_state"] == "before":
            for t in rest:
                t["from_state"] = "after"
                t["to_state"] = "after"

    md = dict(DEFAULT_IR_METADATA)
    md["ir_version"] = CANONICAL_IR_VERSION
    sm = {"available": True, "prototype_only": True, "surface": "tq_v1"}
    if module:
        sm["tq_module"] = module
    md["source_map"] = sm

    postconditions: List[Dict[str, Any]] = []
    if ensures_clause is not None:
        norm = ensures_clause.strip().lower().replace(" ", "")
        if norm in ("session.created", "session_created"):
            if not any(t["effect_name"] == "start_session" for t in transitions):
                raise TQParseError(
                    "PX_TQ_ENSURES_NEEDS_TRANSITIONS",
                    "tq: ensures session.created requires a flow step create session (start_session).",
                )
            postconditions.append(
                {
                    "condition_id": "c_post_0001",
                    "kind": "postcondition",
                    "expr": _call_expr("session_stored_for_user", [login]),
                }
            )
        elif ensures_clause.strip() == "":
            pass
        else:
            raise TQParseError(
                "PX_TQ_ENSURES_UNSUPPORTED",
                f"tq: cannot map ensures {ensures_clause!r} (supported: session.created).",
            )

    if result_line is not None:
        result_val: str = result_line
    else:
        result_val = "Login Successful" if transitions else "OK"

    return {
        "ir_goal": {
            "goal": goal,
            "inputs": inputs,
            "preconditions": preconditions,
            "forbids": forbids,
            "transitions": transitions,
            "postconditions": postconditions,
            "result": result_val,
            "metadata": md,
        }
    }
