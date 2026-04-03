"""
Suffix lines after the onboarding prefix for surface/project CLI failures.

Source: ``examples/torqa_self/cli_surface_project_fail_suffix.tq`` → committed
``examples/torqa_self/cli_surface_project_fail_suffix_bundle.json`` (do not re-sort ``inputs``).
"""

from __future__ import annotations

from pathlib import Path
from typing import List

from src.torqa_self.bundle_io import ir_goal_input_names, load_bundle_ir_goal, repo_root

_REPO_ROOT = repo_root()
_DEFAULT_BUNDLE = _REPO_ROOT / "examples" / "torqa_self" / "cli_surface_project_fail_suffix_bundle.json"

_LINE_BY_SURFACE_FAIL_SLUG = {
    "surface_fail_surface_cmd": "torqa surface FILE.tq --out ir_bundle.json",
    "surface_fail_packages_doc": "IR reuse (compose + lock): docs/USING_PACKAGES.md",
    "surface_fail_language_cmd": "torqa language",
    "surface_fail_first_real_demo": "Flagship website demo: docs/FIRST_REAL_DEMO.md",
}

_FALLBACK_ORDER = (
    "surface_fail_surface_cmd",
    "surface_fail_packages_doc",
    "surface_fail_language_cmd",
    "surface_fail_first_real_demo",
)


def load_surface_project_fail_suffix(*, bundle_path: Path | None = None) -> List[str]:
    """
    Return the three default lines merged after onboarding for surface/project failures.

    If the bundle is missing or invalid, use ``_FALLBACK_ORDER``.
    """
    p = bundle_path or _DEFAULT_BUNDLE
    ig = load_bundle_ir_goal(p)
    if not ig:
        return [_LINE_BY_SURFACE_FAIL_SLUG[k] for k in _FALLBACK_ORDER]

    out: List[str] = []
    for name in ir_goal_input_names(ig):
        if not name.startswith("surface_fail_"):
            continue
        line = _LINE_BY_SURFACE_FAIL_SLUG.get(name)
        if line is not None:
            out.append(line)

    if len(out) != len(_FALLBACK_ORDER):
        return [_LINE_BY_SURFACE_FAIL_SLUG[k] for k in _FALLBACK_ORDER]
    return out
