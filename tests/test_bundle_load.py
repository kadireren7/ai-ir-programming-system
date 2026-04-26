"""Unit tests for ``bundle_load`` JSON shapes and path hints."""

from __future__ import annotations

import json


from torqa.cli.bundle_load import load_bundle_from_json_bytes


def test_empty_array_rejected() -> None:
    raw = b"[]"
    out, err = load_bundle_from_json_bytes(raw, path_hint="x.json")
    assert out is None
    assert err is not None
    assert "x.json" in err
    assert "empty" in err.lower()


def test_array_element_not_object() -> None:
    raw = json.dumps([{"ir_goal": {}}, 3]).encode()
    out, err = load_bundle_from_json_bytes(raw, path_hint="b.json")
    assert out is None
    assert err is not None
    assert "[1]" in err
    assert "object" in err.lower()


def test_single_bundle_path_prefix_on_envelope_error() -> None:
    raw = json.dumps({"ir_goal": {}, "oops": 1}).encode()
    out, err = load_bundle_from_json_bytes(raw, path_hint="c.json")
    assert out is None
    assert err is not None
    assert err.startswith("c.json:")
