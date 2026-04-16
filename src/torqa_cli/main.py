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
from src.semantics.ir_semantics import build_ir_semantic_report, default_ir_function_registry
from src.surface.parse_tq import TQParseError, parse_tq_source
from src.torqa_cli.bundle_load import load_bundle_from_json_path

try:
    from importlib.metadata import version as pkg_version
except ImportError:  # pragma: no cover
    from importlib_metadata import version as pkg_version  # type: ignore

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


def cmd_validate(args: argparse.Namespace) -> int:
    path: Path = args.file
    if not path.is_file():
        print(f"torqa validate: not a file: {path}", file=sys.stderr)
        return 1

    bundle, err, input_type = _load_input(path)
    if input_type == "unknown":
        print(f"torqa validate: {err}", file=sys.stderr)
        return 1

    print(f"Input type: {input_type}")
    print(f"  file: {path}")

    if err is not None:
        if isinstance(err, TQParseError):
            print("Structural: .tq parse failed", file=sys.stderr)
            print(f"  code:    {err.code}", file=sys.stderr)
            if err.line is not None:
                print(f"  line:    {err.line}", file=sys.stderr)
            print(f"  message: {err}", file=sys.stderr)
        elif input_type == "json":
            print("Structural: JSON load failed", file=sys.stderr)
            print(f"  {err}", file=sys.stderr)
        else:
            print("Structural: input failed", file=sys.stderr)
            print(f"  {err}", file=sys.stderr)
        return 1

    assert bundle is not None
    goal, gerr = _goal_from_bundle(bundle)
    if gerr is not None:
        print(f"Structural: {gerr}", file=sys.stderr)
        return 1

    struct = validate_ir(goal)
    if struct:
        print("Structural validation: FAILED (validate_ir)")
        for line in struct:
            print(f"  - {line}")
        return 1

    reg = default_ir_function_registry()
    report = build_ir_semantic_report(goal, reg)
    sem_ok = bool(report.get("semantic_ok"))
    logic_ok = bool(report.get("logic_ok"))

    load_label = "parse" if input_type == "tq" else "load"
    print(f"  {load_label}:          OK")
    print("Torqa validation")
    print("  structural:     OK")
    print(f"  semantic_ok:    {sem_ok}")
    print(f"  logic_ok:       {logic_ok}")

    errs: List[str] = list(report.get("errors") or [])
    warns: List[str] = list(report.get("warnings") or [])
    if errs:
        print("  semantic errors:")
        for e in errs:
            print(f"    - {e}")
    if warns:
        print("  warnings:")
        for w in warns:
            print(f"    - {w}")

    if sem_ok and logic_ok:
        print("Result: PASS")
        return 0
    print("Result: FAIL (semantic or logic errors)", file=sys.stderr)
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

    # Keep stdout as JSON-only for piping (e.g. jq); input kind on stderr.
    print(f"Input type: {input_type}", file=sys.stderr)
    out = ir_goal_to_json(goal)
    print(json.dumps(out, indent=2, ensure_ascii=False, sort_keys=True))
    return 0


def cmd_doctor(args: argparse.Namespace) -> int:
    path: Path = args.file
    if not path.is_file():
        print(f"torqa doctor: not a file: {path}", file=sys.stderr)
        return 1

    print(f"Torqa doctor — {path.resolve()}")
    print("-" * 60)

    bundle, err, input_type = _load_input(path)
    if input_type == "unknown":
        print(f"• Input type:   unknown")
        print(f"  {err}")
        return 1

    print(f"• Input type:   {input_type}")

    if err is not None:
        if isinstance(err, TQParseError):
            print("• Source load:  FAILED (.tq parse)")
            print(f"  Error code:   {err.code}")
            if err.line is not None:
                print(f"  Line:         {err.line}")
            print(f"  Details:      {err}")
        else:
            print("• Source load:  FAILED (JSON)")
            print(f"  Details:      {err}")
        print()
        print("Fix the error above, then re-run torqa validate.")
        return 1

    assert bundle is not None
    goal, gerr = _goal_from_bundle(bundle)
    if gerr is not None:
        print("• Source load:  FAILED (ir_goal)")
        print(f"  {gerr}")
        return 1

    load_ok = "Parse:        OK" if input_type == "tq" else "Load:         OK"
    print(f"• {load_ok}")

    struct = validate_ir(goal)
    if struct:
        print("• Structural:   ISSUES")
        for line in struct:
            print(f"    - {line}")
    else:
        print("• Structural:   OK")

    report = build_ir_semantic_report(goal, default_ir_function_registry())
    sem_ok = bool(report.get("semantic_ok"))
    logic_ok = bool(report.get("logic_ok"))

    if sem_ok and logic_ok:
        print("• Semantic:     OK (default effect registry)")
    else:
        print("• Semantic:     NEEDS ATTENTION")

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

    print("-" * 60)
    if struct or not sem_ok or not logic_ok:
        print("Summary: not fully healthy — see above.")
        return 1
    print("Summary: looks good for the default registry.")
    return 0


def cmd_version(_args: argparse.Namespace) -> int:
    try:
        v = pkg_version("torqa")
    except Exception:
        v = "unknown"
    print(f"torqa {v}")
    print(f"canonical IR version: {CANONICAL_IR_VERSION}")
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
        help="Validate a .tq or JSON file (structural + semantic)",
        description="Exit 0 only if load succeeds, validate_ir passes, and semantic_ok is true.",
    )
    pv.add_argument("file", type=Path, metavar="FILE", help=file_help)
    pv.set_defaults(func=cmd_validate)

    pi = sub.add_parser(
        "inspect",
        help="Print canonical IR JSON from a .tq or JSON file",
        description="Pretty-print the ir_goal envelope after load and normalization.",
    )
    pi.add_argument("file", type=Path, metavar="FILE", help=file_help)
    pi.set_defaults(func=cmd_inspect)

    pd = sub.add_parser(
        "doctor",
        help="Human-friendly diagnostics for a .tq or JSON file",
        description="Summarize load, structural, and semantic health.",
    )
    pd.add_argument("file", type=Path, metavar="FILE", help=file_help)
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
