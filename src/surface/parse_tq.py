"""
Deterministic subset of `.tq` human surface → canonical ``ir_goal`` bundle.

**tq_v1 (strict)** — see ``docs/TQ_SURFACE_MAPPING.md``.

Header order: optional ``module``, then ``intent``, ``requires``, at most one ``forbid locked``,
optional ``ensures session.created``, required ``result`` / ``result …``, then ``flow:``.

Header keywords are **case-sensitive** (lowercase only): ``module``, ``intent``, ``requires``,
``forbid``, ``ensures``, ``result``, ``flow:``.

``flow:`` body: each step line is exactly two ASCII spaces + ``create session`` or ``emit login_success``,
or ``emit login_success when <ident>`` / ``emit login_success if <ident>`` (same meaning; P27 guards).
Indented ``#`` full-line comments inside ``flow:`` are skipped. No legacy no-op steps. Lines after the flow
block must be blank or full-line ``#`` comments only.

**Include (optional):** after ``intent``, before ``requires``, one or more lines
``include "relative/path.tq"`` (double quotes; each path once per file; order preserved). Nested
``include`` inside a fragment is still forbidden. Expanded text is parsed as a single document;
``metadata.source_map.tq_includes`` lists paths in expansion order.

**stub_path (optional, P28):** after ``requires``, zero or more lines ``stub_path <lang> <relpath>`` (single
path token, no ``..``). Sets ``metadata.source_map.projection_stub_paths`` for codegen layout (see
``examples/torqa/projection_stub_paths_policy.tq``).
"""

from __future__ import annotations

import re
from pathlib import Path
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


def _parse_requires_clause(stripped: str, lineno: int) -> List[str]:
    """
    Parse ``requires a, b, c`` (``stripped`` is the full line). Rejects empty lists,
    double-commas, and space-separated names without commas.
    """
    if stripped == "requires":
        raise TQParseError(
            "PX_TQ_REQUIRES_EMPTY",
            f"tq: requires needs at least one input name (line {lineno}). "
            "Fix: e.g. requires username, password (comma-separated identifiers).",
        )
    if not stripped.startswith("requires "):
        raise TQParseError(
            "PX_TQ_UNRECOGNIZED_LINE",
            f"tq: unrecognized line outside flow: {stripped!r} (line {lineno})."
            f"{_unrecognized_line_suffix(stripped)} See docs/TQ_AUTHOR_CHEATSHEET.md",
        )
    parts = stripped.split(None, 1)
    if len(parts) < 2 or not parts[1].strip():
        raise TQParseError(
            "PX_TQ_REQUIRES_EMPTY",
            f"tq: requires needs at least one input name (line {lineno}).",
        )
    rest = parts[1].strip()
    raw_parts = [p.strip() for p in rest.split(",")]
    if any(p == "" for p in raw_parts):
        raise TQParseError(
            "PX_TQ_REQUIRES_MALFORMED",
            f"tq: empty slot in requires list (line {lineno}). "
            "Fix: commas only between names (no `,,` or trailing comma). Example: requires username, password.",
        )
    names = [p for p in raw_parts if p]
    if not names:
        raise TQParseError(
            "PX_TQ_REQUIRES_EMPTY",
            f"tq: requires needs at least one input name (line {lineno}).",
        )
    if len(raw_parts) == 1 and any(c.isspace() for c in raw_parts[0]):
        raise TQParseError(
            "PX_TQ_REQUIRES_MALFORMED",
            f"tq: separate requires fields with commas, not spaces (line {lineno}). "
            "Fix: requires username, password — not `requires username password`.",
        )
    for n in names:
        if any(c.isspace() for c in n):
            raise TQParseError(
                "PX_TQ_REQUIRES_MALFORMED",
                f"tq: each requires name must be one identifier (line {lineno}); got {n!r}.",
            )
    return names


def _requires_unique(names: List[str], lineno: int) -> None:
    seen: set[str] = set()
    for n in names:
        if n in seen:
            raise TQParseError(
                "PX_TQ_REQUIRES_DUPLICATE_NAME",
                f"tq: duplicate input name {n!r} in requires (line {lineno}).",
            )
        seen.add(n)


