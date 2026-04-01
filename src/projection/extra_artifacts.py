"""
Optional third-party projection hooks (ecosystem).

Set ``TORQA_PROJECTION_MODULE=python.module.path:function_name``; the callable receives
``(ir_goal: IRGoal, projection_plan: ProjectionPlan)`` and returns a list of artifact dicts
(same shape as ``generate_stub_artifact`` outputs) to append after built-in generation.
"""

from __future__ import annotations

import importlib
import os
from typing import Any, Dict, List

from src.ir.canonical_ir import IRGoal
from src.projection.projection_strategy import ProjectionPlan


def merge_extra_projection_artifacts(
    ir_goal: IRGoal,
    projection_plan: ProjectionPlan,
    artifacts: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    spec = (os.environ.get("TORQA_PROJECTION_MODULE") or "").strip()
    if not spec:
        return artifacts
    mod_name, sep, attr = spec.partition(":")
    mod = importlib.import_module(mod_name)
    fn = getattr(mod, attr or "build_extra_artifacts")
    extra = fn(ir_goal, projection_plan)
    if not extra:
        return list(artifacts)
    return list(artifacts) + list(extra)
