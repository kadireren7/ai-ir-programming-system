"""Tests for ``torqa init``."""

from __future__ import annotations

from pathlib import Path

import pytest

from torqa.cli.init_cmd import sanitize_flow_name
from torqa.cli.main import main


def test_sanitize_flow_name():
    assert sanitize_flow_name("My Flow") == "my_flow"
    assert sanitize_flow_name("  ") == "my_workflow"
    assert sanitize_flow_name("123x") == "flow_123x"


def test_init_noninteractive_login_writes_valid_tq(tmp_path: Path, capsys):
    out = tmp_path / "demo.tq"
    code = main(["init", "login", "--output", str(out)])
    assert code == 0
    assert out.is_file()
    text = out.read_text(encoding="utf-8")
    assert "intent user_login" in text
    assert "owner my_team" in text
    assert "severity low" in text
    assert "create session" in text
    captured = capsys.readouterr()
    assert "Wrote" in captured.out
    assert main(["validate", str(out)]) == 0


def test_init_noninteractive_custom_flags(tmp_path: Path):
    out = tmp_path / "x.tq"
    code = main(
        [
            "init",
            "approval",
            "--output",
            str(out),
            "--flow",
            "custom_approval",
            "--owner",
            "sec",
            "--severity",
            "medium",
        ]
    )
    assert code == 0
    text = out.read_text(encoding="utf-8")
    assert "intent custom_approval" in text
    assert "owner sec" in text
    assert "severity medium" in text
    assert main(["validate", str(out)]) == 0


def test_init_onboarding_template(tmp_path: Path):
    out = tmp_path / "on.tq"
    assert main(["init", "onboarding", "--output", str(out)]) == 0
    text = out.read_text(encoding="utf-8")
    assert "requires username, email, password, ip_address" in text
    assert main(["validate", str(out)]) == 0


def test_init_blank_template(tmp_path: Path):
    out = tmp_path / "b.tq"
    assert main(["init", "blank", "--output", str(out)]) == 0
    assert main(["validate", str(out)]) == 0


def test_init_refuses_overwrite_without_force(tmp_path: Path):
    out = tmp_path / "x.tq"
    out.write_text("x", encoding="utf-8")
    code = main(["init", "login", "--output", str(out)])
    assert code == 1
    assert out.read_text() == "x"


def test_init_force_overwrites(tmp_path: Path):
    out = tmp_path / "x.tq"
    out.write_text("x", encoding="utf-8")
    code = main(["init", "login", "--output", str(out), "--force"])
    assert code == 0
    assert "intent user_login" in out.read_text(encoding="utf-8")


def test_init_errors_template_without_output(capsys):
    code = main(["init", "login"])
    assert code == 1
    err = capsys.readouterr().err
    assert "--output" in err.lower() or "output" in err.lower()


def test_init_errors_output_without_template(capsys):
    code = main(["init", "--output", "x.tq"])
    assert code == 1
    err = capsys.readouterr().err
    assert "template" in err.lower()


def test_init_interactive_wizard_defaults(monkeypatch: pytest.MonkeyPatch, tmp_path: Path, capsys):
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr("sys.stdin.isatty", lambda: True)
    monkeypatch.setattr("sys.stdout.isatty", lambda: True)
    answers = iter(["1", "", "", "", ""])
    monkeypatch.setattr("builtins.input", lambda _p="": next(answers))

    code = main(["init"])
    assert code == 0
    p = tmp_path / "user_login.tq"
    assert p.is_file()

    assert main(["validate", str(p)]) == 0
    out = capsys.readouterr().out
    assert "Torqa init" in out
    assert "Result: PASS" in out
    assert "Handoff:" in out


def test_cli_init_help_exits_zero():
    with pytest.raises(SystemExit) as ei:
        main(["init", "--help"])
    assert ei.value.code == 0