def _primary_login_field(input_names: List[str]) -> str:
    for n in input_names:
        if n != "password" and n != "ip_address":
            return n
    raise TQParseError(
        "PX_TQ_NO_LOGIN_FIELD",
        "tq: requires needs a login field (not only password/ip_address). "
        "Fix: put username or email first, e.g. requires username, password. "
        "That first non-password field is the primary for verify_* (see docs/TQ_AUTHOR_CHEATSHEET.md).",
    )


def _forbid_account_locked_expr(login: str) -> Dict[str, Any]:
    return {
        "type": "binary",
        "operator": "==",
        "left": _call_expr("user_account_status", [login]),
        "right": {"type": "string_literal", "value": "locked"},
    }


def _unrecognized_line_suffix(stripped: str) -> str:
    """Extra UX hint when the line looks like a miscased header keyword (syntax unchanged)."""
    parts = stripped.split(None, 1)
    if not parts:
        return ""
    head = parts[0]
    low = head.lower().rstrip(":")
    if low not in ("module", "intent", "requires", "forbid", "ensures", "result", "flow", "include", "stub_path"):
        return ""
    if head == head.lower():
        return ""
    return " Fix: header keywords are lowercase only (e.g. intent not Intent; flow: not Flow:)."


_WHEN_IDENT_RE = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*$")


def _validate_when_guard(ident: str, requires: List[str], lineno: int) -> None:
    """``when`` guard: ``ip_address`` (optional audit) or any name listed in ``requires``."""
    if ident == "ip_address":
        return
    if ident in requires:
        return
    raise TQParseError(
        "PX_TQ_WHEN_UNKNOWN_IDENT",
        f"tq: guard {ident!r} must be ip_address or one of requires (line {lineno}). "
        f"Fix: add {ident!r} to requires, or use when/if ip_address for optional audit.",
    )


def _parse_emit_login_guard_keyword(rem: str, lineno: int, keyword: str) -> str:
    """Parse `` <ident>`` after ``when`` or ``if`` (same rules). ``rem`` is text after the keyword."""
    if not rem.strip():
        raise TQParseError(
            "PX_TQ_WHEN_EMPTY",
            f"tq: emit login_success {keyword} needs an input name (line {lineno}). "
            f"Example: emit login_success {keyword} ip_address",
        )
    if not rem[:1].isspace():
        raise TQParseError(
            "PX_TQ_WHEN_MALFORMED",
            f"tq: use a single space after {keyword} before the guard (line {lineno}). "
            f"Fix: emit login_success {keyword} <one_name>.",
        )
    tail = rem.strip()
    parts = tail.split()
    if len(parts) != 1:
        raise TQParseError(
            "PX_TQ_WHEN_MALFORMED",
            f"tq: guard must be a single identifier (line {lineno}); got {tail!r}.",
        )
    ident = parts[0]
    if not _WHEN_IDENT_RE.match(ident):
        raise TQParseError(
            "PX_TQ_WHEN_MALFORMED",
            f"tq: guard must be a single identifier (line {lineno}); got {ident!r}.",
        )
    return ident


