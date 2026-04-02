"""
Dynamic projection strategy engine (V1.4).

Depends only on canonical IR + IR semantic report (+ optional IR execution summaries).
No parser/CoreGoal/CLI coupling.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Set, Tuple

from src.ir.canonical_ir import IRGoal


SUPPORTED_LANGUAGES = frozenset(
    {"rust", "go", "kotlin", "cpp", "python", "typescript", "sql"}
)
SUPPORTED_PURPOSES = frozenset(
    {
        "core_runtime",
        "service_backend",
        "tooling_bridge",
        "editor_integration",
        "storage_surface",
        "frontend_surface",
        "systems_extension",
        "cli_tool",
    }
)

WEBSITE_GENERATION_PROFILE = {
    "supports_pages": True,
    "supports_components": True,
    "supports_forms": True,
    "supports_basic_layout": True,
    "supports_previewable_structure": True,
}


def analyze_ir_domains(ir_goal: IRGoal) -> Dict[str, Any]:
    cond_n = len(ir_goal.preconditions) + len(ir_goal.forbids) + len(ir_goal.postconditions)
    trans_n = len(ir_goal.transitions)
    has_state = trans_n > 0 or cond_n > 0
    effect_density = (trans_n / max(1, cond_n + trans_n))
    requires_storage = any(
        ("log" in t.effect_name.lower() or "store" in t.effect_name.lower() or "persist" in t.effect_name.lower())
        for t in ir_goal.transitions
    )
    interaction_level = "low"
    if len(ir_goal.inputs) >= 4:
        interaction_level = "medium"
    if len(ir_goal.inputs) >= 8:
        interaction_level = "high"
    determinism_level = "high"
    if any(("or" in getattr(getattr(c, "expr", None), "operator", "") for c in ir_goal.forbids)):
        determinism_level = "medium"
    if any(getattr(getattr(c, "expr", None), "operator", "") in {">", "<"} for c in ir_goal.preconditions):
        determinism_level = "medium"
    return {
        "has_state": has_state,
        "effect_density": round(effect_density, 4),
        "requires_storage": requires_storage,
        "interaction_level": interaction_level,
        "determinism_level": determinism_level,
    }


class ProjectionTarget:
    def __init__(
        self,
        language: str,
        purpose: str,
        confidence: float,
        reasons: List[str],
        constraints: Optional[Dict[str, Any]] = None,
    ):
        self.language = language
        self.purpose = purpose
        self.confidence = confidence
        self.reasons = reasons
        self.constraints = constraints or {}


class ProjectionPlan:
    def __init__(
        self,
        primary_target: ProjectionTarget,
        secondary_targets: Optional[List[ProjectionTarget]] = None,
        strategy_notes: Optional[List[str]] = None,
    ):
        self.primary_target = primary_target
        self.secondary_targets = secondary_targets or []
        self.strategy_notes = strategy_notes or []


class ProjectionContext:
    def __init__(
        self,
        performance_priority: str = "medium",
        safety_priority: str = "high",
        latency_sensitivity: str = "medium",
        developer_velocity_priority: str = "medium",
        deployment_environment: str = "general",
        interoperability_needs: Optional[List[str]] = None,
        runtime_profile: str = "service",
        allow_multiple_targets: bool = True,
    ):
        self.performance_priority = performance_priority
        self.safety_priority = safety_priority
        self.latency_sensitivity = latency_sensitivity
        self.developer_velocity_priority = developer_velocity_priority
        self.deployment_environment = deployment_environment
        self.interoperability_needs = interoperability_needs or []
        self.runtime_profile = runtime_profile
        self.allow_multiple_targets = allow_multiple_targets


def _priority_weight(level: str) -> float:
    m = {"low": 0.35, "medium": 0.65, "high": 1.0}
    return m.get((level or "").lower(), 0.65)


def _infer_features(
    ir_goal: IRGoal, semantic_report: Dict[str, Any], execution_summary: Optional[Dict[str, Any]]
) -> Dict[str, Any]:
    pre_n = len(ir_goal.preconditions)
    forbid_n = len(ir_goal.forbids)
    trans_n = len(ir_goal.transitions)
    logical_n = 0
    for sec in (ir_goal.preconditions, ir_goal.forbids, ir_goal.postconditions):
        for c in sec:
            expr_t = getattr(c.expr, "__class__", type(c.expr)).__name__
            if expr_t == "IRLogical":
                logical_n += 1
    complexity = pre_n + forbid_n + trans_n + (2 * logical_n)
    sem_ok = bool(semantic_report.get("semantic_ok", False))
    sem_errors = len(semantic_report.get("errors", []))
    has_after = bool(
        semantic_report.get("guarantee_table", {}).get("after", {})
    )
    return {
        "condition_count": pre_n + forbid_n + len(ir_goal.postconditions),
        "transition_count": trans_n,
        "complexity": complexity,
        "semantic_ok": sem_ok,
        "semantic_error_count": sem_errors,
        "has_after_guarantees": has_after,
        "execution_summary_present": execution_summary is not None,
    }


def score_projection_target(
    language: str,
    ir_goal: IRGoal,
    semantic_report: Dict[str, Any],
    execution_summary: Optional[Dict[str, Any]],
    context: ProjectionContext,
) -> Tuple[float, List[str]]:
    lang = language.lower()
    if lang not in SUPPORTED_LANGUAGES:
        return (0.0, [f"Language '{language}' is not supported in V1.4 scoring set."])

    f = _infer_features(ir_goal, semantic_report, execution_summary)
    domain = analyze_ir_domains(ir_goal)
    reasons: List[str] = []
    score = 0.25

    safety_w = _priority_weight(context.safety_priority)
    perf_w = _priority_weight(context.performance_priority)
    latency_w = _priority_weight(context.latency_sensitivity)
    velocity_w = _priority_weight(context.developer_velocity_priority)

    if lang == "rust":
        score += 0.30 * safety_w
        score += 0.20 * perf_w
        score += 0.12 * latency_w
        score += 0.10  # roadmap alignment retained while dynamic scoring stays open
        reasons.append("High safety/performance profile strongly aligns with Rust core runtime.")
    elif lang == "go":
        score += 0.14 * safety_w
        score += 0.15 * perf_w
        score += 0.20 * latency_w
        reasons.append("Go fits low-latency service-style runtime with simpler operational model.")
    elif lang == "cpp":
        score += 0.10 * safety_w
        score += 0.30 * perf_w
        score += 0.18 * latency_w
        reasons.append("C++ remains strong for extreme systems-level performance constraints.")
    elif lang == "python":
        score += 0.30 * velocity_w
        reasons.append("Python improves tooling/iteration speed for orchestration and bridges.")
    elif lang == "typescript":
        score += 0.22 * velocity_w
        reasons.append("TypeScript is favorable for typed integration surfaces and rapid adapters.")
    elif lang == "sql":
        score += 0.18
        reasons.append("SQL is useful as a storage projection for relational persistence surfaces.")

    if f["complexity"] >= 12 and lang in {"rust", "go", "cpp"}:
        score += 0.09
        reasons.append("IR condition/transition complexity favors stronger compiled runtime targets.")

    if f["semantic_ok"] and lang in {"rust", "go", "cpp"}:
        score += 0.06
        reasons.append("Clean IR semantic report increases confidence in strict compiled projection.")
    elif (not f["semantic_ok"]) and lang in {"python", "typescript"}:
        score += 0.08
        reasons.append("Semantic issues suggest keeping fast-iteration auxiliary targets available.")

    if f["has_after_guarantees"] and lang in {"rust", "go", "cpp"}:
        score += 0.05
        reasons.append("Structured after-state guarantees map well to explicit runtime engines.")

    if domain["has_state"] and lang in {"rust", "go"}:
        score += 0.07
        reasons.append("Domain profile shows stateful orchestration, favoring robust runtime cores.")
    if domain["requires_storage"] and lang == "sql":
        score += 0.20
        reasons.append("Domain profile indicates persistence/logging patterns, favoring SQL surface.")
    if domain["interaction_level"] == "high" and lang in {"typescript", "python"}:
        score += 0.10
        reasons.append("High interaction profile benefits bridge/frontend-supporting targets.")
    if domain["determinism_level"] == "high" and lang == "rust":
        score += 0.04
        reasons.append("High determinism profile maps well to strict Rust execution semantics.")

    profile = (context.runtime_profile or "").lower()
    if profile in {"service", "backend"} and lang in {"rust", "go"}:
        score += 0.08
        reasons.append("Runtime profile is service/backend, reinforcing systems backend targets.")
    if profile in {"cli", "tool"} and lang in {"python", "rust"}:
        score += 0.06
        reasons.append("CLI/tooling runtime profile supports Rust binary + Python bridge combinations.")

    needs = {x.lower() for x in context.interoperability_needs}
    if "frontend" in needs and lang == "typescript":
        score += 0.20
        reasons.append("Interoperability needs include frontend, favoring TypeScript secondary surfaces.")
    if "storage" in needs and lang == "sql":
        score += 0.22
        reasons.append("Interoperability needs include storage, favoring SQL storage projection.")
    if "python_bridge" in needs and lang == "python":
        score += 0.15
        reasons.append("Interoperability explicitly requests Python bridge integration.")

    if context.deployment_environment.lower() in {"embedded", "low_level"} and lang == "cpp":
        score += 0.12
        reasons.append("Deployment constraints suggest low-level systems extension capability.")

    score = max(0.0, min(1.0, score))
    return (round(score, 4), reasons[:6] if reasons else ["General compatibility fit."])


def _choose_purpose(language: str, context: ProjectionContext) -> str:
    lang = language.lower()
    profile = context.runtime_profile.lower()
    if lang == "rust":
        return "core_runtime"
    if lang == "go":
        return "service_backend" if profile in {"service", "backend"} else "cli_tool"
    if lang == "cpp":
        return "systems_extension"
    if lang == "python":
        return "tooling_bridge" if profile != "cli" else "cli_tool"
    if lang == "typescript":
        return "frontend_surface"
    if lang == "sql":
        return "storage_surface"
    return "tooling_bridge"


def choose_projection_targets(
    ir_goal: IRGoal,
    semantic_report: Dict[str, Any],
    execution_summary: Optional[Dict[str, Any]] = None,
    context: Optional[ProjectionContext] = None,
) -> ProjectionPlan:
    ctx = context or ProjectionContext()
    scored: List[Tuple[str, float, List[str]]] = []
    for lang in sorted(SUPPORTED_LANGUAGES):
        score, reasons = score_projection_target(
            lang, ir_goal, semantic_report, execution_summary, ctx
        )
        scored.append((lang, score, reasons))
    scored.sort(key=lambda x: x[1], reverse=True)

    plang, pscore, preasons = scored[0]
    primary = ProjectionTarget(
        language=plang,
        purpose=_choose_purpose(plang, ctx),
        confidence=pscore,
        reasons=preasons,
        constraints={"multi_target_allowed": bool(ctx.allow_multiple_targets)},
    )

    secondary: List[ProjectionTarget] = []
    if ctx.allow_multiple_targets:
        for lang, score, reasons in scored[1:]:
            # Dynamic multi-target policy: close score or interoperability utility threshold.
            if score < 0.45 and score < (pscore - 0.18):
                continue
            sec = ProjectionTarget(
                language=lang,
                purpose=_choose_purpose(lang, ctx),
                confidence=score,
                reasons=reasons,
                constraints={},
            )
            if (sec.language, sec.purpose) != (primary.language, primary.purpose):
                secondary.append(sec)
            if len(secondary) >= 3:
                break

    domain = analyze_ir_domains(ir_goal)
    notes = [
        "Language selection is dynamic and strategy-scored from IR semantics/runtime profile.",
        "No fixed domain-to-language mapping is used.",
        "Canonical IR remains the source of truth for projection planning.",
        f"Domain profile: has_state={domain['has_state']}, effect_density={domain['effect_density']}, "
        f"requires_storage={domain['requires_storage']}, interaction_level={domain['interaction_level']}.",
        f"Website generation profile: {WEBSITE_GENERATION_PROFILE}",
    ]

    # V6.2 threshold support: keep dynamic strategy, but ensure website-capable path can be selected.
    if not any(t.language == "typescript" and t.purpose == "frontend_surface" for t in [primary] + secondary):
        secondary.append(
            ProjectionTarget(
                language="typescript",
                purpose="frontend_surface",
                confidence=0.5,
                reasons=[
                    "V6.2 threshold support enabled website-capable projection path.",
                    "Added as optional secondary without changing dynamic primary ownership.",
                ],
                constraints={"threshold_support": True},
            )
        )
    return ProjectionPlan(primary, secondary, notes)


def explain_projection_strategy(
    ir_goal: IRGoal,
    semantic_report: Dict[str, Any],
    execution_summary: Optional[Dict[str, Any]] = None,
    context: Optional[ProjectionContext] = None,
) -> Dict[str, Any]:
    """
    Transparent breakdown of language scores, chosen plan, and deprioritized targets.
    """
    ctx = context or ProjectionContext()
    ranked: List[Dict[str, Any]] = []
    for lang in sorted(SUPPORTED_LANGUAGES):
        score, reasons = score_projection_target(
            lang, ir_goal, semantic_report, execution_summary, ctx
        )
        ranked.append(
            {
                "language": lang,
                "score": score,
                "inferred_purpose": _choose_purpose(lang, ctx),
                "reasons": reasons,
            }
        )
    ranked.sort(key=lambda x: x["score"], reverse=True)
    plan = choose_projection_targets(ir_goal, semantic_report, execution_summary, ctx)
    primary_key = (plan.primary_target.language, plan.primary_target.purpose)
    rejected = [
        r
        for r in ranked
        if (r["language"], r["inferred_purpose"]) != primary_key and r["score"] < 0.35
    ]
    return {
        "domain": analyze_ir_domains(ir_goal),
        "features": _infer_features(ir_goal, semantic_report, execution_summary),
        "ranked_languages": ranked,
        "selected": projection_plan_to_json(plan)["projection_plan"],
        "deprioritized_summary": rejected[:8],
        "strategy_notes": list(plan.strategy_notes),
    }


def projection_plan_to_json(plan: ProjectionPlan) -> dict:
    def tgt_to_json(t: ProjectionTarget) -> dict:
        return {
            "language": t.language,
            "purpose": t.purpose,
            "confidence": t.confidence,
            "reasons": list(t.reasons),
            "constraints": dict(t.constraints),
        }

    return {
        "projection_plan": {
            "primary_target": tgt_to_json(plan.primary_target),
            "secondary_targets": [tgt_to_json(t) for t in plan.secondary_targets],
            "strategy_notes": list(plan.strategy_notes),
        }
    }


def validate_projection_plan(plan: ProjectionPlan) -> List[str]:
    errors: List[str] = []
    if plan.primary_target is None:
        errors.append("Projection plan: primary target is required.")
        return errors

    seen: Set[Tuple[str, str]] = set()

    def check_target(t: ProjectionTarget, where: str) -> None:
        if t.language not in SUPPORTED_LANGUAGES:
            errors.append(f"Projection plan: unsupported language '{t.language}' at {where}.")
        if t.purpose not in SUPPORTED_PURPOSES:
            errors.append(f"Projection plan: unsupported purpose '{t.purpose}' at {where}.")
        if not (0.0 <= float(t.confidence) <= 1.0):
            errors.append(f"Projection plan: confidence out of range at {where}.")
        if not t.reasons or not any(str(r).strip() for r in t.reasons):
            errors.append(f"Projection plan: non-empty reasons required at {where}.")
        key = (t.language, t.purpose)
        if key in seen:
            errors.append(
                f"Projection plan: duplicate (language,purpose) pair {key!r} at {where}."
            )
        seen.add(key)

    check_target(plan.primary_target, "primary_target")
    for i, t in enumerate(plan.secondary_targets):
        check_target(t, f"secondary_targets[{i}]")
        if (
            t.language == plan.primary_target.language
            and t.purpose == plan.primary_target.purpose
        ):
            errors.append("Projection plan: secondary target duplicates primary target exactly.")
    return errors
