"""
Committed self-host .tq / bundle pairs (Priority 12 registry + drift checks).

**Product grouping (P17)** — same artifacts, clearer mental model:

- **guidance** — lines users see in ``suggested_next`` / hints (onboarding prefix, surface/project
  suffix, report line scan order).
- **limits** — how many lines to keep or print (merge cap, human ``Next:`` display cap).
- **ordering** — merge block order + optional report-line tie-break (onboarding vs context first;
  surface vs sem ordering).
- **language_reference** — payloads for ``torqa language`` (taxonomy, rules, authoring passes,
  condition patterns, prose refs).

Regenerate bundles with ``torqa surface`` after editing any listed ``.tq``; see
``examples/torqa_self/README.md`` and ``docs/SELF_HOST_MAP.md``.

Debug / demo: ``torqa --json language --self-host-catalog`` — machine-readable catalog (no new policy).

---------------------------------------------------------------------------
P17.1 stability contract (self-host lockdown)
---------------------------------------------------------------------------

- ``SELF_HOST_BUNDLE_PAIRS`` **order is stable** (drift tests and maintainer scripts depend on it).
- ``_SELF_HOST_ENTRY_META`` must stay **1:1 aligned** with ``SELF_HOST_BUNDLE_PAIRS`` (same length,
  same index = same .tq row). Do not insert or reorder rows without updating both tuples together.
- **Group ids are frozen** to exactly:
  ``guidance``, ``limits``, ``ordering``, ``language_reference`` (see ``SELF_HOST_LOCKED_GROUP_IDS``).
  No new groups without an explicit roadmap phase (**P18+**).
- **No new registry entries** (no extra ``( .tq , bundle )`` pairs) without an explicit priority
  phase; **P26** added ``cli_validate_open_hints`` under the same locked **guidance** group.
- Renaming ``.tq`` files, committed bundles, or IR input slugs remains governed by the same
  contract as before: only with intentional migration + drift regeneration, not drive-by edits.

Runtime checks: ``self_host_catalog()`` asserts pair/meta length match and rejects unknown group ids.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Tuple

from src.torqa_self.bundle_io import repo_root

_ROOT = repo_root()
_SELF = _ROOT / "examples" / "torqa_self"

# Primary end-user flow (documented in QUICKSTART / README).
SINGLE_FLOW_LINE = "torqa build <path-to-your.tq>"

# (source .tq, committed bundle json) — order is stable; drift tests rely on it.
SELF_HOST_BUNDLE_PAIRS: Tuple[Tuple[Path, Path], ...] = (
    (_SELF / "cli_onboarding.tq", _SELF / "cli_onboarding_bundle.json"),
    (_SELF / "cli_suggested_next_merge_cap.tq", _SELF / "cli_suggested_next_merge_cap_bundle.json"),
    (_SELF / "cli_suggested_next_merge_order.tq", _SELF / "cli_suggested_next_merge_order_bundle.json"),
    (_SELF / "cli_surface_project_fail_suffix.tq", _SELF / "cli_surface_project_fail_suffix_bundle.json"),
    (_SELF / "cli_report_suggested_next_order.tq", _SELF / "cli_report_suggested_next_order_bundle.json"),
    (_SELF / "cli_validate_open_hints.tq", _SELF / "cli_validate_open_hints_bundle.json"),
    (_SELF / "language_reference_taxonomy.tq", _SELF / "language_reference_taxonomy_bundle.json"),
    (_SELF / "layered_authoring_passes.tq", _SELF / "layered_authoring_passes_bundle.json"),
    (_SELF / "language_reference_rules_prefix.tq", _SELF / "language_reference_rules_prefix_bundle.json"),
    (_SELF / "language_reference_condition_patterns.tq", _SELF / "language_reference_condition_patterns_bundle.json"),
    (_SELF / "language_reference_prose_refs.tq", _SELF / "language_reference_prose_refs_bundle.json"),
)

# Parallel to SELF_HOST_BUNDLE_PAIRS: group_id, user_facing_strings, one_line_role, primary_python
_SELF_HOST_ENTRY_META: Tuple[Tuple[str, bool, str, str], ...] = (
    (
        "guidance",
        True,
        "Default suggested_next prefix lines after many CLI/Web failures.",
        "src.diagnostics.user_hints, src.torqa_self.onboarding_ir",
    ),
    (
        "limits",
        True,
        "Max merged suggested_next length; max human surface stderr Next: lines.",
        "src.torqa_self.suggested_next_merge_cap_ir, src.cli.main cmd_surface",
    ),
    (
        "ordering",
        False,
        "Onboarding vs context merge order; optional sem/surface tie-break in reports.",
        "src.torqa_self.suggested_next_merge_order_ir, user_hints",
    ),
    (
        "guidance",
        True,
        "Extra suggested_next lines when surface/project commands fail.",
        "src.torqa_self.surface_fail_hints_ir",
    ),
    (
        "guidance",
        False,
        "Scan order for report_next_* lines (predicates stay in Python).",
        "src.torqa_self.report_suggested_next_ir",
    ),
    (
        "guidance",
        True,
        "Static validate open-file suggested_next lines (wrong extension / bad JSON / non-object root).",
        "src.torqa_self.validate_open_hints_ir, src.cli.main _open_json_bundle_file",
    ),
    (
        "language_reference",
        False,
        "Taxonomy lists (types, phases, operators, …) in torqa language.",
        "src.torqa_self.language_reference_taxonomy_ir",
    ),
    (
        "language_reference",
        False,
        "Layered authoring passes list in language reference.",
        "src.torqa_self.layered_authoring_passes_ir",
    ),
    (
        "language_reference",
        False,
        "All seven rules lines order → prose via Python mapping.",
        "src.torqa_self.language_reference_rules_ir",
    ),
    (
        "language_reference",
        False,
        "condition_id_patterns slug order → dict insertion order.",
        "src.torqa_self.language_reference_condition_patterns_ir",
    ),
    (
        "language_reference",
        False,
        "diagnostics_issue_shape and aem_execution prose slots.",
        "src.torqa_self.language_reference_prose_refs_ir",
    ),
)

_GROUP_LABELS: Dict[str, str] = {
    "guidance": "Guidance (suggested_next & report lines)",
    "limits": "Limits (caps & display)",
    "ordering": "Ordering (merge & tie-break)",
    "language_reference": "Language reference (torqa language)",
}

_GROUP_BLURBS: Dict[str, str] = {
    "guidance": "What to try next; strings often surface in CLI/Web JSON and stderr.",
    "limits": "Bounds list length and human-only line counts; does not change which hints exist.",
    "ordering": "Pure presentation order for merged hints; selection logic remains in Python.",
    "language_reference": "Author-facing reference payload; driven by TORQA bundles, bridged in Python.",
}

# P17.1: frozen set of catalog group ids — no new member without roadmap phase (P18+).
SELF_HOST_LOCKED_GROUP_IDS: frozenset[str] = frozenset(
    {"guidance", "limits", "ordering", "language_reference"}
)
assert SELF_HOST_LOCKED_GROUP_IDS == frozenset(_GROUP_LABELS.keys())
assert SELF_HOST_LOCKED_GROUP_IDS == frozenset(_GROUP_BLURBS.keys())


def self_host_bundle_pairs() -> List[Tuple[Path, Path]]:
    return list(SELF_HOST_BUNDLE_PAIRS)


def self_host_group_blurbs() -> Dict[str, str]:
    return dict(_GROUP_BLURBS)


def self_host_catalog() -> List[Dict[str, Any]]:
    """Stable, JSON-friendly index of every self-host pair + maintainer notes (P17)."""
    np = len(SELF_HOST_BUNDLE_PAIRS)
    nm = len(_SELF_HOST_ENTRY_META)
    if np != nm:
        raise RuntimeError("P17.1 violation: registry/meta drift")

    rows: List[Dict[str, Any]] = []
    for (tq, bundle), (gid, user_visible, role, py_hint) in zip(
        SELF_HOST_BUNDLE_PAIRS, _SELF_HOST_ENTRY_META, strict=True
    ):
        if gid not in _GROUP_LABELS:
            raise RuntimeError("Unknown self-host group (P17.1 locked set)")
        try:
            tq_rel = str(tq.relative_to(_ROOT)).replace("\\", "/")
        except ValueError:
            tq_rel = tq.name
        try:
            bundle_rel = str(bundle.relative_to(_ROOT)).replace("\\", "/")
        except ValueError:
            bundle_rel = bundle.name
        rows.append(
            {
                "group": gid,
                "group_label": _GROUP_LABELS[gid],
                "tq": tq_rel,
                "bundle": bundle_rel,
                "user_visible_hint_strings": user_visible,
                "role": role,
                "primary_python": py_hint,
            }
        )
    return rows