def _parse_flow_step_surface(step: str, lineno: int) -> Tuple[str, Optional[str]]:
    """
    Parse one flow step (text after the two-space indent). Returns ``(kind, when_ident)`` where
    ``kind`` is ``create session`` or ``emit login_success``; ``when_ident`` is set only for guarded emit.
    """
    s = step.strip()
    if s == "create session":
        return ("create session", None)
    if s == "emit login_success":
        return ("emit login_success", None)
    when_kw = "emit login_success when"
    if_kw = "emit login_success if"
    if s.startswith(when_kw):
        ident = _parse_emit_login_guard_keyword(s[len(when_kw) :], lineno, "when")
        return ("emit login_success", ident)
    if s.startswith(if_kw) and (
        len(s) == len(if_kw) or s[len(if_kw) : len(if_kw) + 1].isspace()
    ):
        ident = _parse_emit_login_guard_keyword(s[len(if_kw) :], lineno, "if")
        return ("emit login_success", ident)
    if s.startswith("create session when "):
        raise TQParseError(
            "PX_TQ_WHEN_UNSUPPORTED_STEP",
            f"tq: when … is only allowed on emit login_success (line {lineno}).",
        )
    if s.startswith("emit login_success "):
        raise TQParseError(
            "PX_TQ_WHEN_UNSUPPORTED_STEP",
            f"tq: after emit login_success use only when <ident> or if <ident> (same meaning) (line {lineno}).",
        )
    if _is_legacy_flow_step(step):
        raise TQParseError(
            "PX_TQ_LEGACY_FLOW_STEP",
            "tq: this line is a removed legacy step (validate/find user/verify password). "
            "Fix: delete it; use only   create session   and   emit login_success   (two spaces, exact text).",
        )
    raise TQParseError(
        "PX_TQ_UNKNOWN_FLOW_STEP",
        f"tq: unsupported flow step {step!r}. "
        "Allowed: create session — emit login_success — emit login_success when/if <ident>. "
        "Fix: spelling; see examples/torqa/templates/login_flow.tq",
    )


def _is_legacy_flow_step(step: str) -> bool:
    s = step.strip().lower()
    if re.match(r"^validate\s+\w+\s*$", s):
        return True
    if s in ("find user by email", "find user by username") or re.match(r"^find user by \w+$", s):
        return True
    if s in ("validate password", "verify password"):
        return True
    return False


# One include per file; double-quoted path only; no escapes inside quotes.
_INCLUDE_LINE_RE = re.compile(r'^\s*include\s+"([^"]*)"\s*$')

# P28: optional ``stub_path <lang> <posix_relpath>`` after ``requires`` (before ``result`` / ``flow:``).
_STUB_PATH_LANGS = frozenset({"rust", "python", "sql", "typescript", "go", "kotlin", "cpp"})
_STUB_PATH_REL_RE = re.compile(r"^[A-Za-z0-9][-A-Za-z0-9_./]*$")


def _tq_include_match(line: str) -> Optional[re.Match[str]]:
    return _INCLUDE_LINE_RE.match(line)


def expand_tq_includes(text: str, base_file: Path) -> Tuple[str, List[str]]:
    """
    Replace each ``include "rel.tq"`` line (after ``intent``, before ``requires``) with file contents.

    The same path may not appear twice on the including file; order is preserved in ``tq_includes``.

    Returns ``(expanded_text, relative_paths_used)``.
    """
    base_dir = base_file.resolve().parent
    lines = text.splitlines()
    out_lines: List[str] = []
    included_rels: List[str] = []
    include_paths_seen: set[str] = set()
    intent_seen = False
    requires_seen = False
    ends_with_nl = len(text) > 0 and text.endswith(("\n", "\r\n"))

    for lineno, line in enumerate(lines, start=1):
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            out_lines.append(line)
            continue
        m = _tq_include_match(line)
        if not m:
            if stripped.startswith("intent "):
                intent_seen = True
            elif stripped.startswith("requires "):
                requires_seen = True
            out_lines.append(line)
            continue

        if not intent_seen or requires_seen:
            raise TQParseError(
                "PX_TQ_INCLUDE_POSITION",
                f"tq: include must appear after intent and before requires (line {lineno}). "
                "See docs/TQ_SURFACE_MAPPING.md",
            )
        rel = (m.group(1) or "").strip()
        if not rel:
            raise TQParseError(
                "PX_TQ_INCLUDE_SYNTAX",
                f"tq: include needs a non-empty path in double quotes (line {lineno}). Example: include \"shared/part.tq\"",
            )
        inc_path = (base_dir / rel).resolve()
        try:
            inc_path.relative_to(base_dir)
        except ValueError:
            raise TQParseError(
                "PX_TQ_INCLUDE_PATH",
                f"tq: include path must stay under the directory of the including file (line {lineno}): {rel!r}",
            )
        if not inc_path.is_file():
            raise TQParseError(
                "PX_TQ_INCLUDE_NOT_FOUND",
                f"tq: included file not found for include {rel!r} (line {lineno}). "
                f"Looked for: {inc_path} (paths are relative to {base_dir}).",
            )
        norm_rel = rel.replace("\\", "/")
        if norm_rel in include_paths_seen:
            raise TQParseError(
                "PX_TQ_INCLUDE_DUPLICATE",
                f"tq: duplicate include of the same path (line {lineno}): {norm_rel!r}",
            )
        include_paths_seen.add(norm_rel)
        try:
            inner = inc_path.read_text(encoding="utf-8")
        except OSError as ex:
            raise TQParseError(
                "PX_TQ_INCLUDE_IO",
                f"tq: could not read include {rel!r} (line {lineno}): {ex}",
            ) from ex
        for iline in inner.splitlines():
            sl = iline.strip()
            if not sl or sl.startswith("#"):
                continue
            if _tq_include_match(iline):
                raise TQParseError(
                    "PX_TQ_INCLUDE_NESTED_FORBIDDEN",
                    "tq: included files must not use include (nested include is not supported).",
                )
        out_lines.extend(inner.splitlines())
        included_rels.append(norm_rel)

    joined = "\n".join(out_lines)
    if ends_with_nl and joined and not joined.endswith("\n"):
        joined += "\n"
    return joined, included_rels


