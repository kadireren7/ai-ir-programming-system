"""P17 / P17.1: self-host catalog aligned with registry; structure lockdown guards."""

from __future__ import annotations

from pathlib import Path

from src.torqa_self.bundle_registry import (
    SELF_HOST_BUNDLE_PAIRS,
    SELF_HOST_LOCKED_GROUP_IDS,
    SINGLE_FLOW_LINE,
    _SELF_HOST_ENTRY_META,
    self_host_bundle_pairs,
    self_host_catalog,
    self_host_group_blurbs,
)


def test_catalog_len_matches_registry():
    assert len(self_host_catalog()) == len(self_host_bundle_pairs())


def test_registry_meta_alignment():
    assert len(SELF_HOST_BUNDLE_PAIRS) == len(_SELF_HOST_ENTRY_META)


def test_groups_are_exact_set():
    assert {row["group"] for row in self_host_catalog()} == SELF_HOST_LOCKED_GROUP_IDS


def test_no_duplicate_tq_paths_in_catalog():
    tqs = [row["tq"] for row in self_host_catalog()]
    assert len(tqs) == len(set(tqs))


def test_catalog_paths_exist():
    repo = Path(__file__).resolve().parents[1]
    for row in self_host_catalog():
        assert (repo / row["tq"]).is_file(), row["tq"]
        assert (repo / row["bundle"]).is_file(), row["bundle"]


def test_group_blurbs_cover_catalog_groups():
    blurbs = self_host_group_blurbs()
    for row in self_host_catalog():
        assert row["group"] in blurbs


def test_single_flow_line_exact():
    assert SINGLE_FLOW_LINE.strip() == "torqa build <path-to-your.tq>"
