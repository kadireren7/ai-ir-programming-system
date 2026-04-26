"""
``torqa compare`` — same spec evaluated under each built-in trust profile (tabular output).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Sequence, Tuple

from rich import box
from rich.console import Console
from rich.table import Table

from torqa.ir.canonical_ir import IRGoal, validate_ir
from torqa.policy import build_policy_report
from torqa.semantics.ir_semantics import build_ir_semantic_report, default_ir_function_registry
from torqa.surface.parse_tq import TQParseError
from torqa.cli.check_cmd import DECISION_BLOCKED, _decision_from_policy_rep
from torqa.cli.cli_printers import cli_json, cli_no_color, cli_quiet, print_banner
from torqa.cli.io import goal_from_bundle, load_input
from torqa.cli.suggestions import top_reason_from_policy_reasons

BUILTIN_PROFILES: Sequence[str] = ("default", "strict", "review-heavy", "enterprise")


def _truncate(s: str, max_len: int = 72) -> str:
    t = s.replace("\n", " ").strip()
    if len(t) <= max_len:
        return t
    return t[: max_len - 3] + "..."


def _notes_for_policy(policy_rep: Dict[str, Any]) -> str:
    if not bool(policy_rep.get("policy_ok")):
        errs: List[str] = list(policy_rep.get("errors") or [])
        return _truncate(errs[0] if errs else "Policy validation failed")
    reasons = list(policy_rep.get("reasons") or [])
    return _truncate(top_reason_from_policy_reasons(reasons))


def _row_early_block(note: str) -> Tuple[str, str, str, str, str]:
    return ("BLOCKED", "n/a", "n/a", _truncate(note))


def _print_comparison_table_ascii(rows: List[Tuple[str, str, str, str, str]]) -> None:
    """Fixed-width table for CI / non-TTY (stable for tests)."""
    headers = ("Profile", "Decision", "Risk", "Review", "Notes")
    widths = (14, 18, 8, 8, 50)
    line = (
        f"{headers[0]:<{widths[0]}} | {headers[1]:<{widths[1]}} | {headers[2]:<{widths[2]}} | "
        f"{headers[3]:<{widths[3]}} | {headers[4]}"
    )
    print(line)
    print("-" * min(120, len(line) + 10))
    for profile, decision, risk, review, notes in rows:
        r_rev = review if len(review) <= widths[3] else review[: widths[3] - 1] + "."
        print(
            f"{profile:<{widths[0]}} | {decision:<{widths[1]}} | {risk:<{widths[2]}} | "
            f"{r_rev:<{widths[3]}} | {notes}"
        )


def cmd_compare(args: Any) -> int:
    path: Path = args.file
    json_mode = cli_json(args)

    if not path.is_file():
        if json_mode:
            print(json.dumps({"schema": "torqa.cli.compare.v1", "ok": False, "error": "not a file", "path": str(path)}))
        else:
            print(f"torqa compare: not a file: {path}", file=sys.stderr)
        return 1

    bundle, err, input_type = load_input(path)
    rows: List[Tuple[str, str, str, str, str]] = []
    exit_code = 0

    if input_type == "unknown":
        note = str(err)
        rows = [(p,) + _row_early_block(note) for p in BUILTIN_PROFILES]
        exit_code = 1
    elif err is not None:
        if isinstance(err, TQParseError):
            note = f"{err.code}: {err}"
        else:
            note = str(err)
        rows = [(p,) + _row_early_block(note) for p in BUILTIN_PROFILES]
        exit_code = 1
    elif input_type == "json_batch":
        note = (
            f"{path.resolve().name}: JSON root is an array (batch); torqa compare evaluates one spec — "
            "use a single-bundle JSON file."
        )
        rows = [(p,) + _row_early_block(note) for p in BUILTIN_PROFILES]
        exit_code = 1
    else:
        assert bundle is not None
        goal, gerr = goal_from_bundle(bundle)
        if gerr is not None:
            rows = [(p,) + _row_early_block(str(gerr)) for p in BUILTIN_PROFILES]
            exit_code = 1
        else:
            assert isinstance(goal, IRGoal)
            struct = validate_ir(goal)
            if struct:
                top = struct[0] if struct else "Structural validation failed"
                rows = [(p,) + _row_early_block(top) for p in BUILTIN_PROFILES]
                exit_code = 1
            else:
                reg = default_ir_function_registry()
                report = build_ir_semantic_report(goal, reg)
                sem_ok = bool(report.get("semantic_ok"))
                logic_ok = bool(report.get("logic_ok"))
                errs: List[str] = list(report.get("errors") or [])

                if not sem_ok or not logic_ok:
                    top = errs[0] if errs else "Semantic or logic validation failed"
                    rows = [(p,) + _row_early_block(top) for p in BUILTIN_PROFILES]
                    exit_code = 1
                else:
                    out_rows: List[Tuple[str, str, str, str, str]] = []
                    for pid in BUILTIN_PROFILES:
                        policy_rep = build_policy_report(goal, profile=pid)
                        pok = bool(policy_rep["policy_ok"])
                        risk = str(policy_rep.get("risk_level", "low"))
                        rev = bool(policy_rep.get("review_required"))
                        rev_s = "yes" if rev else "no"
                        if not pok:
                            decision = DECISION_BLOCKED
                            notes = _notes_for_policy(policy_rep)
                        else:
                            decision, _, _ = _decision_from_policy_rep(policy_rep)
                            notes = _notes_for_policy(policy_rep)
                        out_rows.append((pid, decision, risk, rev_s, notes))
                    rows = out_rows

    if json_mode:
        print(
            json.dumps(
                {
                    "schema": "torqa.cli.compare.v1",
                    "ok": exit_code == 0,
                    "path": str(path.resolve()),
                    "profiles": [
                        {
                            "profile": prof,
                            "decision": dec,
                            "risk": risk,
                            "review_required": rev,
                            "notes": notes,
                        }
                        for prof, dec, risk, rev, notes in rows
                    ],
                },
                indent=2,
                ensure_ascii=False,
            )
        )
        return exit_code

    if not cli_quiet(args):
        print_banner("torqa compare", str(path.resolve()), args=args)

    use_rich = sys.stdout.isatty() and not cli_no_color(args)
    if use_rich:
        c = Console(
            file=sys.stdout,
            highlight=False,
            soft_wrap=True,
            no_color=False,
            force_terminal=True,
        )
        c.print("[dim]Same structural + semantic pass; policy evaluated per profile.[/]\n")

        table = Table(box=box.ROUNDED, header_style="bold", title="Profile comparison")
        table.add_column("Profile", style="cyan", no_wrap=True)
        table.add_column("Decision", max_width=22, overflow="ellipsis")
        table.add_column("Risk", justify="center")
        table.add_column("Review", justify="center")
        table.add_column("Notes", max_width=52, overflow="ellipsis")

        for profile, decision, risk, review, notes in rows:
            if decision == DECISION_BLOCKED:
                dcell = f"[red]{decision}[/]"
            elif "REVIEW" in decision:
                dcell = f"[yellow]{decision}[/]"
            else:
                dcell = f"[green]{decision}[/]"
            table.add_row(profile, dcell, risk, review, notes)

        c.print(table)
        if exit_code == 0:
            c.print("\n[dim]Tip:[/] use [bold]torqa explain[/] for a narrative handoff summary under one profile.")
        else:
            c.print("\n[bold red]Blocked before profile differences matter.[/] [dim]Fix load / IR / semantics, then re-run.[/]")
    else:
        print(f"Torqa profile comparison for {path.resolve()}\n")
        _print_comparison_table_ascii(rows)
    return exit_code
