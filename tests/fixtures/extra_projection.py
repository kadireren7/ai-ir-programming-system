"""Used when env ``TORQA_PROJECTION_MODULE=tests.fixtures.extra_projection:build_extra_artifacts`` is set."""

from __future__ import annotations

from typing import Any, Dict, List

from src.ir.canonical_ir import IRGoal
from src.projection.projection_strategy import ProjectionPlan


def build_extra_artifacts(ir_goal: IRGoal, projection_plan: ProjectionPlan) -> List[Dict[str, Any]]:
    _ = projection_plan
    return [
        {
            "target_language": "text",
            "purpose": "ecosystem_hook_smoke",
            "files": [
                {
                    "filename": "generated/ecosystem/hook_smoke.txt",
                    "content": f"hook_ok goal={ir_goal.goal}\n",
                }
            ],
        }
    ]