def _text_has_include_directive(text: str) -> bool:
    for line in text.splitlines():
        sl = line.strip()
        if not sl or sl.startswith("#"):
            continue
        if _tq_include_match(line):
            return True
    return False


def _parse_header_and_flow(
    text: str,
) -> Tuple[
    Optional[str],
    str,
    List[str],
    Optional[str],
    Optional[str],
    List[str],
    List[Tuple[str, Optional[str]]],
    Dict[str, str],
]:
    module: Optional[str] = None
    intent = ""
    requires: List[str] = []
    ensures: Optional[str] = None
    result_line: Optional[str] = None
    forbid_phrases: List[str] = []
    flow_steps: List[Tuple[str, Optional[str]]] = []
    stub_paths: Dict[str, str] = {}
    in_flow = False
    after_flow = False
    singleton_headers: set[str] = set()
    # start | need_intent | need_requires | post_a | post_b | post_c
    phase = "start"
    locked_forbid_seen = False

    def _once(key: str, lineno: int) -> None:
        if key in singleton_headers:
            raise TQParseError(
                "PX_TQ_DUPLICATE_HEADER",
                f"tq: duplicate {key!r} header (line {lineno}); use at most once before flow:.",
            )
        singleton_headers.add(key)

    def _header_order(msg: str, lineno: int) -> TQParseError:
        return TQParseError(
            "PX_TQ_HEADER_ORDER",
            f"tq: {msg} (line {lineno}). Expected order: "
            "module (optional), intent, requires, optional stub_path lines, forbid locked (at most once), "
            "ensures session.created (optional), result (required), flow:. "
            "Missing a line? Add intent, then requires, then result, then flow: (see docs/TQ_AUTHOR_CHEATSHEET.md).",
        )

    lines = text.splitlines()
    n = len(lines)
    i = 0

    while i < n:
        raw = lines[i]
        lineno = i + 1
        line = raw.rstrip()

        if after_flow:
            if not line.strip() or line.lstrip().startswith("#"):
                i += 1
                continue
            raise TQParseError(
                "PX_TQ_CONTENT_AFTER_FLOW",
                f"tq: nothing may follow the flow block except blank lines and # comments (line {lineno}). "
                f"Got: {line!r}. Fix: remove this line or move it above flow:.",
            )

        if in_flow:
            if not line.strip():
                raise TQParseError(
                    "PX_TQ_FLOW_BLANK_LINE",
                    f"tq: blank line inside flow: is not allowed (line {lineno}). "
                    "Fix: delete the empty line or use only step lines (two spaces + create session / emit login_success).",
                )
            if not raw.startswith("  "):
                in_flow = False
                after_flow = True
                continue
            if len(raw) < 3 or raw[2] in (" ", "\t"):
                raise TQParseError(
                    "PX_TQ_FLOW_INDENT",
                    f"tq: flow step must start with exactly two ASCII spaces, then the step text — no tabs or extra spaces (line {lineno}). "
                    "Example: the line begins with two spaces, then `create session`.",
                )
            step_raw = raw[2:].rstrip()
            if not step_raw:
                raise TQParseError(
                    "PX_TQ_FLOW_BLANK_LINE",
                    f"tq: empty step after the two-space indent (line {lineno}). "
                    "Fix: after the two spaces write `create session` or `emit login_success` (exact spelling).",
                )
            if step_raw.lstrip().startswith("#"):
                i += 1
                continue
            kind, guard = _parse_flow_step_surface(step_raw, lineno)
            if guard is not None:
                _validate_when_guard(guard, requires, lineno)
            flow_steps.append((kind, guard))
            i += 1
            continue

        if not line.strip() or line.lstrip().startswith("#"):
            i += 1
            continue

        stripped = line.strip()
        if stripped.startswith("unless "):
            raise TQParseError(
                "PX_TQ_UNLESS_UNSUPPORTED",
                f"tq: unless is not implemented yet; use forbid … or IR forbids[] directly. (line {lineno})",
            )

        if stripped.startswith("module "):
            if phase != "start":
                raise _header_order("module must come before intent", lineno)
            _once("module", lineno)
            module = stripped.split(None, 1)[1].strip()
            phase = "need_intent"
        elif stripped.startswith("intent "):
            if phase not in ("start", "need_intent"):
                raise _header_order("intent must follow optional module and precede requires", lineno)
            _once("intent", lineno)
            intent = stripped.split(None, 1)[1].strip()
            if "-" in intent:
                raise TQParseError(
                    "PX_TQ_INTENT_FORM",
                    f"tq: intent must use snake_case with underscores only, not '-'. (line {lineno})",
                )
            phase = "need_requires"
        elif stripped == "requires" or stripped.startswith("requires "):
            if phase != "need_requires":
                raise _header_order("requires must follow intent", lineno)
            _once("requires", lineno)
            requires = _parse_requires_clause(stripped, lineno)
            _requires_unique(requires, lineno)
            phase = "post_a"
        elif stripped.startswith("stub_path "):
            if phase != "post_a":
                raise _header_order("stub_path lines must follow requires (before result and flow:)", lineno)
            parts = stripped.split(None, 2)
            if len(parts) < 3 or not parts[2].strip():
                raise TQParseError(
                    "PX_TQ_STUB_PATH_MALFORMED",
                    f"tq: stub_path needs a language and one path token (line {lineno}). "
                    "Example: stub_path rust generated/rust/main.rs",
                )
            lang = parts[1].strip().lower()
            path = parts[2].strip().replace("\\", "/")
            if any(c.isspace() for c in path):
                raise TQParseError(
                    "PX_TQ_STUB_PATH_MALFORMED",
                    f"tq: stub_path path must be a single token (no spaces) (line {lineno}).",
                )
            if ".." in path or path.startswith("/"):
                raise TQParseError(
                    "PX_TQ_STUB_PATH_INVALID",
                    f"tq: stub_path must be a relative repo-style path (line {lineno}); got {path!r}.",
                )
            if lang not in _STUB_PATH_LANGS:
                raise TQParseError(
                    "PX_TQ_STUB_PATH_LANG",
                    f"tq: stub_path language {lang!r} is not supported (line {lineno}). "
                    f"Use one of: {', '.join(sorted(_STUB_PATH_LANGS))}.",
                )
            if not _STUB_PATH_REL_RE.match(path):
                raise TQParseError(
                    "PX_TQ_STUB_PATH_INVALID",
                    f"tq: stub_path uses only ASCII letters, digits, ._/- (line {lineno}); got {path!r}.",
                )
            if lang in stub_paths:
                raise TQParseError(
                    "PX_TQ_STUB_PATH_DUPLICATE",
                    f"tq: duplicate stub_path for {lang!r} (line {lineno}). At most one path per language.",
                )
            stub_paths[lang] = path
        elif stripped.startswith("ensures "):
            if phase != "post_a":
                raise _header_order(
                    "ensures is allowed once, after optional forbid lines and before result and flow:",
                    lineno,
                )
            _once("ensures", lineno)
            rest = stripped.split(None, 1)[1].strip() if len(stripped.split(None, 1)) > 1 else ""
            if not rest:
                raise TQParseError(
                    "PX_TQ_ENSURES_EMPTY",
                    f"tq: ensures needs a clause (use 'ensures session.created'). (line {lineno})",
                )
            ensures = rest
            phase = "post_b"
        elif stripped.startswith("forbid "):
            if phase != "post_a":
                raise _header_order("forbid lines must come right after requires (before ensures, result, flow)", lineno)
            parts = stripped.split(None, 1)
            if len(parts) < 2 or not parts[1].strip():
                raise TQParseError(
                    "PX_TQ_FORBID_EMPTY",
                    f"tq: forbid line needs a phrase, e.g. forbid locked. (line {lineno})",
                )
            phrase = parts[1].strip().lower()
            if phrase != "locked":
                raise TQParseError(
                    "PX_TQ_FORBID_UNSUPPORTED",
                    f"tq: only 'forbid locked' is supported (got {phrase!r}). (line {lineno})",
                )
            if locked_forbid_seen:
                raise TQParseError(
                    "PX_TQ_DUPLICATE_FORBID",
                    f"tq: duplicate forbid locked line. (line {lineno})",
                )
            locked_forbid_seen = True
            forbid_phrases.append(phrase)
        elif stripped == "result":
            if phase not in ("post_a", "post_b", "post_c"):
                raise _header_order("result must come after requires (and optional forbid/ensures)", lineno)
            _once("result", lineno)
            result_line = "OK"
            phase = "post_c"
        elif stripped.startswith("result "):
            if phase not in ("post_a", "post_b", "post_c"):
                raise _header_order("result must come after requires (and optional forbid/ensures)", lineno)
            _once("result", lineno)
            parts = stripped.split(None, 1)
            result_line = parts[1].strip() if len(parts) > 1 else "OK"
            phase = "post_c"
        elif stripped == "flow:":
            if phase not in ("post_a", "post_b", "post_c"):
                raise _header_order("flow: must come after intent and requires", lineno)
            if result_line is None:
                raise TQParseError(
                    "PX_TQ_MISSING_RESULT",
                    f"tq: 'result' is required immediately before flow: (line {lineno}). "
                    "Fix: add e.g. `result OK` or `result Login Successful` on the previous line.",
                )
            _once("flow", lineno)
            in_flow = True
            phase = "in_flow"
        elif stripped == "flow":
            raise TQParseError(
                "PX_TQ_FLOW_COLON",
                f"tq: the flow header must be exactly `flow:` with a colon (line {lineno}).",
            )
        else:
            raise TQParseError(
                "PX_TQ_UNRECOGNIZED_LINE",
                f"tq: unrecognized line outside flow: {stripped!r} (line {lineno})."
                f"{_unrecognized_line_suffix(stripped)} See docs/TQ_AUTHOR_CHEATSHEET.md",
            )
        i += 1

    if not intent:
        raise TQParseError(
            "PX_TQ_MISSING_INTENT",
            "tq: missing intent line. Fix: add `intent your_flow_name` after optional module. "
            "See docs/TQ_AUTHOR_CHEATSHEET.md",
        )
    if not requires:
        raise TQParseError(
            "PX_TQ_MISSING_REQUIRES",
            "tq: missing requires line. Fix: after intent, add e.g. `requires username, password`. "
            "See examples/torqa/templates/minimal.tq",
        )
    if result_line is None:
        raise TQParseError(
            "PX_TQ_MISSING_RESULT",
            "tq: missing required 'result' line before flow:. Fix: add e.g. `result OK` above flow:. "
            "See docs/TQ_AUTHOR_CHEATSHEET.md",
        )
    return module, intent, requires, ensures, result_line, forbid_phrases, flow_steps, stub_paths


