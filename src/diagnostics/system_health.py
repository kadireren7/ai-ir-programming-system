"""Single-pane system health report composing diagnostics, quality, projection, generation, engine."""

from __future__ import annotations

from typing import Any, Dict, Optional

from src.bridge.rust_structural_validation import rust_structural_validation_digest
from src.codegen.generation_quality import build_generation_quality_report
from src.diagnostics.report import build_full_diagnostic_report
from src.execution.engine_routing import run_rust_pipeline_with_fallback
from src.execution.parity_report import build_engine_parity_report
from src.ir.canonical_ir import IRGoal, compute_ir_fingerprint
from src.ir.quality import build_ir_quality_report
from src.orchestrator.system_orchestrator import SystemOrchestrator
from src.projection.projection_strategy import ProjectionContext, choose_projection_targets, explain_projection_strategy
from src.semantics.ir_semantics import build_ir_semantic_report, default_ir_function_registry


def build_system_health_report(
    ir_goal: IRGoal,
    *,
    demo_inputs: Optional[Dict[str, Any]] = None,
    engine_mode: str = "rust_preferred",
    include_parity: bool = True,
) -> Dict[str, Any]:
    reg = default_ir_function_registry()
    semantic = build_ir_semantic_report(ir_goal, reg)
    diagnostics = build_full_diagnostic_report(ir_goal)
    quality = build_ir_quality_report(ir_goal)
    strategy_explain = explain_projection_strategy(ir_goal, semantic, None, ProjectionContext())
    plan = choose_projection_targets(ir_goal, semantic, None, ProjectionContext())
    orch = SystemOrchestrator(ir_goal, context=ProjectionContext(), engine_mode=engine_mode)
    orch_out = orch.run_v4()
    artifacts = orch_out.get("artifacts", [])
    gen_quality = build_generation_quality_report(ir_goal, plan, artifacts)

    routing: Dict[str, Any] = {}
    rust_block: Dict[str, Any] = {}
    fallback: Dict[str, Any] = {}
    try:
        routing, rust_block, fallback = run_rust_pipeline_with_fallback(
            ir_goal, dict(demo_inputs or {}), mode=engine_mode
        )
    except Exception as ex:
        rust_block = {"error": str(ex)}

    parity = build_engine_parity_report(ir_goal, demo_inputs) if include_parity else {"skipped": True}

    editor_readiness = {
        "patch_flow_available": True,
        "preview_available": True,
        "diagnostics_mature": True,
        "session_persistence": False,
        "undo_redo_web": False,
    }

    return {
        "ir_summary": {
            "goal": ir_goal.goal,
            "fingerprint": compute_ir_fingerprint(ir_goal),
        },
        "rust_core": {
            "structural_validation": rust_structural_validation_digest(ir_goal),
        },
        "diagnostics": diagnostics,
        "ir_quality": quality,
        "semantic_report_summary": {
            "semantic_ok": semantic.get("semantic_ok"),
            "errors": len(semantic.get("errors") or []),
            "warnings": len(semantic.get("warnings") or []),
        },
        "projection_strategy": strategy_explain,
        "generation_quality": gen_quality,
        "orchestrator": {
            "consistency_errors": orch_out.get("consistency_errors", []),
            "engine_mode": engine_mode,
        },
        "engine": {"routing": routing, "rust_output_keys": list(rust_block.keys()) if rust_block else [], "fallback": fallback},
        "parity": parity,
        "editor_platform_readiness": editor_readiness,
        "checkpoints": {
            "diagnostics_ok": diagnostics["ok"],
            "semantic_ok": bool(semantic.get("semantic_ok")),
            "artifact_validation_ok": gen_quality.get("artifact_validation_ok"),
            "website_threshold_passed": bool(gen_quality.get("website_threshold", {}).get("passed")),
            "orchestrator_consistency_clean": len(orch_out.get("consistency_errors") or []) == 0,
        },
    }
