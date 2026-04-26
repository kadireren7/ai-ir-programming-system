"""
``torqa scan`` — recursively evaluate ``.tq`` and ``.json`` specs under a path.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

from rich import box
from rich.console import Console
from rich.progress import BarColumn, Progress, SpinnerColumn, TaskProgressColumn, TextColumn
from rich.table import Table

from torqa.surface.parse_tq import TQParseError
from torqa.cli.check_cmd import (
    DECISION_BLOCKED,
    DECISION_REVIEW,
    DECISION_SAFE,
    TrustEvalResult,
    evaluate_trust_from_bundle,
)
from torqa.cli.cli_printers import cli_json, cli_no_color, cli_quiet, print_banner
from torqa.cli.fs_discovery import discover_spec_files, display_path_relative
from torqa.cli.io import bundle_jobs, load_input


def _collect_rows(
    files: List[Path],
    scan_root: Path,
    profile: str,
    fail_on_warning: bool,
    *,
    integration_source: str | None = None,
    progress: Any = None,
    task_id: Any = None,
) -> Tuple[int, int, int, int, bool, List[Dict[str, Any]]]:
    """Returns (n, safe, needs, blocked, warn_exit, json_rows)."""
    safe = needs = blocked = n = 0
    warn_exit = False
    json_rows: List[Dict[str, Any]] = []

    def _tick() -> None:
        if progress is not None and task_id is not None:
            progress.advance(task_id)

    for fp in files:
        rel = display_path_relative(scan_root, fp)
        if integration_source == "n8n" and fp.suffix.lower() != ".json":
            continue
        bundle, err, input_type = load_input(fp, integration_source=integration_source)
        if err is not None:
            n += 1
            blocked += 1
            reason = f"{err.code}: {err}" if isinstance(err, TQParseError) else str(err)
            ev = TrustEvalResult(DECISION_BLOCKED, "n/a", profile, reason)
            json_rows.append(
                {
                    "file": rel,
                    "suffix": "",
                    "decision": ev.decision,
                    "risk": ev.risk,
                    "trust_profile": ev.trust_profile,
                    "reason": ev.reason_summary,
                    "action": "Fix parse/load error, then run: torqa validate " + repr(str(fp.resolve())),
                }
            )
            _tick()
            continue
        assert bundle is not None
        for suffix, one_bundle in bundle_jobs(fp, bundle, input_type):
            n += 1
            ev = evaluate_trust_from_bundle(one_bundle, profile=profile)
            if fail_on_warning and ev.has_warnings:
                warn_exit = True
            if ev.decision == DECISION_SAFE:
                safe += 1
            elif ev.decision == DECISION_REVIEW:
                needs += 1
            else:
                blocked += 1
            rel_disp = f"{rel}{suffix}" if suffix else rel
            action = "OK for handoff under this profile"
            if ev.decision == DECISION_BLOCKED:
                action = f"Run: torqa validate {fp.resolve()}{suffix or ''}"
            elif ev.decision == DECISION_REVIEW:
                action = "Review metadata and risk tier before production handoff"
            row: Dict[str, Any] = {
                "file": rel_disp,
                "decision": ev.decision,
                "risk": ev.risk,
                "trust_profile": ev.trust_profile,
                "reason": ev.reason_summary,
                "action": action,
            }
            if input_type == "n8n" and isinstance(one_bundle.get("ir_goal"), dict):
                ig = one_bundle["ir_goal"]
                md = ig.get("metadata") if isinstance(ig.get("metadata"), dict) else {}
                integ = md.get("integration") if isinstance(md.get("integration"), dict) else None
                if integ:
                    row["integration"] = {
                        "adapter": integ.get("adapter"),
                        "findings": integ.get("findings"),
                        "transition_to_node": integ.get("transition_to_node"),
                    }
            json_rows.append(row)
            _tick()
    return n, safe, needs, blocked, warn_exit, json_rows


def cmd_scan(args: Any) -> int:
    path: Path = args.path
    profile = getattr(args, "profile", None) or "default"
    fail_on_warning = bool(getattr(args, "fail_on_warning", False))
    integration_source = getattr(args, "source", None) or None
    json_mode = cli_json(args)
    quiet = cli_quiet(args)

    if not path.exists():
        if json_mode:
            print(
                json.dumps(
                    {"schema": "torqa.cli.scan.v1", "ok": False, "error": "not found", "path": str(path)},
                    indent=2,
                )
            )
        else:
            print(f"torqa scan: not found: {path}", file=sys.stderr)
        return 1

    if path.is_file():
        if path.suffix.lower() not in (".tq", ".json"):
            if json_mode:
                print(
                    json.dumps(
                        {
                            "schema": "torqa.cli.scan.v1",
                            "ok": False,
                            "error": "expected .tq or .json",
                            "path": str(path),
                        },
                        indent=2,
                    )
                )
            else:
                print(
                    f"torqa scan: expected a directory or a .tq/.json file, got {path.suffix!r}",
                    file=sys.stderr,
                )
            return 1
        files = [path.resolve()]
        scan_root = path.parent.resolve()
    else:
        scan_root = path.resolve()
        suf = (".json",) if integration_source == "n8n" else None
        files = discover_spec_files(path, suffixes=suf)

    if not json_mode and not quiet:
        print_banner("torqa scan", f"{path.resolve()} · profile {profile}", args=args)

    use_progress = (
        not json_mode
        and not quiet
        and len(files) >= 3
        and sys.stdout.isatty()
        and not cli_no_color(args)
    )
    if use_progress:
        c_prog = Console(file=sys.stdout, no_color=False, force_terminal=True)
        job_count = 0
        for fp in files:
            b, e, it = load_input(fp, integration_source=integration_source)
            if e is not None:
                job_count += 1
            else:
                assert b is not None
                job_count += len(bundle_jobs(fp, b, it))
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TaskProgressColumn(),
            console=c_prog,
            transient=True,
        ) as progress:
            tid = progress.add_task("[cyan]Evaluating specs…[/]", total=max(job_count, 1))
            n, safe, needs, blocked, warn_exit, json_rows = _collect_rows(
                files,
                scan_root,
                profile,
                fail_on_warning,
                integration_source=integration_source,
                progress=progress,
                task_id=tid,
            )
    else:
        n, safe, needs, blocked, warn_exit, json_rows = _collect_rows(
            files, scan_root, profile, fail_on_warning, integration_source=integration_source
        )

    if json_mode:
        print(
            json.dumps(
                {
                    "schema": "torqa.cli.scan.v1",
                    "ok": blocked == 0 and not (fail_on_warning and warn_exit),
                    "path": str(path.resolve()),
                    "profile": profile,
                    "summary": {
                        "total_files": n,
                        "safe": safe,
                        "needs_review": needs,
                        "blocked": blocked,
                    },
                    "rows": json_rows,
                },
                indent=2,
                ensure_ascii=False,
            )
        )
    else:
        c = Console(
            file=sys.stdout,
            highlight=False,
            soft_wrap=True,
            no_color=cli_no_color(args),
            force_terminal=sys.stdout.isatty() and not cli_no_color(args),
        )
        c.print(f"[dim]Trust profile:[/] [bold]{profile}[/]\n")

        table = Table(title="Trust outcomes", box=box.ROUNDED, show_lines=False, header_style="bold")
        table.add_column("File", max_width=46, overflow="ellipsis")
        table.add_column("Decision", justify="left")
        table.add_column("Risk", justify="center")
        table.add_column("Profile", overflow="ellipsis")

        for row in json_rows:
            disp = row["file"]
            disp = disp if len(disp) <= 46 else disp[:43] + "..."
            d = row["decision"]
            if d == DECISION_SAFE:
                dec_style = f"[green]{d}[/]"
            elif d == DECISION_REVIEW:
                dec_style = f"[yellow]{d}[/]"
            else:
                dec_style = f"[red]{d}[/]"
            table.add_row(disp, dec_style, row["risk"], row["trust_profile"])

        c.print(table)
        c.print()

        if blocked > 0:
            c.print("[bold red]Summary — action required[/]")
        elif needs > 0:
            c.print("[bold yellow]Summary — review suggested[/]")
        else:
            c.print("[bold green]Summary — all clear[/]")
        # Plain lines for scripts / tests (substring match)
        print(f"Total files: {n}")
        print(f"Safe: {safe}")
        print(f"Needs review: {needs}")
        print(f"Blocked: {blocked}")

    if blocked > 0:
        return 1
    if fail_on_warning and warn_exit:
        if not json_mode:
            print(
                "torqa scan: semantic or policy warnings present (fail-on-warning); exiting with status 1.",
                file=sys.stderr,
            )
        return 1
    return 0
