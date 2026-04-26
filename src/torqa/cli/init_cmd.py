"""
``torqa init`` — interactive or non-interactive starter ``.tq`` generator.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from rich.console import Console
from rich.panel import Panel

from torqa.surface.parse_tq import parse_tq_source
from torqa.surface.tq_errors import TQParseError
from torqa.cli.cli_printers import cli_no_color, cli_quiet

TEMPLATE_CHOICES = ("login", "approval", "onboarding", "blank")

# Defaults per template (non-interactive and interactive starting points).
_TEMPLATE_DEFAULTS: Dict[str, Dict[str, str]] = {
    "login": {"flow": "user_login", "owner": "my_team", "severity": "low"},
    "approval": {"flow": "approval_handoff", "owner": "compliance_team", "severity": "high"},
    "onboarding": {"flow": "onboarding_flow", "owner": "my_team", "severity": "low"},
    "blank": {"flow": "my_workflow", "owner": "my_team", "severity": "low"},
}

_SEVERITY_CHOICES = ("low", "medium", "high")


def sanitize_flow_name(raw: str) -> str:
    """Snake_case intent token: letters, digits, underscores only."""
    s = raw.strip().lower().replace("-", "_")
    s = re.sub(r"[^a-z0-9_]+", "_", s)
    s = re.sub(r"_+", "_", s).strip("_")
    if not s:
        return "my_workflow"
    if s[0].isdigit():
        s = "flow_" + s
    return s


def _render_tq(*, template: str, flow: str, owner: str, severity: str) -> str:
    owner_line = f"  owner {owner}"
    sev_line = f"  severity {severity}"
    if template == "login":
        body = f"""intent {flow}
requires username, password, ip_address
meta:
{owner_line}
{sev_line}
result Done
flow:
  create session
  emit login_success
"""
    elif template == "approval":
        body = f"""# Approval-style handoff (audit metadata). Same shipped flow steps as other tq_v1 cores.
intent {flow}
requires username, password, ip_address
meta:
{owner_line}
{sev_line}
result Done
flow:
  create session
  emit login_success
"""
    elif template == "onboarding":
        body = f"""intent {flow}
requires username, email, password, ip_address
meta:
{owner_line}
{sev_line}
result Done
flow:
  create session
  emit login_success
"""
    else:  # blank
        body = f"""# Starter workflow - edit intent, requires, and flow steps (tq_v1).
intent {flow}
requires username, password, ip_address
meta:
{owner_line}
{sev_line}
result Done
flow:
  create session
  emit login_success
"""
    return body


def _validate_generated(text: str, tq_path: Path) -> None:
    parse_tq_source(text, tq_path=tq_path)


def _prompt_line(prompt: str, default: str) -> str:
    tip = f" [{default}]" if default else ""
    raw = input(f"{prompt}{tip}: ").strip()
    return raw if raw else default


def _prompt_template_interactive() -> str:
    print("Choose a template:")
    for i, name in enumerate(TEMPLATE_CHOICES, start=1):
        print(f"  {i}) {name}")
    while True:
        raw = input("Template (1-4) [1]: ").strip() or "1"
        if raw.isdigit() and 1 <= int(raw) <= len(TEMPLATE_CHOICES):
            return TEMPLATE_CHOICES[int(raw) - 1]
        if raw in TEMPLATE_CHOICES:
            return raw
        print("Enter 1-4 or a template name: login, approval, onboarding, blank.", file=sys.stderr)


def _prompt_severity_interactive(default: str) -> str:
    print(f"Severity ({', '.join(_SEVERITY_CHOICES)})")
    while True:
        raw = _prompt_line("Severity", default).lower()
        if raw in _SEVERITY_CHOICES:
            return raw
        print(f"Use one of: {', '.join(_SEVERITY_CHOICES)}.", file=sys.stderr)


def _interactive_collect() -> Tuple[str, str, str, str, Path]:
    print("Torqa init — new .tq workflow")
    print()
    template = _prompt_template_interactive()
    defs = _TEMPLATE_DEFAULTS[template]
    flow = _prompt_line("Flow name (snake_case intent)", defs["flow"])
    flow = sanitize_flow_name(flow)
    owner = _prompt_line("Owner (team or label)", defs["owner"]).strip()
    severity = _prompt_severity_interactive(defs["severity"])
    out_default = f"{flow}.tq"
    out_raw = _prompt_line("Output file", out_default)
    out_path = Path(out_raw).expanduser()
    return template, flow, owner, severity, out_path


def _confirm_overwrite(path: Path) -> bool:
    if not path.is_file():
        return True
    ans = input(f"{path} exists. Overwrite? [y/N]: ").strip().lower()
    return ans in ("y", "yes")


def cmd_init(args: Any) -> int:
    template: Optional[str] = getattr(args, "template", None)
    output: Optional[Path] = getattr(args, "output", None)
    force = bool(getattr(args, "force", False))

    if output is not None and template is None:
        print(
            "torqa init: --output requires a template, e.g. torqa init login --output demo.tq",
            file=sys.stderr,
        )
        return 1
    if template is not None and output is None:
        print(
            "torqa init: when using a template, pass --output FILE (or run `torqa init` for the wizard).",
            file=sys.stderr,
        )
        return 1

    interactive = not (template is not None and output is not None)

    if interactive:
        if not sys.stdin.isatty() or not sys.stdout.isatty():
            print(
                "torqa init: interactive mode needs a TTY. "
                "Use: torqa init TEMPLATE --output FILE [--flow ... --owner ... --severity ...]",
                file=sys.stderr,
            )
            return 1
        template, flow, owner, severity, output = _interactive_collect()
    else:
        assert template is not None and output is not None
        defs = _TEMPLATE_DEFAULTS[template]
        flow = getattr(args, "flow", None) or defs["flow"]
        owner = (getattr(args, "owner", None) or defs["owner"]).strip()
        severity = (getattr(args, "severity", None) or defs["severity"]).strip().lower()
        flow = sanitize_flow_name(flow)
        if severity not in _SEVERITY_CHOICES:
            print(f"torqa init: severity must be one of: {', '.join(_SEVERITY_CHOICES)}", file=sys.stderr)
            return 1
        output = Path(output).expanduser()

    text = _render_tq(template=template, flow=flow, owner=owner, severity=severity)

    try:
        _validate_generated(text, output)
    except TQParseError as ex:
        print(f"torqa init: internal error (generated invalid .tq): {ex}", file=sys.stderr)
        return 1

    if output.exists() and not force:
        if interactive:
            if not _confirm_overwrite(output):
                print("Aborted.", file=sys.stderr)
                return 1
        else:
            print(
                f"torqa init: {output} exists. Pass --force to overwrite.",
                file=sys.stderr,
            )
            return 1

    try:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(text, encoding="utf-8", newline="\n")
    except OSError as ex:
        print(f"torqa init: could not write {output}: {ex}", file=sys.stderr)
        return 1

    if cli_quiet(args):
        print(f"Wrote {output.resolve()}")
    else:
        c = Console(
            file=sys.stdout,
            highlight=False,
            no_color=cli_no_color(args),
            force_terminal=sys.stdout.isatty() and not cli_no_color(args),
        )
        if sys.stdout.isatty() and not cli_no_color(args):
            c.print(
                Panel.fit(
                    f"[green]Starter workflow written[/]\n[bold]{output.resolve()}[/]\n\n"
                    "[dim]Next:[/] [bold]torqa validate[/] this file, then edit intent and flow steps.",
                    title="torqa init",
                    border_style="green",
                )
            )
        else:
            print(f"Wrote {output.resolve()}")
    return 0
