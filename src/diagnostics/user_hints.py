"""
Short fix hints + doc pointers for frequent diagnostic codes (web UI / CLI).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Set, TypedDict


class HintPayload(TypedDict, total=False):
    hint: str
    doc: str


HINTS_BY_CODE: Dict[str, HintPayload] = {
    "PX_IR_GOAL_EMPTY": {
        "hint": "Set ir_goal.goal to a non-empty PascalCase ASCII identifier (e.g. UserLoginFlow).",
        "doc": "docs/FORMAL_CORE.md#42-kind--type-phase",
    },
    "PX_IR_METADATA": {
        "hint": "Ensure ir_goal.metadata includes ir_version (must match toolchain), source, and canonical_language.",
        "doc": "docs/FORMAL_CORE.md#42-kind--type-phase",
    },
    "PX_SEM_UNKNOWN_FUNCTION": {
        "hint": "Use only names from default_ir_function_registry; run `torqa language` for the current list.",
        "doc": "docs/FORMAL_CORE.md#42-kind--type-phase",
    },
    "PX_SEM_UNKNOWN_EFFECT": {
        "hint": "Transition effect_name must be a void builtin with matching arity; see `torqa language`.",
        "doc": "docs/FORMAL_CORE.md#42-kind--type-phase",
    },
    "PX_IR_CONDITION_ID_COLLISION": {
        "hint": "condition_id values must be unique across preconditions, forbids, and postconditions.",
        "doc": "docs/FORMAL_CORE.md#43-well-formedness-phase",
    },
    "PX_PARSE_FAILED": {
        "hint": "Expected a single JSON object IR bundle (see spec/IR_BUNDLE.schema.json). For a minimal template run `torqa language --minimal-json`.",
        "doc": "spec/IR_BUNDLE.schema.json",
    },
    "PX_SEM_ARITY": {
        "hint": "Argument count must match the builtin signature; run `torqa language` for arity per function.",
        "doc": "docs/FORMAL_CORE.md#42-kind--type-phase",
    },
    "PX_SEM_TYPE": {
        "hint": "Expression types must match declared input/semantic types; check bound inputs and literals.",
        "doc": "docs/FORMAL_CORE.md#42-kind--type-phase",
    },
    "PX_SEM_UNDEFINED_IDENT": {
        "hint": "Use only names declared in ir_goal.inputs (and builtins from `torqa language`).",
        "doc": "docs/FORMAL_CORE.md#42-kind--type-phase",
    },
    "PX_HANDOFF": {
        "hint": "Handoff rules require ASCII identifiers and supported operators in expressions; simplify or adjust literals.",
        "doc": "docs/FORMAL_CORE.md",
    },
    "PX_IR_SEMANTIC_DETERMINISM": {
        "hint": "Remove ambiguous or non-deterministic expression patterns required by the IR contract.",
        "doc": "docs/FORMAL_CORE.md#43-well-formedness-phase",
    },
    "PX_SEM_FORBID_GUARANTEE": {
        "hint": "Forbids must be checkable in the before-state; add a precondition that establishes needed facts.",
        "doc": "docs/FORMAL_CORE.md#43-well-formedness-phase",
    },
    "PX_SEM_TRANSITION_READ": {
        "hint": "A transition reads world state that must be guaranteed before it runs; add matching preconditions.",
        "doc": "docs/FORMAL_CORE.md#43-well-formedness-phase",
    },
    # --- .tq surface (representative PX_TQ_*; unknown codes fall back to tq_parse_extras default) ---
    "PX_TQ_UNKNOWN_FLOW_STEP": {
        "hint": "Use two spaces + create session, emit login_success, or emit login_success when/if <ident> (same guard; see docs/TQ_SURFACE_MAPPING.md P27).",
        "doc": "docs/TQ_AUTHOR_CHEATSHEET.md",
    },
    "PX_TQ_WHEN_EMPTY": {
        "hint": "Write emit login_success when ip_address or emit login_success if ip_address (single guard name).",
        "doc": "docs/TQ_SURFACE_MAPPING.md",
    },
    "PX_TQ_WHEN_MALFORMED": {
        "hint": "After when or if, the guard must be exactly one identifier (no spaces or extra tokens).",
        "doc": "docs/TQ_SURFACE_MAPPING.md",
    },
    "PX_TQ_WHEN_UNKNOWN_IDENT": {
        "hint": "Use ip_address or a name that appears in requires (add the input or fix spelling). when and if mean the same thing.",
        "doc": "docs/TQ_SURFACE_MAPPING.md",
    },
    "PX_TQ_WHEN_UNSUPPORTED_STEP": {
        "hint": "when/if … is only valid after emit login_success, not create session.",
        "doc": "docs/TQ_SURFACE_MAPPING.md",
    },
    "PX_TQ_STUB_PATH_MALFORMED": {
        "hint": "Use stub_path <lang> <one_path_token> after requires (e.g. stub_path rust generated/rust/main.rs).",
        "doc": "docs/TQ_SURFACE_MAPPING.md",
    },
    "PX_TQ_STUB_PATH_INVALID": {
        "hint": "Path must be relative (no leading /) and must not contain .. ; use ASCII letters, digits, ._/- only.",
        "doc": "docs/TQ_SURFACE_MAPPING.md",
    },
    "PX_TQ_STUB_PATH_LANG": {
        "hint": "Language must be rust, python, sql, typescript, go, kotlin, or cpp.",
        "doc": "docs/TQ_SURFACE_MAPPING.md",
    },
    "PX_TQ_STUB_PATH_DUPLICATE": {
        "hint": "At most one stub_path line per language.",
        "doc": "docs/TQ_SURFACE_MAPPING.md",
    },
    "PX_TQ_REQUIRES_EMPTY": {
        "hint": "requires must list at least one name after the keyword, comma-separated (e.g. requires username, password).",
        "doc": "docs/TQ_AUTHOR_CHEATSHEET.md",
    },
    "PX_TQ_REQUIRES_MALFORMED": {
        "hint": "Use commas between identifiers; no double commas; no spaces where a comma is needed.",
        "doc": "docs/TQ_AUTHOR_CHEATSHEET.md",
    },
    "PX_TQ_FLOW_COLON": {
        "hint": "The header is the two characters flow: (lowercase flow, ASCII colon).",
        "doc": "docs/TQ_AUTHOR_CHEATSHEET.md",
    },
    "PX_TQ_FLOW_DUPLICATE_STEP": {
        "hint": "List each flow step at most once (one create session; at most one emit login_success).",
        "doc": "docs/TQ_AUTHOR_CHEATSHEET.md",
    },
    "PX_TQ_LEGACY_FLOW_STEP": {
        "hint": "Remove validate/find user/verify password lines; only effect steps are allowed in flow:.",
        "doc": "docs/TQ_SURFACE_MAPPING.md",
    },
    "PX_TQ_HEADER_ORDER": {
        "hint": "Follow strict header order: module (optional), intent, requires, forbid locked, ensures, result, flow:.",
        "doc": "docs/TQ_SURFACE_MAPPING.md",
    },
    "PX_TQ_CONTENT_AFTER_FLOW": {
        "hint": "Nothing may follow the flow block except blank lines and # comments.",
        "doc": "docs/TQ_SURFACE_MAPPING.md",
    },
    "PX_TQ_FLOW_BLANK_LINE": {
        "hint": "Do not leave blank lines between flow: steps.",
        "doc": "docs/TQ_SURFACE_MAPPING.md",
    },
    "PX_TQ_FLOW_INDENT": {
        "hint": "Each flow step line must start with exactly two spaces (ASCII), then the step text.",
        "doc": "docs/TQ_SURFACE_MAPPING.md",
    },
    "PX_TQ_ENSURES_EMPTY": {
        "hint": "Use ensures session.created with a non-empty clause.",
        "doc": "docs/TQ_SURFACE_MAPPING.md",
    },
    "PX_TQ_DUPLICATE_FORBID": {
        "hint": "Use at most one forbid locked line.",
        "doc": "docs/TQ_SURFACE_MAPPING.md",
    },
    "PX_TQ_INTENT_FORM": {
        "hint": "Use underscores in intent names, not hyphens (e.g. user_login).",
        "doc": "docs/TQ_SURFACE_MAPPING.md",
    },
    "PX_TQ_UNRECOGNIZED_LINE": {
        "hint": "Use lowercase header keywords only (module, intent, requires, forbid, ensures, result, flow:). See docs/TQ_AUTHOR_CHEATSHEET.md.",
        "doc": "docs/TQ_AUTHOR_CHEATSHEET.md",
    },
    "PX_TQ_MISSING_REQUIRES": {
        "hint": "Add a requires line listing inputs (e.g. username, password, ip_address for sign-in flows).",
        "doc": "examples/workspace_minimal/app.tq",
    },
    "PX_TQ_BAD_INTENT": {
        "hint": "intent must map to a PascalCase goal name (snake_case intent is converted; fix spelling or pattern).",
        "doc": "examples/workspace_minimal/app.tq",
    },
    "PX_TQ_MISSING_INTENT": {
        "hint": "Add a line: intent your_flow_name",
        "doc": "examples/workspace_minimal/app.tq",
    },
    "PX_TQ_DUPLICATE_HEADER": {
        "hint": "Use each of module, intent, requires, ensures, result, and flow: at most once before the flow body.",
        "doc": "docs/TQ_SURFACE_MAPPING.md",
    },
    "PX_TQ_REQUIRES_DUPLICATE_NAME": {
        "hint": "List each input once in requires (comma-separated names).",
        "doc": "docs/TQ_SURFACE_MAPPING.md",
    },
    "PX_TQ_MISSING_RESULT": {
        "hint": "Add a result line before flow: (e.g. result OK or result Login Successful).",
        "doc": "docs/TQ_AUTHOR_CHEATSHEET.md",
    },
    "PX_TQ_NO_LOGIN_FIELD": {
        "hint": "List a username or email before password; the first non-password field is the login primary.",
        "doc": "docs/TQ_AUTHOR_CHEATSHEET.md",
    },
    "PX_TQ_MISSING_PASSWORD": {
        "hint": "Add password to requires for login-oriented flows.",
        "doc": "docs/TQ_AUTHOR_CHEATSHEET.md",
    },
    "PX_TQ_MISSING_IP": {
        "hint": "emit login_success needs ip_address in requires (e.g. username, password, ip_address).",
        "doc": "docs/TQ_AUTHOR_CHEATSHEET.md",
    },
    "PX_TQ_ENSURES_NEEDS_TRANSITIONS": {
        "hint": "ensures session.created needs a create session step inside flow:.",
        "doc": "docs/TQ_AUTHOR_CHEATSHEET.md",
    },
    "PX_TQ_INCLUDE_NEEDS_PATH": {
        "hint": "include only resolves paths when parsing from a file (torqa surface FILE.tq or tq_path=).",
        "doc": "docs/TQ_SURFACE_MAPPING.md",
    },
    "PX_TQ_INCLUDE_POSITION": {
        "hint": "Place include lines after intent and before requires (several distinct paths allowed). See examples/torqa/example_include_chained.tq.",
        "doc": "docs/TQ_SURFACE_MAPPING.md",
    },
    "PX_TQ_INCLUDE_NOT_FOUND": {
        "hint": "Path is relative to the .tq file directory; check spelling and examples/torqa/modules/.",
        "doc": "docs/TQ_SURFACE_MAPPING.md",
    },
    "PX_TQ_INCLUDE_NESTED_FORBIDDEN": {
        "hint": "Included .tq files must not contain include.",
        "doc": "docs/TQ_SURFACE_MAPPING.md",
    },
    "PX_IR_CANONICAL_ORDER": {
        "hint": "Reorder preconditions, forbids, postconditions, or transitions so ids ascend numerically (c_req_0001, c_req_0002, …; t_0001, t_0002, …).",
        "doc": "docs/FORMAL_CORE.md",
    },
    "PX_IR_TRANSITION_AMBIGUOUS": {
        "hint": "Only one edge may go from before→after; chain further effects as after→after (see parse_tq session+emit ordering).",
        "doc": "docs/TQ_SURFACE_MAPPING.md",
    },
}

_TQ_DEFAULT: HintPayload = {
    "hint": "Compare with examples/torqa/templates/, docs/TQ_AUTHOR_CHEATSHEET.md, or examples/torqa/*.tq.",
    "doc": "docs/TQ_AUTHOR_CHEATSHEET.md",
}


def tq_parse_extras(code: str) -> HintPayload:
    """Hint/doc for TQParseError.code (stable PX_TQ_*)."""
    if code in HINTS_BY_CODE:
        return HINTS_BY_CODE[code]
    return dict(_TQ_DEFAULT)


_TQ_INCLUDE_NOT_IR = (
    "This is TQ file include (the include \"…\" line in .tq text). "
    "It is not IR package compose (torqa compose, torqa.lock.json, torqa.package.json)."
)


def format_tq_cli_error(code: str, message: str, *, tq_path: Optional[Path] = None) -> str:
    """ERROR / Why / Fix / Example / Try for .tq parse failures (CLI human mode)."""
    why, fix, example, try_cmd = _tq_hint(code, message, tq_path=tq_path)
    return "\n".join(
        [
            "ERROR:",
            f"✖ {code}: {message}",
            f"→ Why: {why}",
            f"→ Fix: {fix}",
            f"→ Example: {example}",
            f"Try: {try_cmd}",
        ]
    )


def _tq_hint(code: str, message: str, *, tq_path: Optional[Path] = None) -> tuple[str, str, str, str]:
    if code == "PX_TQ_INCLUDE_NOT_FOUND":
        ex_dir = f"{tq_path.parent.name}/" if tq_path else "your_folder/"
        return (
            f"{_TQ_INCLUDE_NOT_IR} The path did not resolve to an existing file.",
            "Path in quotes is relative to the .tq file’s directory, not cwd. Create the file or fix spelling (use / in the string).",
            f'If main.tq is in {ex_dir}, include "lib/x.tq" opens {ex_dir}lib/x.tq',
            "torqa surface FILE.tq --out bundle.json  |  IR packages: docs/USING_PACKAGES.md",
        )
    if code == "PX_TQ_INCLUDE_PATH":
        return (
            f"{_TQ_INCLUDE_NOT_IR} Paths may not escape above the including file’s directory.",
            'Put shared snippets under that directory, e.g. include "shared/part.tq".',
            'include "shared/part.tq" with file next to parent under shared/',
            "examples/torqa/example_include_user_login.tq",
        )
    if code == "PX_TQ_INCLUDE_POSITION":
        return (
            f"{_TQ_INCLUDE_NOT_IR} include lines must sit between intent and requires.",
            "Put one or more include \"…\" lines after intent, then requires (same path only once).",
            'intent my_flow\ninclude "lib/a.tq"\ninclude "lib/b.tq"\nrequires username, password',
            "examples/torqa/example_include_chained.tq",
        )
    if code == "PX_TQ_INCLUDE_SYNTAX":
        return (
            f"{_TQ_INCLUDE_NOT_IR} The include line has strict syntax.",
            'One line, keyword include, double quotes, non-empty relative path.',
            'include "modules/helpers.tq"',
            "docs/TQ_SURFACE_MAPPING.md",
        )
    if code == "PX_TQ_INCLUDE_DUPLICATE":
        return (
            f"{_TQ_INCLUDE_NOT_IR} The same include path cannot appear twice in one file.",
            "Use distinct fragment files, or merge duplicate lines into one include target.",
            'intent x\ninclude "lib/a.tq"\ninclude "lib/b.tq"\nrequires username, password',
            "docs/TQ_SURFACE_MAPPING.md",
        )
    if code == "PX_TQ_INCLUDE_NESTED_FORBIDDEN":
        return (
            f"{_TQ_INCLUDE_NOT_IR} Nested include is not supported.",
            "Flatten into one include target, or stop using include for that layer.",
            "To merge IR JSON from packages, use torqa compose + compose.json (see docs/USING_PACKAGES.md).",
            "docs/USING_PACKAGES.md",
        )
    if code == "PX_TQ_INCLUDE_NEEDS_PATH":
        return (
            f"{_TQ_INCLUDE_NOT_IR} include resolves paths only when the parser knows the .tq file location.",
            "Run torqa surface/build/project with a real file path, not raw stdin without tq_path.",
            "torqa surface app/main.tq --out bundle.json",
            "torqa surface examples/torqa/example_include_user_login.tq --out ir.json",
        )
    if code == "PX_TQ_INCLUDE_IO":
        return (
            f"{_TQ_INCLUDE_NOT_IR} The included file could not be read.",
            "Check file permissions and UTF-8 encoding.",
            "torqa surface FILE.tq --out bundle.json",
            "docs/TQ_SURFACE_MAPPING.md",
        )
    extra = tq_parse_extras(code)
    hint = extra.get("hint") or "Compare with examples/torqa/templates/ and docs/TQ_SURFACE_MAPPING.md."
    doc = extra.get("doc") or "docs/TQ_AUTHOR_CHEATSHEET.md"
    return (
        "The .tq surface parser rejected this input.",
        hint,
        doc,
        "torqa surface FILE.tq --out ir_bundle.json",
    )


# Repo-relative onboarding hints: structure from TORQA IR (examples/torqa_self/); see onboarding_ir.
from src.torqa_self.onboarding_ir import (
    ONBOARDING_STARTER_LINE,
    ONBOARDING_STARTER_TQ,
    ONBOARDING_TEMPLATES_LINE,
    ONBOARDING_TRY_BUILD,
    load_onboarding_suggested_next_prefix,
)
from src.torqa_self.report_suggested_next_ir import (
    REPORT_NEXT_LINE_BY_SLUG,
    load_report_next_slug_order,
)
from src.torqa_self.suggested_next_merge_cap_ir import suggested_next_merge_cap
from src.torqa_self.suggested_next_merge_order_ir import (
    suggested_next_merge_onboarding_first,
    suggested_next_report_secondary_order,
)
from src.torqa_self.surface_fail_hints_ir import load_surface_project_fail_suffix


def onboarding_suggested_next_prefix() -> List[str]:
    return load_onboarding_suggested_next_prefix()


def merge_onboarding_suggested_next(
    rest: List[str],
    *,
    merge_cap_bundle: Optional[Path] = None,
    merge_order_bundle: Optional[Path] = None,
) -> List[str]:
    """Deduped onboarding prefix + rest for build/surface/validate failure guidance.

    Order of the two blocks is policy-driven (P16); dedupe and cap stay here.
    """
    cap = suggested_next_merge_cap(bundle_path=merge_cap_bundle)
    prefix = onboarding_suggested_next_prefix()
    if suggested_next_merge_onboarding_first(bundle_path=merge_order_bundle):
        seq = prefix + rest
    else:
        seq = rest + prefix
    seen: set[str] = set()
    out: List[str] = []
    for s in seq:
        if s not in seen:
            seen.add(s)
            out.append(s)
    return out[:cap]


def suggested_next_for_surface_or_project_fail() -> List[str]:
    return merge_onboarding_suggested_next(load_surface_project_fail_suffix())


def _report_codes_want_sem(codes: Set[Any]) -> bool:
    return any(c and str(c).startswith("PX_SEM_") for c in codes)


def _report_codes_want_minimal_json(codes: Set[Any]) -> bool:
    return any(c in ("PX_IR_METADATA", "PX_IR_GOAL_EMPTY", "PX_PARSE_FAILED") for c in codes)


def _report_codes_want_surface(codes: Set[Any]) -> bool:
    return any(c and str(c).startswith("PX_TQ_") for c in codes)


def _report_codes_want_validate(codes: Set[Any]) -> bool:
    return any(c in ("PX_HANDOFF", "PX_IR_SEMANTIC_DETERMINISM") for c in codes)


# Slug order from TORQA bundle (examples/torqa_self); predicates stay here.
_REPORT_NEXT_SLUG_PREDICATES: Dict[str, Callable[[Set[Any]], bool]] = {
    "report_next_sem": _report_codes_want_sem,
    "report_next_minimal_json": _report_codes_want_minimal_json,
    "report_next_surface": _report_codes_want_surface,
    "report_next_validate": _report_codes_want_validate,
}


def _apply_report_secondary_line_order(
    lines: List[str],
    *,
    merge_order_bundle: Optional[Path] = None,
) -> List[str]:
    """P16.1: optional reorder among report-selected lines only (predicates unchanged)."""
    if suggested_next_report_secondary_order(bundle_path=merge_order_bundle) != "surface_before_sem":
        return lines
    sem = REPORT_NEXT_LINE_BY_SLUG.get("report_next_sem")
    surf = REPORT_NEXT_LINE_BY_SLUG.get("report_next_surface")
    if not sem or not surf or sem not in lines or surf not in lines:
        return lines
    isem = lines.index(sem)
    isurf = lines.index(surf)
    if isem >= isurf:
        return lines
    out = list(lines)
    out.remove(surf)
    out.insert(isem, surf)
    return out


def suggested_next_from_report(
    rep: Dict[str, Any],
    *,
    report_slug_order_bundle: Optional[Path] = None,
    merge_cap_bundle: Optional[Path] = None,
    merge_order_bundle: Optional[Path] = None,
) -> List[str]:
    """Short CLI-oriented next steps from a diagnostic report (ok true or false).

    ``report_slug_order_bundle`` / ``merge_cap_bundle`` / ``merge_order_bundle`` override defaults (tests).
    """
    issues: List[dict] = list(rep.get("issues") or [])
    codes = {i.get("code") for i in issues if isinstance(i.get("code"), str)}
    out: List[str] = []
    for slug in load_report_next_slug_order(bundle_path=report_slug_order_bundle):
        pred = _REPORT_NEXT_SLUG_PREDICATES.get(slug)
        line = REPORT_NEXT_LINE_BY_SLUG.get(slug)
        if pred and line and pred(codes):
            out.append(line)
    if not out:
        default = REPORT_NEXT_LINE_BY_SLUG.get("report_next_minimal_json")
        if default:
            out.append(default)
    # de-dup preserve order
    seen: set[str] = set()
    deduped: List[str] = []
    for s in out:
        if s not in seen:
            seen.add(s)
            deduped.append(s)
    deduped = _apply_report_secondary_line_order(deduped, merge_order_bundle=merge_order_bundle)
    return merge_onboarding_suggested_next(
        deduped,
        merge_cap_bundle=merge_cap_bundle,
        merge_order_bundle=merge_order_bundle,
    )


def augment_issue(issue: Dict[str, Any]) -> Dict[str, Any]:
    code = issue.get("code")
    if not isinstance(code, str):
        return issue
    extra: Optional[HintPayload] = HINTS_BY_CODE.get(code)
    if not extra:
        return issue
    out = dict(issue)
    if "hint" not in out and "hint" in extra:
        out["hint"] = extra["hint"]
    if "doc" not in out and "doc" in extra:
        out["doc"] = extra["doc"]
    return out
