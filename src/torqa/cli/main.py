"""
``torqa`` CLI — load .tq or bundle JSON, validate IR, print diagnostics. No execution engine.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import List, Optional

from torqa.ir.canonical_ir import CANONICAL_IR_VERSION, ir_goal_to_json, validate_ir
from torqa.policy import build_policy_report
from torqa.semantics.ir_semantics import build_ir_semantic_report, default_ir_function_registry
from torqa.surface.parse_tq import TQParseError
from torqa.cli.check_cmd import cmd_check
from torqa.cli.explain_cmd import cmd_explain
from torqa.cli.compare_cmd import cmd_compare
from torqa.cli.scan_cmd import cmd_scan
from torqa.cli.report_cmd import cmd_report
from torqa.cli.init_cmd import cmd_init
from torqa.cli.import_cmd import cmd_import_n8n
from torqa.cli.project_config import (
    TorqaConfigError,
    TorqaProjectConfig,
    load_torqa_project_config,
)
from torqa.cli.readiness import format_readiness_line, readiness_score_100
from torqa.cli.io import goal_from_bundle, load_input
from torqa.cli.validate_cmd import cmd_validate
from torqa.cli.cli_printers import (
    TORQA_EPILOG,
    compare_command_epilog,
    explain_command_epilog,
    init_command_epilog,
    report_command_epilog,
    scan_command_epilog,
    validate_command_epilog,
    add_output_flags,
    print_trust_scoring_block,
)
from torqa.cli.suggestions import (
    suggestion_for_ir_payload,
    suggestion_for_load_error,
    suggestion_for_parse_code,
    suggestion_for_policy_line,
    suggestion_for_semantic_line,
    suggestion_for_structural_line,
    suggestion_for_policy_warning,
)

from importlib.metadata import version as pkg_version


def _add_integration_source(p: argparse.ArgumentParser) -> None:
    p.add_argument(
        "--source",
        dest="source",
        choices=["n8n"],
        default=None,
        help="For .json: treat file as exported n8n workflow and map to Torqa IR (adapter). Ignored for .tq.",
    )


def _add_fail_on_warning_group(p: argparse.ArgumentParser) -> None:
    g = p.add_mutually_exclusive_group()
    g.add_argument(
        "--fail-on-warning",
        action="store_const",
        dest="fail_on_warning",
        const=True,
        default=argparse.SUPPRESS,
        help="Treat semantic and policy warnings as failure (exit 1). Overrides torqa.toml when set.",
    )
    g.add_argument(
        "--no-fail-on-warning",
        action="store_const",
        dest="fail_on_warning",
        const=False,
        default=argparse.SUPPRESS,
        help="Do not fail solely on warnings (default). Overrides torqa.toml when set.",
    )


def _config_anchor_dir(args: argparse.Namespace) -> Path:
    """Directory to start searching upward for ``torqa.toml``."""
    f = getattr(args, "file", None)
    if isinstance(f, Path):
        return f.expanduser().resolve().parent
    p = getattr(args, "path", None)
    if isinstance(p, Path):
        rp = p.expanduser().resolve()
        if rp.is_file():
            return rp.parent
        return rp
    return Path.cwd()


def _apply_torqa_project_config(args: argparse.Namespace, cfg: TorqaProjectConfig) -> None:
    """Merge optional ``torqa.toml`` defaults; explicit CLI flags win (see argparse.SUPPRESS)."""
    if not hasattr(args, "profile"):
        args.profile = cfg.profile
    if not hasattr(args, "fail_on_warning"):
        args.fail_on_warning = cfg.fail_on_warning
    if not hasattr(args, "report_format"):
        args.report_format = cfg.report_format


def cmd_inspect(args: argparse.Namespace) -> int:
    path: Path = args.file
    if not path.is_file():
        print(f"torqa inspect: not a file: {path}", file=sys.stderr)
        return 1

    integration_source = getattr(args, "source", None) or None
    bundle, err, input_type = load_input(path, integration_source=integration_source)
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
    if input_type == "json_batch":
        print(
            "torqa inspect: JSON file root is an array (batch). inspect prints one canonical ir_goal on stdout; "
            "split into one bundle per file or use torqa validate for batch checks.",
            file=sys.stderr,
        )
        return 1

    goal, gerr = goal_from_bundle(bundle)
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

    integration_source = getattr(args, "source", None) or None
    bundle, err, input_type = load_input(path, integration_source=integration_source)
    if input_type == "unknown":
        print("Input")
        print("  Type: unknown")
        print(f"  Path: {path.resolve()}")
        print(f"  Error: {err}")
        print()
        print("Summary")
        print("  Status: FAIL (unsupported input type)")
        print(f"  {format_readiness_line(readiness_score_100(load_ok=False, goal_ok=False, structural_ok=False, semantic_ok=False, policy_evaluated=False, policy_ok=False))}")
        print("  Readiness: blocked — cannot assess handoff safety.")
        return 1

    if input_type == "json_batch":
        print(
            "torqa doctor: JSON root array (batch) is not supported here; run `torqa validate FILE.json` for batch output, "
            "or split into one bundle per file.",
            file=sys.stderr,
        )
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
            print(f"  Suggested fix: {suggestion_for_parse_code(err.code)}")
        else:
            print("  Status: FAIL")
            print(f"  Error: {err}")
            print(f"  Suggested fix: {suggestion_for_load_error(str(err))}")
        print()
        print("Structure")
        print("  Status: (not reached)")
        print()
        print("Semantics")
        print("  Status: (not reached)")
        print()
        print("Summary")
        print("  Status: FAIL — fix load/parse, then re-run torqa validate.")
        print(f"  {format_readiness_line(readiness_score_100(load_ok=False, goal_ok=False, structural_ok=False, semantic_ok=False, policy_evaluated=False, policy_ok=False))}")
        print("  Readiness: blocked — spec stopped before structural checks.")
        return 1

    assert bundle is not None
    goal, gerr = goal_from_bundle(bundle)
    if gerr is not None:
        print("Parse" if input_type == "tq" else "Load")
        print("  Status: OK")
        print()
        print("Structure")
        print("  Status: FAIL (IR payload)")
        print(f"  Error: {gerr}")
        print(f"  Suggested fix: {suggestion_for_ir_payload(str(gerr))}")
        print()
        print("Semantics")
        print("  Status: (not reached)")
        print()
        print("Summary")
        print("  Status: FAIL")
        print(f"  {format_readiness_line(readiness_score_100(load_ok=True, goal_ok=False, structural_ok=False, semantic_ok=False, policy_evaluated=False, policy_ok=False))}")
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
            print(f"    Suggested fix: {suggestion_for_structural_line(line)}")
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
            print(f"      Suggested fix: {suggestion_for_semantic_line(e)}")
    if warns:
        print("  Warnings:")
        for w in warns:
            print(f"    - {w}")
            print(f"      Suggested fix: {suggestion_for_semantic_line(w)}")
    print()

    if struct or not sem_ok or not logic_ok:
        print("Policy")
        print("  Status: (not reached)")
        print()
        if struct:
            rs = readiness_score_100(
                load_ok=True,
                goal_ok=True,
                structural_ok=False,
                semantic_ok=False,
                policy_evaluated=False,
                policy_ok=False,
            )
        else:
            rs = readiness_score_100(
                load_ok=True,
                goal_ok=True,
                structural_ok=True,
                semantic_ok=False,
                policy_evaluated=False,
                policy_ok=False,
            )
        print("Summary")
        print("  Status: FAIL — see Structure and Semantics above.")
        print(f"  {format_readiness_line(rs)}")
        print("  Readiness: blocked — not safe for handoff until resolved.")
        return 1

    profile = getattr(args, "profile", None) or "default"
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
            print(f"      Suggested fix: {suggestion_for_policy_line(e)}")
    if policy_rep["warnings"]:
        print("  Warnings:")
        for w in policy_rep["warnings"]:
            print(f"    - {w}")
            print(f"      Suggested fix: {suggestion_for_policy_warning(w)}")
    print(f"  Risk level: {policy_rep.get('risk_level', 'low')}")
    pr_reasons = list(policy_rep.get("reasons") or [])
    if pr_reasons:
        print("  Why:")
        for line in pr_reasons:
            print(f"    - {line}")
    print_trust_scoring_block(policy_rep)
    print()

    print("Summary")
    if not pok:
        print("  Status: FAIL — policy checks failed.")
        print(
            f"  {format_readiness_line(readiness_score_100(load_ok=True, goal_ok=True, structural_ok=True, semantic_ok=True, policy_evaluated=True, policy_ok=False))}"
        )
        print("  Readiness: blocked — not safe for handoff until resolved.")
        return 1
    rs = readiness_score_100(
        load_ok=True,
        goal_ok=True,
        structural_ok=True,
        semantic_ok=True,
        policy_evaluated=True,
        policy_ok=True,
        risk_level=str(policy_rep.get("risk_level", "low")),
        review_required=bool(policy_rep.get("review_required")),
    )
    print("  Status: PASS (default effect registry + policy + profile)")
    print(f"  {format_readiness_line(rs)}")
    print(
        "  Trust: handoff-ready under structural, semantic, and policy checks — "
        "Torqa validates only; it does not execute workflows."
    )
    if getattr(args, "fail_on_warning", False):
        sem_w = list(report.get("warnings") or [])
        pol_w = list(policy_rep.get("warnings") or [])
        if sem_w or pol_w:
            print(
                "torqa doctor: semantic or policy warnings present (fail-on-warning); exiting with status 1.",
                file=sys.stderr,
            )
            return 1
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
        formatter_class=argparse.RawDescriptionHelpFormatter,
        description=(
            "Torqa: load .tq or bundle JSON, validate IR, print diagnostics. "
            "This is not a runtime; it does not execute workflows."
        ),
        epilog=TORQA_EPILOG,
    )
    sub = p.add_subparsers(dest="command", required=True, metavar="COMMAND")

    file_help = "Path to a .tq file or .json (bundle, bare ir_goal, or JSON array of bundles for batch)"

    pv = sub.add_parser(
        "validate",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        help="Validate a .tq or JSON file (structural + semantic + policy + risk)",
        description=(
            "Exit 0 only if load succeeds, validate_ir passes, semantic_ok is true, and built-in policy checks pass. "
            "Prints deterministic risk level and reasons (heuristics, not ML). "
            "On success, reports that the artifact is ready for external handoff (nothing is executed here)."
        ),
        epilog=validate_command_epilog(),
    )
    pv.add_argument("file", type=Path, metavar="FILE", help=file_help)
    pv.add_argument(
        "--profile",
        default=argparse.SUPPRESS,
        choices=["default", "strict", "review-heavy", "enterprise"],
        metavar="PROFILE",
        help="Built-in trust profile for policy and risk evaluation (default: from torqa.toml or default).",
    )
    _add_fail_on_warning_group(pv)
    _add_integration_source(pv)
    add_output_flags(pv)
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
    _add_integration_source(pi)
    pi.set_defaults(func=cmd_inspect)

    pd = sub.add_parser(
        "doctor",
        help="Human-friendly diagnostics for a .tq or JSON file",
        description=(
            "Summarize load, structural, semantic, policy, and deterministic risk output, "
            "handoff readiness, and a Readiness score (0-100) in Summary (validation only)."
        ),
    )
    pd.add_argument("file", type=Path, metavar="FILE", help=file_help)
    pd.add_argument(
        "--profile",
        default=argparse.SUPPRESS,
        choices=["default", "strict", "review-heavy", "enterprise"],
        metavar="PROFILE",
        help="Built-in trust profile for policy and risk evaluation (default: from torqa.toml or default).",
    )
    _add_fail_on_warning_group(pd)
    _add_integration_source(pd)
    pd.set_defaults(func=cmd_doctor)

    pc = sub.add_parser(
        "check",
        help="Compact trust summary (same checks as validate)",
        description=(
            "Run parse/load, structural, semantic, policy, and risk evaluation; print a short "
            "Decision / Risk / Trust profile / Readiness score (0-100) / Top reason / Suggested fix / "
            "Suggested next step block. Exit 0 when the pipeline passes policy (same as validate); "
            "exit 1 when blocked earlier or policy fails."
        ),
    )
    pc.add_argument("file", type=Path, metavar="FILE", help=file_help)
    pc.add_argument(
        "--profile",
        default=argparse.SUPPRESS,
        choices=["default", "strict", "review-heavy", "enterprise"],
        metavar="PROFILE",
        help="Built-in trust profile for policy and risk evaluation (default: from torqa.toml or default).",
    )
    _add_fail_on_warning_group(pc)
    pc.set_defaults(func=cmd_check)

    pex = sub.add_parser(
        "explain",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        help="Plain-English explanation from deterministic trust signals (no AI)",
        description=(
            "After the same load → structural → semantic → policy path as validate, print four sections: "
            "what the spec describes in IR terms, why the risk tier is what it is, whether handoff is "
            "approved or blocked, and what to improve next. Wording is template-based from existing "
            "errors, reasons, and policy fields only."
        ),
        epilog=explain_command_epilog(),
    )
    pex.add_argument("file", type=Path, metavar="FILE", help=file_help)
    pex.add_argument(
        "--profile",
        default=argparse.SUPPRESS,
        choices=["default", "strict", "review-heavy", "enterprise"],
        metavar="PROFILE",
        help="Built-in trust profile for policy and risk evaluation (default: from torqa.toml or default).",
    )
    _add_fail_on_warning_group(pex)
    add_output_flags(pex)
    pex.set_defaults(func=cmd_explain)

    pcmp = sub.add_parser(
        "compare",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        help="Compare trust outcomes across default, strict, review-heavy, and enterprise profiles",
        description=(
            "Load the file once, run structural and semantic validation once, then evaluate "
            "build_policy_report for each built-in profile. Prints a fixed-width table: Profile, "
            "Decision, Risk, Review, Notes. Exit 1 if the file is missing or the spec cannot reach "
            "policy (parse/load/goal/struct/semantic failure); exit 0 when all profile rows are printed."
        ),
        epilog=compare_command_epilog(),
    )
    pcmp.add_argument("file", type=Path, metavar="FILE", help=file_help)
    add_output_flags(pcmp)
    pcmp.set_defaults(func=cmd_compare)

    pscan = sub.add_parser(
        "scan",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        help="Scan a directory for .tq and .json specs and summarize trust outcomes",
        description=(
            "Recursively find files ending in .tq or .json under PATH (or evaluate a single .tq/.json file). "
            "For each file, run the same trust gate as torqa check (default profile unless --profile). "
            "Prints a table (Decision, Risk, Profile result) and a summary count. Exit 1 if any file is BLOCKED."
        ),
        epilog=scan_command_epilog(),
    )
    pscan.add_argument(
        "path",
        type=Path,
        metavar="PATH",
        help="Directory to scan recursively, or a single .tq / .json file",
    )
    pscan.add_argument(
        "--profile",
        default=argparse.SUPPRESS,
        choices=["default", "strict", "review-heavy", "enterprise"],
        metavar="PROFILE",
        help="Built-in trust profile for policy and risk evaluation (default: from torqa.toml or default).",
    )
    _add_fail_on_warning_group(pscan)
    _add_integration_source(pscan)
    add_output_flags(pscan)
    pscan.set_defaults(func=cmd_scan)

    pimp = sub.add_parser(
        "import",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        help="Convert external workflow exports to Torqa bundle JSON",
        description=(
            "Source adapters (e.g. n8n) map vendor workflow JSON to the canonical Torqa bundle shape. "
            "The core IR validator is unchanged — output is suitable for `torqa validate` without --source."
        ),
    )
    imp_sub = pimp.add_subparsers(dest="import_command", required=True)
    p_n8n = imp_sub.add_parser(
        "n8n",
        help="Convert an exported n8n workflow JSON file to Torqa bundle JSON (ir_goal envelope)",
    )
    p_n8n.add_argument("file", type=Path, metavar="FILE", help="Exported n8n workflow (.json)")
    p_n8n.add_argument(
        "--out",
        type=Path,
        metavar="FILE",
        required=True,
        help="Output path for bundle JSON (e.g. workflow.bundle.json)",
    )
    p_n8n.set_defaults(func=cmd_import_n8n)

    prpt = sub.add_parser(
        "report",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        help="Write an HTML or Markdown trust report for a file or directory",
        description=(
            "Evaluate each .tq / .json spec (same gate as torqa check) and write a report file: "
            "html (standalone page with embedded CSS) or md (GitHub-friendly: summary, blocked files, "
            "recommendations, full table). Exit 1 if any file is BLOCKED."
        ),
        epilog=report_command_epilog(),
    )
    prpt.add_argument(
        "path",
        type=Path,
        metavar="PATH_OR_FILE",
        help="Directory to scan recursively, or a single .tq / .json file",
    )
    prpt.add_argument(
        "--format",
        dest="report_format",
        default=argparse.SUPPRESS,
        choices=["html", "md"],
        metavar="FMT",
        help="html = standalone .html; md = Markdown for PR comments / CI artifacts (default: from torqa.toml or html).",
    )
    prpt.add_argument(
        "-o",
        "--output",
        type=Path,
        metavar="FILE",
        default=None,
        help="Output path (defaults: torqa-report.html for --format html, torqa-report.md for --format md).",
    )
    prpt.add_argument(
        "--profile",
        default=argparse.SUPPRESS,
        choices=["default", "strict", "review-heavy", "enterprise"],
        metavar="PROFILE",
        help="Built-in trust profile for policy and risk evaluation (default: from torqa.toml or default).",
    )
    _add_fail_on_warning_group(prpt)
    add_output_flags(prpt)
    prpt.set_defaults(func=cmd_report)

    pinit = sub.add_parser(
        "init",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        help="Create a starter .tq file (interactive wizard or template + --output)",
        description=(
            "Interactive: run `torqa init` (TTY required) and follow prompts for template, flow name, owner, "
            "severity, and output path. Non-interactive: `torqa init TEMPLATE --output FILE` where TEMPLATE is "
            "login, approval, onboarding, or blank; optional `--flow`, `--owner`, `--severity`; `--force` overwrites."
        ),
        epilog=init_command_epilog(),
    )
    pinit.add_argument(
        "template",
        nargs="?",
        choices=["login", "approval", "onboarding", "blank"],
        metavar="TEMPLATE",
        help="Omit for interactive mode. Otherwise choose starter template.",
    )
    pinit.add_argument(
        "-o",
        "--output",
        type=Path,
        metavar="FILE",
        default=None,
        help="Output path for .tq (required with TEMPLATE).",
    )
    pinit.add_argument(
        "--flow",
        default=None,
        metavar="NAME",
        help="Snake_case intent name (default varies by template).",
    )
    pinit.add_argument(
        "--owner",
        default=None,
        metavar="LABEL",
        help="metadata owner label (default varies by template).",
    )
    pinit.add_argument(
        "--severity",
        default=None,
        choices=["low", "medium", "high"],
        metavar="LEVEL",
        help="metadata severity (default varies by template).",
    )
    pinit.add_argument(
        "--force",
        action="store_true",
        help="Overwrite the output file if it already exists.",
    )
    add_output_flags(pinit)
    pinit.set_defaults(func=cmd_init)

    pver = sub.add_parser("version", help="Show torqa package and IR versions")
    pver.set_defaults(func=cmd_version)

    return p


def main(argv: Optional[List[str]] = None) -> int:
    argv = argv if argv is not None else sys.argv[1:]
    parser = _build_parser()
    args = parser.parse_args(argv)
    try:
        cfg = load_torqa_project_config(_config_anchor_dir(args))
        _apply_torqa_project_config(args, cfg)
    except TorqaConfigError as ex:
        print(f"torqa: {ex}", file=sys.stderr)
        return 2
    return int(args.func(args))


if __name__ == "__main__":
    sys.exit(main())
