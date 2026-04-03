"""P26: self-host expansion — parity with Python fallbacks and merge-cap slug parsing."""

from __future__ import annotations

from pathlib import Path

import pytest

from src.cli.main import _open_json_bundle_file
from src.torqa_self.suggested_next_merge_cap_ir import suggested_next_display_cap, suggested_next_merge_cap
from src.torqa_self.validate_open_hints_ir import (
    validate_open_hints_for_bad_extension,
    validate_open_hints_for_bad_json,
    validate_open_hints_for_not_dict,
    validate_open_hints_for_tq_path,
)

REPO = Path(__file__).resolve().parents[1]


def test_merge_cap_parses_numeric_suffix_like_legacy_table():
    assert suggested_next_merge_cap() == 10
    assert suggested_next_display_cap() == 6


@pytest.mark.parametrize(
    "slug,expected",
    [
        ("sn_merge_cap_6", 6),
        ("sn_merge_cap_12", 12),
        ("sn_merge_cap_10", 10),
        ("sn_display_cap_8", 8),
        ("sn_display_cap_4", 4),
    ],
)
def test_cap_slug_regex(slug, expected, tmp_path):
    """Synthetic bundle: core + merge slug + display slug."""
    import json

    names = ["username", "password", "ip_address", slug, "sn_display_cap_6"]
    if slug.startswith("sn_display"):
        names = ["username", "password", "ip_address", "sn_merge_cap_10", slug]
    bundle = {
        "ir_goal": {
            "goal": "X",
            "inputs": [{"name": n, "type": "text"} for n in names],
            "preconditions": [],
            "forbids": [],
            "transitions": [],
            "postconditions": [],
            "result": "OK",
            "metadata": {
                "ir_version": "1.4",
                "source": "python_prototype",
                "canonical_language": "english",
            },
        }
    }
    p = tmp_path / "cap.json"
    p.write_text(json.dumps(bundle), encoding="utf-8")
    if slug.startswith("sn_merge"):
        assert suggested_next_merge_cap(bundle_path=p) == expected
    else:
        assert suggested_next_display_cap(bundle_path=p) == expected


def test_validate_open_hints_bundle_matches_fallback_literals():
    p = REPO / "examples" / "workspace_minimal" / "app.tq"
    tq_lines = validate_open_hints_for_tq_path(p)
    assert tq_lines == [
        f"torqa surface {p} --out ir_bundle.json",
        f"torqa build {p}",
    ]
    assert validate_open_hints_for_bad_extension() == [
        "torqa surface FILE.tq --out ir_bundle.json",
        "torqa build FILE.tq",
    ]
    assert validate_open_hints_for_bad_json() == [
        "torqa language --minimal-json",
        "spec/IR_BUNDLE.schema.json",
    ]
    assert validate_open_hints_for_not_dict() == ["torqa language --minimal-json"]


def test_validate_open_hints_fallback_when_bundle_missing(tmp_path):
    missing = tmp_path / "missing.json"
    p = REPO / "examples" / "torqa_demo_site" / "app.tq"
    assert validate_open_hints_for_tq_path(p, bundle_path=missing) == [
        f"torqa surface {p} --out ir_bundle.json",
        f"torqa build {p}",
    ]


def test_open_json_bundle_file_uses_self_host_lines(tmp_path):
    tq = tmp_path / "x.tq"
    tq.write_text(
        "module tmp.validate_open\nintent demo_x\nrequires username, password\nresult OK\nflow:\n",
        encoding="utf-8",
    )
    bundle, err = _open_json_bundle_file(tq)
    assert bundle is None and err is not None
    assert err["suggested_next"] == [
        f"torqa surface {tq} --out ir_bundle.json",
        f"torqa build {tq}",
    ]