def parse_tq_source(text: str, *, tq_path: Optional[Path] = None) -> Dict[str, Any]:
    if tq_path is None:
        if _text_has_include_directive(text):
            raise TQParseError(
                "PX_TQ_INCLUDE_NEEDS_PATH",
                "tq: include \"...\" only works when parsing a file path. "
                "Use torqa surface PATH.tq, load_bundle_from_source(Path), or parse_tq_source(text, tq_path=Path(...)).",
            )
        expanded = text
        tq_includes: List[str] = []
    else:
        expanded, tq_includes = expand_tq_includes(text, tq_path)

    (
        module,
        intent,
        requires,
        ensures_clause,
        result_line,
        forbid_phrases,
        flow_steps,
        stub_paths,
    ) = _parse_header_and_flow(expanded)
    goal = _snake_to_pascal(intent)
    if not goal:
        raise TQParseError(
            "PX_TQ_BAD_INTENT",
            f"tq: intent {intent!r} does not map to a PascalCase goal.",
        )

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
        raise TQParseError(
            "PX_TQ_MISSING_PASSWORD",
            "tq: requires must include password. Fix: add password to the requires list.",
        )
    add_pre("verify_password", [login, "password"])

    forbids: List[Dict[str, Any]] = []
    for fi, phrase in enumerate(forbid_phrases):
        if phrase == "locked":
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

    for kind, guard in flow_steps:
        if kind == "create session":
            add_transition("start_session", [login], "before", "after")
            continue
        if kind == "emit login_success":
            if guard is not None and guard not in requires:
                continue
            if "ip_address" not in requires:
                raise TQParseError(
                    "PX_TQ_MISSING_IP",
                    "tq: emit login_success needs ip_address in requires when this step runs. "
                    "Fix: e.g. requires username, password, ip_address — or omit the emit line / use when ip_address without ip only if you skip audit.",
                )
            add_transition("log_successful_login", [login, "ip_address"], "before", "after")
            continue
        raise TQParseError(
            "PX_TQ_UNKNOWN_FLOW_STEP",
            f"tq: internal error: unknown flow kind {kind!r}.",
        )

    n_create = sum(1 for k, _ in flow_steps if k == "create session")
    n_emit = sum(1 for k, _ in flow_steps if k == "emit login_success")
    if n_create > 1 or n_emit > 1:
        raise TQParseError(
            "PX_TQ_FLOW_DUPLICATE_STEP",
            "tq: duplicate flow step. At most one create session and one emit line (guarded or not). "
            "Fix: remove the extra line.",
        )

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
    if tq_includes:
        sm["tq_includes"] = list(tq_includes)
    if stub_paths:
        sm["projection_stub_paths"] = dict(sorted(stub_paths.items()))
    md["source_map"] = sm

    postconditions: List[Dict[str, Any]] = []
    if ensures_clause is not None:
        norm = ensures_clause.strip().lower().replace(" ", "")
        if norm == "session.created":
            if not any(t["effect_name"] == "start_session" for t in transitions):
                raise TQParseError(
                    "PX_TQ_ENSURES_NEEDS_TRANSITIONS",
                    "tq: ensures session.created needs a matching flow step. "
                    "Fix: add line   create session   inside flow:.",
                )
            postconditions.append(
                {
                    "condition_id": "c_post_0001",
                    "kind": "postcondition",
                    "expr": _call_expr("session_stored_for_user", [login]),
                }
            )
        else:
            raise TQParseError(
                "PX_TQ_ENSURES_UNSUPPORTED",
                f"tq: cannot map ensures {ensures_clause!r} (supported: session.created).",
            )

    result_val: str = result_line

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
