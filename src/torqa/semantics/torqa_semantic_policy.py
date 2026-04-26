"""
P29: TORQA-authored **non-blocking** semantic advisories (warning toggles + soft limits).

Optionally loaded from ``semantic_warning_policy_bundle.json`` at the repository root (IR bundle).
**Core semantic errors** (unknown effects, arity, guarantees,
undefined identifiers) always stay in ``ir_semantics.validate_ir_semantics`` and are not
configurable here.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import FrozenSet, List, Optional, Set, Tuple

from torqa.ir.canonical_ir import IRGoal

_REPO_ROOT = Path(__file__).resolve().parents[2]
_POLICY_BUNDLE = _REPO_ROOT / "semantic_warning_policy_bundle.json"

_WARN_SLUG_PREFIX = "sem_warn_"
_ADVISORY_MAX_TRANS_RE = re.compile(r"^sem_advisory_max_transitions_(\d+)$")

# Canonical codes -> exact warning prefix (messages completed in ir_semantics for stability).
WARNING_CODE_EMPTY_RESULT = "empty_result_when_transitions"
WARNING_CODE_NO_AFTER = "no_after_guarantees_with_result"

KNOWN_WARNING_CODES: FrozenSet[str] = frozenset({WARNING_CODE_EMPTY_RESULT, WARNING_CODE_NO_AFTER})

_DEFAULT_ENABLED: FrozenSet[str] = frozenset(KNOWN_WARNING_CODES)

_policy_cache: Optional[Tuple[FrozenSet[str], Optional[int]]] = None


@dataclass(frozen=True)
class TorqaSemanticPolicy:
    """Effective advisory policy for one validation run."""

    enabled_warning_codes: FrozenSet[str]
    max_transitions_advisory: Optional[int]


def _parse_policy_inputs(names: List[str]) -> Tuple[Set[str], Optional[int]]:
    warn_codes: Set[str] = set()
    max_trans: Optional[int] = None
    for n in names:
        if not isinstance(n, str):
            continue
        if n.startswith(_WARN_SLUG_PREFIX):
            code = n[len(_WARN_SLUG_PREFIX) :]
            if code in KNOWN_WARNING_CODES:
                warn_codes.add(code)
        m = _ADVISORY_MAX_TRANS_RE.match(n)
        if m:
            v = int(m.group(1))
            if v > 0:
                max_trans = v if max_trans is None else min(max_trans, v)
    return warn_codes, max_trans


def load_global_semantic_policy(*, bundle_path: Optional[Path] = None) -> TorqaSemanticPolicy:
    """Optional root policy bundle; if missing, built-in defaults apply (pre-P29 behavior)."""
    global _policy_cache
    path = bundle_path or _POLICY_BUNDLE
    if bundle_path is None and _policy_cache is not None:
        codes, mx = _policy_cache
        return TorqaSemanticPolicy(codes, mx)

    codes, mx = _DEFAULT_ENABLED, None
    if path.is_file():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            ig = data.get("ir_goal") if isinstance(data, dict) else None
            inputs = ig.get("inputs") if isinstance(ig, dict) else None
            names: List[str] = []
            if isinstance(inputs, list):
                for row in inputs:
                    if isinstance(row, dict) and isinstance(row.get("name"), str):
                        names.append(row["name"])
            parsed_warn, parsed_max = _parse_policy_inputs(names)
            if parsed_warn:
                codes = frozenset(parsed_warn)
            if parsed_max is not None:
                mx = parsed_max
        except (OSError, UnicodeDecodeError, json.JSONDecodeError, TypeError, ValueError):
            codes, mx = _DEFAULT_ENABLED, None

    if bundle_path is None:
        _policy_cache = (codes, mx)
    return TorqaSemanticPolicy(codes, mx)


def clear_semantic_policy_cache() -> None:
    global _policy_cache
    _policy_cache = None


def effective_semantic_policy(ir_goal: IRGoal) -> TorqaSemanticPolicy:
    """
    Global TORQA policy, then per-goal ``metadata.source_map``:

    - ``semantic_warnings_enabled``: non-empty list replaces the enabled warning set (filtered).
    - ``semantic_quiet``: subtracts codes (only if no replacement list was used).
    - ``semantic_max_transitions_advisory``: positive int overrides advisory cap.
    """
    base = load_global_semantic_policy()
    sm = ir_goal.metadata.get("source_map")
    if not isinstance(sm, dict):
        return base

    enabled_override = sm.get("semantic_warnings_enabled")
    if isinstance(enabled_override, list) and len(enabled_override) > 0:
        codes = frozenset(
            x for x in enabled_override if isinstance(x, str) and x in KNOWN_WARNING_CODES
        )
        if not codes:
            codes = frozenset(base.enabled_warning_codes)
    else:
        codes = frozenset(base.enabled_warning_codes)
        quiet = sm.get("semantic_quiet")
        if isinstance(quiet, list):
            codes -= {x for x in quiet if isinstance(x, str)}

    max_t = base.max_transitions_advisory
    ov = sm.get("semantic_max_transitions_advisory")
    if isinstance(ov, int) and ov > 0:
        max_t = ov

    return TorqaSemanticPolicy(codes, max_t)


