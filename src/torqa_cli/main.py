"""
``torqa`` CLI — load .tq or bundle JSON, validate IR, print diagnostics. No execution engine.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

from src.ir.canonical_ir import CANONICAL_IR_VERSION, ir_goal_from_json, ir_goal_to_json, validate_ir
from src.policy import build_policy_report
from src.semantics.ir_semantics import build_ir_semantic_report, default_ir_function_registry
from src.surface.parse_tq import TQParseError, parse_tq_source
from src.torqa_cli.bundle_load import load_bundle_from_json_path

try:
    from importlib.metadata import version as pkg_version
except ImportError:  # pragma: no cover
    from importlib_metadata import version as pkg_version  # type: ignore

# Human-oriented CLI lines (deterministic; stdout for inspect remains JSON-only).
_MSG_VALIDATE_HANDOFF_OK = "Handoff: validated artifact ready for external handoff."
_MSG_VALIDATE_BLOCKED = "Guardrail: spec blocked before execution."

LoadErr = Union[str, TQParseError, None]


def _load_input(path: Path) -> Tuple[Optional[Dict[str, Any]], LoadErr, str]:
    """
    Returns ``(bundle, error, input_type)`` where ``input_type`` is ``tq``, ``json``, or ``unknown``.
    ``error`` is ``None`` on success; otherwise ``TQParseError`` for ``.tq`` parse failures,
    or ``str`` for I/O / JSON / envelope issues.
    """
    suf = path.suffix.lower()
    if suf == ".tq":
        try:
            text = path.read_text(encoding="utf-8")
        except OSError as ex:
            return None, f"{path}: {ex}", "tq"
        try:
            bundle = parse_tq_source(text, tq_path=path.resolve())
            return bundle, None, "tq"
        except TQParseError as e:
            return None, e, "tq"
    if suf == ".json":
        bundle, err = load_bundle_from_json_path(path)
        return bundle, err, "json"
    return None, f"unsupported file type {path.suffix!r} (use .tq or .json)", "unknown"


def _goal_from_bundle(bundle: Dict[str, Any]) -> Tuple[Any, Optional[str]]:
    try:
        return ir_goal_from_json(bundle), None
    except (TypeError, KeyError, ValueError) as ex:
        return None, f"Invalid ir_goal payload: {ex}"


def _print_validate_header(input_type: str, path: Path) -> None:
    print(f"Input type: {input_type}")
    print(f"File: {path}")


def cmd_validate(args: argparse.Namespace) -> int:
    path: Path = args.file
    if not path.is_file():
        print(f"torqa validate: not a file: {path}", file=sys.stderr)
        return 1

    bundle, err, input_type = _load_input(path)
    if input_type == "unknown":
        print(f"torqa validate: {err}", file=sys.stderr)
        return 1

    if err is not None:
        _print_validate_header(input_type, path)
        print()
        if isinstance(err, TQParseError):
            print("Parse: FAIL")
            print(f"Error: {err.code}")
            if err.line is not None:
                print(f"Line: {err.line}")
            print(f"Message: {err}")
        elif input_type == "json":
            print("Load: FAIL")
            print(f"Error: {err}")
        else:
            print("Load: FAIL")
            print(f"Error: {err}")
        print()
        print("Result: FAIL")
        print(_MSG_VALIDATE_BLOCKED)
        return 1

    assert bundle is not None
    goal, gerr = _goal_from_bundle(bundle)
    if gerr is not None:
        _print_validate_header(input_type, path)
        print()
        print("IR payload: FAIL")
        print(f"Error: {gerr}")
        print()
        print("Result: FAIL")
        print(_MSG_VALIDATE_BLOCKED)
        return 1

    load_word = "Parse" if input_type == "tq" else "Load"
    _print_validate_header(input_type, path)
    print()
    print(f"{load_word}: OK")

    struct = validate_ir(goal)
    if struct:
        print("Structural validation: FAIL")
        for line in struct:
            print(f"  - {line}")
        print()
        print("Result: FAIL")
        print(_MSG_VALIDATE_BLOCKED)
        return 1

    print("Structural validation: PASS")

    reg = default_ir_function_registry()
    report = build_ir_semantic_report(goal, reg)
    sem_ok = bool(report.get("semantic_ok"))
    logic_ok = bool(report.get("logic_ok"))

    errs: List[str] = list(report.get("errors") or [])
    warns: List[str] = list(report.get("warnings") or [])

    print(f"Semantic validation: {'PASS' if sem_ok else 'FAIL'}")
    print(f"Logic validation: {'PASS' if logic_ok else 'FAIL'}")
    if errs:
        print("Semantic errors:")
        for e in errs:
            print(f"  - {e}")
    if warns:
        print("Warnings:")
        for w in warns:
            print(f"  - {w}")

    print()
    if not sem_ok or not logic_ok:
        print("Result: FAIL")
        print(_MSG_VALIDATE_BLOCKED)
        return 1

    profile = getattr(args, "profile", "default")
    policy_rep = build_policy_report(goal, profile=profile)
    pok = bool(policy_rep["policy_ok"])
    print(f"Trust profile: {policy_rep['trust_profile']}")
    print(f"Policy validation: {'PASS' if pok else 'FAIL'}")
    print(f"Review required: {'yes' if policy_rep['review_required'] else 'no'}")
    if policy_rep["errors"]:
        print("Policy errors:")
        for e in policy_rep["errors"]:
            print(f"  - {e}")
    if policy_rep["warnings"]:
        print("Policy warnings:")
        for w in policy_rep["warnings"]:
            print(f"  - {w}")
    rl = str(policy_rep.get("risk_level", "low"))
    print(f"Risk level: {rl}")
    pr_reasons = list(policy_rep.get("reasons") or [])
    if pr_reasons:
        print("Why:")
        for line in pr_reasons:
            print(f"  - {line}")
    print()
    if pok:
        print("Result: PASS")
        print(_MSG_VALIDATE_HANDOFF_OK)
        return 0
    print("Result: FAIL")
    print(_MSG_VALIDATE_BLOCKED)
    return 1


def cmd_inspect(args: argparse.Namespace) -> int:
    path: Path = args.file
    if not path.is_file():
        print(f"torqa inspect: not a file: {path}", file=sys.stderr)
        return 1

    bundle, err, input_type = _load_input(path)
    if input_type == "unknown":
        print(f"torqa inspect: {err}", file=sys.stderr)
        return 1

    if err is not None:
        if isinstance(err, TQParseError):
            print(f"torqa inspect: .tq parse failed ({err.code})", file=sys.stderr)
            print(err, file=sys.stderr)
        else:
            print("torqa inspect: JSON load failed", file=sys.stderr)
            print(err, file=sys.stderr)
        return 1

    assert bundle is not None
    goal, gerr = _goal_from_bundle(bundle)
    if gerr is not None:
        print(f"torqa inspect: {gerr}", file=sys.stderr)
        return 1

    # Stderr only: metadata for humans. Stdout: JSON only (pipe-friendly).
    print(f"Input type: {input_type}", file=sys.stderr)
    print(f"File: {path.resolve()}", file=sys.stderr)
    print(
        "Stdout: full canonical ir_goal JSON — machine-readable artifact for tooling, review, and pipelines.",
        file=sys.stderr,
    )
    print(
        "Redirect or pipe as needed (e.g. jq); Torqa does not execute workflows.",
        file=sys.stderr,
    )
    out = ir_goal_to_json(goal)
    print(json.dumps(out, indent=2, ensure_ascii=False, sort_keys=True))
    return 0


def cmd_doctor(args: argparse.Namespace) -> int:
    path: Path = args.file
    if not path.is_file():
        print(f"torqa doctor: not a file: {path}", file=sys.stderr)
        return 1

    print("Torqa doctor")
    print()

    bundle, err, input_type = _load_input(path)
    if input_type == "unknown":
        print("Input")
        print(f"  Type: unknown")
        print(f"  Path: {path.resolve()}")
        print(f"  Error: {err}")
        print()
        print("Summary")
        print("  Status: FAIL (unsupported input type)")
        print("  Readiness: blocked — cannot assess handoff safety.")
        return 1

    print("Input")
    print(f"  Type: {input_type}")
    print(f"  Path: {path.resolve()}")
    print()

    if err is not None:
        print("Parse" if input_type == "tq" else "Load")
        if isinstance(err, TQParseError):
            print("  Status: FAIL")
            print(f"  Error: {err.code}")
            if err.line is not None:
                print(f"  Line: {err.line}")
            print(f"  Message: {err}")
        else:
            print("  Status: FAIL")
            print(f"  Error: {err}")
        print()
        print("Structure")
        print("  Status: (not reached)")
        print()
        print("Semantics")
        print("  Status: (not reached)")
        print()
        print("Summary")
        print("  Status: FAIL — fix load/parse, then re-run torqa validate.")
        print("  Readiness: blocked — spec stopped before structural checks.")
        return 1

    assert bundle is not None
    goal, gerr = _goal_from_bundle(bundle)
    if gerr is not None:
        print("Parse" if input_type == "tq" else "Load")
        print("  Status: OK")
        print()
        print("Structure")
        print("  Status: FAIL (IR payload)")
        print(f"  Error: {gerr}")
        print()
        print("Semantics")
        print("  Status: (not reached)")
        print()
        print("Summary")
        print("  Status: FAIL")
        print("  Readiness: blocked — invalid IR payload.")
        return 1

    load_word = "Parse" if input_type == "tq" else "Load"
    print(load_word)
    print("  Status: OK")
    print()

    struct = validate_ir(goal)
    print("Structure")
    if struct:
        print("  Status: FAIL (validate_ir)")
        for line in struct:
            print(f"  - {line}")
    else:
        print("  Status: PASS")
    print()

    report = build_ir_semantic_report(goal, default_ir_function_registry())
    sem_ok = bool(report.get("semantic_ok"))
    logic_ok = bool(report.get("logic_ok"))

    print("Semantics")
    print(f"  Semantic validation: {'PASS' if sem_ok else 'FAIL'}")
    print(f"  Logic validation: {'PASS' if logic_ok else 'FAIL'}")
    warns = list(report.get("warnings") or [])
    errs = list(report.get("errors") or [])
    if errs:
        print("  Errors:")
        for e in errs:
            print(f"    - {e}")
    if warns:
        print("  Warnings:")
        for w in warns:
            print(f"    - {w}")
    print()

    if struct or not sem_ok or not logic_ok:
        print("Policy")
        print("  Status: (not reached)")
        print()
        print("Summary")
        print("  Status: FAIL — see Structure and Semantics above.")
        print("  Readiness: blocked — not safe for handoff until resolved.")
        return 1

    profile = getattr(args, "profile", "default")
    policy_rep = build_policy_report(goal, profile=profile)
    pok = bool(policy_rep["policy_ok"])
    print("Policy")
    print(f"  Trust profile: {policy_rep['trust_profile']}")
    print(f"  Policy validation: {'PASS' if pok else 'FAIL'}")
    print(f"  Review required: {'yes' if policy_rep['review_required'] else 'no'}")
    if policy_rep["errors"]:
        print("  Errors:")
        for e in policy_rep["errors"]:
            print(f"    - {e}")
    if policy_rep["warnings"]:
        print("  Warnings:")
        for w in policy_rep["warnings"]:
            print(f"    - {w}")
    print(f"  Risk level: {policy_rep.get('risk_level', 'low')}")
    pr_reasons = list(policy_rep.get("reasons") or [])
    if pr_reasons:
        print("  Why:")
        for line in pr_reasons:
            print(f"    - {line}")
    print()

    print("Summary")
    if not pok:
        print("  Status: FAIL — policy checks failed.")
        print("  Readiness: blocked — not safe for handoff until resolved.")
        return 1
    print("  Status: PASS (default effect registry + policy + profile)")
    print(
        "  Trust: handoff-ready under structural, semantic, and policy checks — "
        "Torqa validates only; it does not execute workflows."
    )
    return 0


def cmd_version(_args: argparse.Namespace) -> int:
    try:
        v = pkg_version("torqa")
    except Exception:
        v = "unknown"
    print(f"torqa {v} · canonical IR {CANONICAL_IR_VERSION}")
    return 0


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="torqa",
        description=(
            "Torqa: load .tq or bundle JSON, validate IR, print diagnostics. "
            "This is not a runtime; it does not execute workflows."
        ),
    )
    sub = p.add_subparsers(dest="command", required=True)

    file_help = "Path to a .tq file or a .json bundle / ir_goal file"

    pv = sub.add_parser(
        "validate",
        help="Validate a .tq or JSON file (structural + semantic + policy + risk)",
        description=(
            "Exit 0 only if load succeeds, validate_ir passes, semantic_ok is true, and built-in policy checks pass. "
            "Prints deterministic risk level and reasons (heuristics, not ML). "
            "On success, reports that the artifact is ready for external handoff (nothing is executed here)."
        ),
    )
    pv.add_argument("file", type=Path, metavar="FILE", help=file_help)
    pv.add_argument(
        "--profile",
        default="default",
        choices=["default", "strict", "review-heavy"],
        metavar="PROFILE",
        help="Built-in trust profile for policy and risk evaluation (default: default).",
    )
    pv.set_defaults(func=cmd_validate)

    pi = sub.add_parser(
        "inspect",
        help="Print canonical IR JSON from a .tq or JSON file",
        description=(
            "Pretty-print the ir_goal envelope after load and normalization. "
            "Stdout is JSON only for pipelines; stderr explains context (no execution)."
        ),
    )
    pi.add_argument("file", type=Path, metavar="FILE", help=file_help)
    pi.set_defaults(func=cmd_inspect)

    pd = sub.add_parser(
        "doctor",
        help="Human-friendly diagnostics for a .tq or JSON file",
        description=(
            "Summarize load, structural, semantic, policy, and deterministic risk output, "
            "and handoff readiness (validation only)."
        ),
    )
    pd.add_argument("file", type=Path, metavar="FILE", help=file_help)
    pd.add_argument(
        "--profile",
        default="default",
        choices=["default", "strict", "review-heavy"],
        metavar="PROFILE",
        help="Built-in trust profile for policy and risk evaluation (default: default).",
    )
    pd.set_defaults(func=cmd_doctor)

    pver = sub.add_parser("version", help="Show torqa package and IR versions")
    pver.set_defaults(func=cmd_version)

    return p


def main(argv: Optional[List[str]] = None) -> int:
    argv = argv if argv is not None else sys.argv[1:]
    parser = _build_parser()
    args = parser.parse_args(argv)
    return int(args.func(args))


if __name__ == "__main__":
    sys.exit(main())
