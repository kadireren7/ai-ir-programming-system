"""Optional ``torqa.toml`` defaults and CLI integration."""

from __future__ import annotations

import copy
import json
from pathlib import Path

import pytest

from torqa.surface.parse_tq import parse_tq_source
from torqa.cli.main import main
from torqa.cli.project_config import (
    TorqaConfigError,
    find_torqa_toml,
    load_torqa_project_config,
    parse_torqa_toml_file,
)

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


def _bundle_six_transitions_policy_warning() -> dict:
    """
    Same metadata as VALID_TQ but six IR transitions (policy warning; policy_ok still true).
    Not expressible as strict .tq (duplicate flow steps are rejected).
    """
    b = copy.deepcopy(parse_tq_source(VALID_TQ))
    ig = b["ir_goal"]

    def idn(n: str) -> dict:
        return {"type": "identifier", "name": n}

    ig["transitions"] = [
        {
            "transition_id": "t_0001",
            "effect_name": "verify_username",
            "arguments": [idn("username")],
            "from_state": "before",
            "to_state": "before",
        },
        {
            "transition_id": "t_0002",
            "effect_name": "verify_password",
            "arguments": [idn("username"), idn("password")],
            "from_state": "before",
            "to_state": "before",
        },
        {
            "transition_id": "t_0003",
            "effect_name": "reset_failed_attempts",
            "arguments": [idn("username")],
            "from_state": "before",
            "to_state": "before",
        },
        {
            "transition_id": "t_0004",
            "effect_name": "ip_blacklisted",
            "arguments": [idn("ip_address")],
            "from_state": "before",
            "to_state": "before",
        },
        {
            "transition_id": "t_0005",
            "effect_name": "start_session",
            "arguments": [idn("username")],
            "from_state": "before",
            "to_state": "after",
        },
        {
            "transition_id": "t_0006",
            "effect_name": "log_successful_login",
            "arguments": [idn("username"), idn("ip_address")],
            "from_state": "after",
            "to_state": "after",
        },
    ]
    return b


def test_load_torqa_project_config_absent_uses_builtin(tmp_path: Path) -> None:
    cfg = load_torqa_project_config(tmp_path)
    assert cfg.profile == "default"
    assert cfg.fail_on_warning is False
    assert cfg.report_format == "html"


def test_find_torqa_toml_walks_upward(tmp_path: Path) -> None:
    sub = tmp_path / "a" / "b"
    sub.mkdir(parents=True)
    root_toml = tmp_path / "torqa.toml"
    root_toml.write_text('[torqa]\nprofile = "strict"\n', encoding="utf-8")
    assert find_torqa_toml(sub) == root_toml.resolve()


def test_parse_torqa_toml_root_keys(tmp_path: Path) -> None:
    p = tmp_path / "torqa.toml"
    p.write_text(
        'profile = "review-heavy"\nfail_on_warning = true\nreport_format = "md"\n',
        encoding="utf-8",
    )
    cfg = parse_torqa_toml_file(p)
    assert cfg.profile == "review-heavy"
    assert cfg.fail_on_warning is True
    assert cfg.report_format == "md"


def test_parse_invalid_profile_raises(tmp_path: Path) -> None:
    p = tmp_path / "torqa.toml"
    p.write_text('[torqa]\nprofile = "bogus"\n', encoding="utf-8")
    with pytest.raises(TorqaConfigError, match="Unknown trust profile"):
        parse_torqa_toml_file(p)


def test_cli_respects_torqa_toml_profile(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    (tmp_path / "torqa.toml").write_text('[torqa]\nprofile = "strict"\n', encoding="utf-8")
    p = tmp_path / "ok.tq"
    p.write_text(VALID_TQ, encoding="utf-8")
    code = main(["check", str(p)])
    assert code == 0
    out = capsys.readouterr().out
    assert "Trust profile: strict" in out


def test_cli_report_default_format_from_toml(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    (tmp_path / "torqa.toml").write_text('[torqa]\nreport_format = "md"\n', encoding="utf-8")
    p = tmp_path / "ok.tq"
    p.write_text(VALID_TQ, encoding="utf-8")
    monkeypatch.chdir(tmp_path)
    code = main(["report", "ok.tq"])
    assert code == 0
    out_md = tmp_path / "torqa-report.md"
    assert out_md.is_file()
    text = out_md.read_text(encoding="utf-8")
    assert "# Torqa trust report" in text


def test_fail_on_warning_exits_1_from_toml(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    (tmp_path / "torqa.toml").write_text("[torqa]\nfail_on_warning = true\n", encoding="utf-8")
    p = tmp_path / "warn.json"
    p.write_text(json.dumps(_bundle_six_transitions_policy_warning()), encoding="utf-8")
    code = main(["validate", str(p)])
    assert code == 1
    assert "Policy warnings:" in capsys.readouterr().out


def test_cli_invalid_torqa_toml_exits_2(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    (tmp_path / "torqa.toml").write_text("[torqa]\nreport_format = \"pdf\"\n", encoding="utf-8")
    p = tmp_path / "ok.tq"
    p.write_text(VALID_TQ, encoding="utf-8")
    code = main(["check", str(p)])
    assert code == 2
    assert "report_format" in capsys.readouterr().err


def test_fail_on_warning_cli_overrides_toml(tmp_path: Path) -> None:
    (tmp_path / "torqa.toml").write_text("[torqa]\nfail_on_warning = true\n", encoding="utf-8")
    p = tmp_path / "warn.json"
    p.write_text(json.dumps(_bundle_six_transitions_policy_warning()), encoding="utf-8")
    code = main(["validate", "--no-fail-on-warning", str(p)])
    assert code == 0
