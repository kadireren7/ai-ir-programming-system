"""Tests for ``torqa report``."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from torqa.surface.parse_tq import parse_tq_source
from torqa.cli.main import main

VALID_TQ = """intent example_flow
requires username, password, ip_address
meta:
  owner test_team
  severity low
result Done
flow:
  create session
  emit login_success
"""


def test_report_html_writes_file_and_contains_sections(tmp_path: Path, capsys):
    p = tmp_path / "ok.tq"
    p.write_text(VALID_TQ, encoding="utf-8")
    out_html = tmp_path / "out.html"
    code = main(
        [
            "report",
            str(p),
            "--format",
            "html",
            "-o",
            str(out_html),
        ]
    )
    assert code == 0
    text = out_html.read_text(encoding="utf-8")
    assert "<!DOCTYPE html>" in text
    assert "Torqa trust report" in text
    assert "Report generated:" in text
    assert "SAFE_TO_HANDOFF" in text
    assert "Reasons" in text
    assert "Checked at" in text
    assert "Summary" in text and "Total files:" in text
    assert "Wrote" in capsys.readouterr().out


def test_report_directory_multiple_files(tmp_path: Path):
    (tmp_path / "a.tq").write_text(VALID_TQ, encoding="utf-8")
    bundle = parse_tq_source(VALID_TQ, tq_path=tmp_path / "x.tq")
    (tmp_path / "b.json").write_text(json.dumps(bundle), encoding="utf-8")
    out_html = tmp_path / "rep.html"
    code = main(
        [
            "report",
            str(tmp_path),
            "--format",
            "html",
            "-o",
            str(out_html),
        ]
    )
    assert code == 0
    text = out_html.read_text(encoding="utf-8")
    assert "a.tq" in text
    assert "b.json" in text
    assert "Total files: 2" in text


def test_report_blocked_exit_one(tmp_path: Path):
    p = tmp_path / "bad.tq"
    p.write_text(
        """intent example_flow
requires username, password, ip_address
result Done
flow:
  create session
  emit login_success
""",
        encoding="utf-8",
    )
    out_html = tmp_path / "r.html"
    code = main(["report", str(tmp_path), "--format", "html", "-o", str(out_html)])
    assert code == 1
    assert "BLOCKED" in out_html.read_text(encoding="utf-8")


def test_report_default_output_cwd(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    p = tmp_path / "ok.tq"
    p.write_text(VALID_TQ, encoding="utf-8")
    monkeypatch.chdir(tmp_path)
    code = main(["report", "ok.tq", "--format", "html"])
    assert code == 0
    assert (tmp_path / "torqa-report.html").is_file()


def test_report_not_found(capsys):
    code = main(["report", "/nonexistent/torqa_report_xyz", "--format", "html"])
    assert code == 1
    assert "not found" in capsys.readouterr().err.lower()


def test_report_help_exits_zero():
    with pytest.raises(SystemExit) as ei:
        main(["report", "--help"])
    assert ei.value.code == 0


def test_report_markdown_sections_and_recommendations(tmp_path: Path):
    p = tmp_path / "ok.tq"
    p.write_text(VALID_TQ, encoding="utf-8")
    out_md = tmp_path / "out.md"
    code = main(
        [
            "report",
            str(p),
            "--format",
            "md",
            "-o",
            str(out_md),
        ]
    )
    assert code == 0
    text = out_md.read_text(encoding="utf-8")
    assert "# Torqa trust report" in text
    assert "## Summary" in text
    assert "## Blocked files" in text
    assert "*None.*" in text or "_None._" in text
    assert "## Recommendations" in text
    assert "### Full results" in text
    assert "SAFE_TO_HANDOFF" in text


def test_report_markdown_blocked_lists_file(tmp_path: Path):
    p = tmp_path / "bad.tq"
    p.write_text(
        """intent example_flow
requires username, password, ip_address
result Done
flow:
  create session
  emit login_success
""",
        encoding="utf-8",
    )
    out_md = tmp_path / "r.md"
    code = main(["report", str(p), "--format", "md", "-o", str(out_md)])
    assert code == 1
    text = out_md.read_text(encoding="utf-8")
    assert "## Blocked files" in text
    assert "bad.tq" in text
    assert "owner" in text.lower() or "Policy" in text


def test_report_md_default_output_cwd(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    p = tmp_path / "ok.tq"
    p.write_text(VALID_TQ, encoding="utf-8")
    monkeypatch.chdir(tmp_path)
    code = main(["report", "ok.tq", "--format", "md"])
    assert code == 0
    assert (tmp_path / "torqa-report.md").is_file()


def test_evaluate_trust_gate_includes_reason(tmp_path: Path):
    from torqa.cli.check_cmd import evaluate_trust_gate

    p = tmp_path / "ok.tq"
    p.write_text(VALID_TQ, encoding="utf-8")
    ev = evaluate_trust_gate(p, "default")
    assert ev.reason_summary
    assert "heuristic" in ev.reason_summary.lower() or "owner" in ev.reason_summary.lower()
