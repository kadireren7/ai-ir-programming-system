"""
CLI presentation helpers: shared epilogs, global-style flags, banners.

Human output uses Rich when stdout is a TTY (unless ``--no-color`` / ``NO_COLOR``).
Machine output uses ``--json`` (stable keys, no Rich markup).
"""

from __future__ import annotations

import os
import sys
from typing import Any

from rich.console import Console
from rich.panel import Panel

TORQA_EPILOG = """
Global tips:
  torqa COMMAND --help     Detailed help with examples for each command
  torqa validate FILE.tq   Full gate before CI or handoff
  torqa scan .             Repo-wide trust table

Output modes (where supported):
  --json                   Machine-readable summary on stdout (no colors)
  --no-color               Plain text / disable ANSI (also respects NO_COLOR=1)
  -q, --quiet              Skip decorative banners (human mode only)

Examples:
  torqa validate specs/login.tq
  torqa validate bundle.json --profile strict --json
  torqa scan ./workflows --profile review-heavy
  torqa report . --format md -o trust.md
""".strip()


def validate_command_epilog() -> str:
    return """
Examples:
  torqa validate flow.tq
  torqa validate ir.json --profile strict
  torqa validate batch.json --fail-on-warning
  torqa validate spec.tq --json | jq .ok

Exit codes:
  0   All bundles passed load, structure, semantics, and policy
  1   Any failure (parse, IR, semantics, policy, or warnings with --fail-on-warning)
""".strip()


def scan_command_epilog() -> str:
    return """
Examples:
  torqa scan .
  torqa scan ./policies --profile strict
  torqa scan one.tq --json

Exit 1 if any spec is BLOCKED (or warnings with --fail-on-warning).
""".strip()


def report_command_epilog() -> str:
    return """
Examples:
  torqa report . --format html -o dist/trust.html
  torqa report specs/ --format md -o TORQA.md
  torqa report flow.tq --json

Writes a standalone HTML or Markdown artifact for PRs and CI.
""".strip()


def compare_command_epilog() -> str:
    return """
Examples:
  torqa compare flow.tq
  torqa compare bundle.json --json

Runs policy once per built-in profile after a single structural+semantic pass.
Exit 1 if the file cannot reach policy (parse, IR, or semantics).
""".strip()


def explain_command_epilog() -> str:
    return """
Examples:
  torqa explain onboarding.tq
  torqa explain risky.json --profile strict --json

Four sections: IR summary, risk rationale, handoff verdict, next actions.
Templates only — no LLM calls.
""".strip()


def init_command_epilog() -> str:
    return """
Examples:
  torqa init
  torqa init login --output flows/login.tq
  torqa init approval --output a.tq --flow refund_approval --owner finance --severity high

Interactive mode needs a TTY; otherwise pass TEMPLATE and --output.
""".strip()


def add_output_flags(parser: Any) -> None:
    parser.add_argument(
        "--json",
        action="store_true",
        help="Emit a single JSON object on stdout (stable schema per command). Implies no banners.",
    )
    parser.add_argument(
        "--no-color",
        action="store_true",
        help="Disable ANSI colors and Rich styling hints.",
    )
    parser.add_argument(
        "-q",
        "--quiet",
        action="store_true",
        help="Skip decorative banners and titles (human output only).",
    )


def cli_json(args: Any) -> bool:
    return bool(getattr(args, "json", False))


def cli_quiet(args: Any) -> bool:
    return bool(getattr(args, "quiet", False))


def cli_no_color(args: Any) -> bool:
    if bool(getattr(args, "no_color", False)):
        return True
    if os.environ.get("NO_COLOR", "").strip():
        return True
    return False


def _stdout_console(args: Any) -> Console:
    return Console(
        file=sys.stdout,
        highlight=False,
        soft_wrap=True,
        no_color=cli_no_color(args),
        force_terminal=sys.stdout.isatty() and not cli_no_color(args),
    )


def print_trust_scoring_block(policy_rep: dict) -> None:
    """Human-readable trust score, confidence, decision, and top factors (stdout)."""
    if "trust_score" not in policy_rep:
        return
    ts = int(policy_rep["trust_score"])
    mx = int(policy_rep.get("trust_score_max", 100))
    conf = str(policy_rep.get("confidence", "medium")).capitalize()
    dec = str(policy_rep.get("trust_decision", "PASS"))
    floor = int(policy_rep.get("min_trust_score", 0))
    print(f"Trust score: {ts}/{mx} (profile minimum: {floor})")
    print(f"Confidence: {conf}")
    print(f"Trust decision: {dec}")
    factors = policy_rep.get("top_factors") or []
    if factors:
        print("Top factors:")
        for line in factors:
            print(f"  - {line}")
    rationale = policy_rep.get("score_rationale")
    if rationale:
        print(f"Why this score: {rationale}")
    print()


def print_banner(title: str, subtitle: str, *, args: Any) -> None:
    if cli_json(args) or cli_quiet(args):
        return
    c = _stdout_console(args)
    if sys.stdout.isatty() and not cli_no_color(args):
        c.print(Panel.fit(f"[bold]{title}[/]\n[dim]{subtitle}[/]", border_style="cyan"))
    else:
        c.print(f"{title}")
        if subtitle:
            c.print(subtitle)
