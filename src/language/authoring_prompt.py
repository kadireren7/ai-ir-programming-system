"""
Single source of truth for human + LLM authoring of canonical IR.

Keeps the OpenAI system prompt aligned with ``default_ir_function_registry`` and handoff rules.
"""

from __future__ import annotations

import json
from typing import Any, Dict, List

from src.ir.canonical_ir import CANONICAL_IR_VERSION
from src.semantics.ir_semantics import IRFunctionSignature, default_ir_function_registry

# Golden minimal shape (must stay consistent with examples/core/valid_minimal_flow.json).
_MINIMAL_BUNDLE: Dict[str, Any] = {
    "ir_goal": {
        "goal": "MinimalDemoFlow",
        "inputs": [{"name": "username", "type": "text"}],
        "preconditions": [
            {
                "condition_id": "c_req_0001",
                "kind": "require",
                "expr": {
                    "type": "call",
                    "name": "exists",
                    "arguments": [{"type": "identifier", "name": "username"}],
                },
            }
        ],
        "forbids": [],
        "transitions": [],
        "postconditions": [],
        "result": "OK",
        "metadata": {
            "ir_version": CANONICAL_IR_VERSION,
            "source": "python_prototype",
            "canonical_language": "english",
            "source_map": {"available": True, "prototype_only": True},
        },
    }
}


def minimal_valid_bundle_json(*, indent: int = 2) -> str:
    return json.dumps(_MINIMAL_BUNDLE, indent=indent)


def _registry_rows(reg: Dict[str, IRFunctionSignature]) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for name in sorted(reg.keys()):
        sig = reg[name]
        role = "effect" if sig.return_type == "void" else "predicate"
        rows.append(
            {
                "name": name,
                "role": role,
                "arguments": list(sig.arg_types),
                "returns": sig.return_type,
            }
        )
    return rows


def language_reference_payload() -> Dict[str, Any]:
    """Structured reference for CLI, tooling, and documentation generators."""
    reg = default_ir_function_registry()
    return {
        "name": "TORQA core IR (canonical interchange)",
        "design": "verifier_first_ai_native",
        "canonical_ir_version": CANONICAL_IR_VERSION,
        "metadata_required": {
            "ir_version": CANONICAL_IR_VERSION,
            "source": "python_prototype",
            "canonical_language": "english",
        },
        "input_types": ["text", "number", "boolean", "void", "unknown"],
        "condition_id_patterns": {
            "preconditions": "c_req_NNNN (four digits, unique)",
            "forbids": "c_forbid_NNNN",
            "postconditions": "c_post_NNNN",
            "transitions": "t_NNNN",
        },
        "transition_states": ["before", "after"],
        "expr_json_types": [
            "identifier",
            "string_literal",
            "number_literal",
            "boolean_literal",
            "call",
            "binary",
            "logical",
        ],
        "binary_operators": ["==", "!=", "<", ">", "<=", ">="],
        "logical_operators": ["and", "or"],
        "identifiers": "ASCII [A-Za-z_][A-Za-z0-9_]* for goal, inputs, calls, effect_name",
        "json_object_keys": "ASCII snake_case [a-z][a-z0-9_]*",
        "builtins": _registry_rows(reg),
        "formal_validation_phases": ["syntax", "kind_type", "wellformed", "policy"],
        "diagnostics_issue_shape": "Each issue includes legacy phase plus formal_phase (FORMAL_CORE §2); repair loops should group by formal_phase.",
        "layered_authoring_passes": [
            "A — skeleton (goal, inputs, metadata, empty arrays)",
            "B — preconditions / forbids",
            "C — transitions (void effects; σ must match from_state → to_state per AEM)",
            "D — postconditions; final full diagnostic",
        ],
        "aem_execution": "Reference Python and Rust executors enforce control state σ (before|after) and AEM_* halt codes; see docs/AEM_SPEC.md.",
        "rules": [
            "See docs/AI_GENERATION_PROFILE.md and docs/SELF_EVOLUTION_PIPELINE.md: validate-then-expand, minimal diff on repair, proposal-gate before merge.",
            "Output exactly one JSON object with top-level key ir_goal (and optional envelope keys only as in schema).",
            "Use only listed builtins by name; match arity. Predicates in conditions; void builtins as transition effect_name only.",
            "Every condition_id and transition_id must be globally unique within ir_goal.",
            "Chained transitions: after the first before→after step, later transitions must use from_state \"after\" when σ is already after (AEM).",
            "Passing full diagnostics requires structural + handoff + determinism + semantic checks (no verifier bypass).",
            "Multi-surface: valid IR is not website-only — orchestration emits generated/webapp (Vite) plus stubs such as generated/sql/schema.sql, generated/rust/main.rs, generated/python/main.py; logging-like effects raise SQL relevance.",
        ],
        "minimal_valid_bundle": _MINIMAL_BUNDLE,
    }


def build_ai_authoring_system_prompt() -> str:
    reg = default_ir_function_registry()
    builtins_lines: List[str] = []
    for row in _registry_rows(reg):
        a = ", ".join(row["arguments"])
        builtins_lines.append(
            f"- {row['name']} [{row['role']}] ({a}) -> {row['returns']}"
        )
    builtins_block = "\n".join(builtins_lines)
    minimal = minimal_valid_bundle_json(indent=2)

    return f"""You are the TORQA formalization engine: you turn natural-language workflow intent into ONE valid JSON object only (response_format json_object). The artifact is the TORQA AI-native core language serialized as data — not prose.

## Generation profile (token + error discipline)
Follow `docs/AI_GENERATION_PROFILE.md` and layered passes in `docs/SELF_EVOLUTION_PIPELINE.md` §5. Use fixed identifier/id vocabulary; validate-then-expand; on verifier failure apply minimal diffs using `code`, legacy `phase`, and **`formal_phase`** (`syntax` | `kind_type` | `wellformed` | `policy` per `docs/FORMAL_CORE.md`) — do not rewrite unrelated sections. Multi-step transitions must respect AEM control state: only the first transition may use `from_state` \"before\" if σ starts at before; once σ is `after`, the next transition’s `from_state` must be `after` unless you insert an explicit earlier step that returns σ to `before` (rare). Omit `library_refs` unless integrating an approved shared library; when present include `name`, `version`, and `fingerprint` if policy requires.

## Output shape
Top-level must be: {{"ir_goal": {{...}}}}. No markdown fences, no commentary outside JSON.

## Metadata (required inside ir_goal.metadata)
- ir_version: "{CANONICAL_IR_VERSION}" (exact string)
- source: "python_prototype"
- canonical_language: "english"
- source_map: {{"available": true, "prototype_only": true}} (recommended)

## Structural rules
- goal: non-empty PascalCase ASCII identifier describing the workflow (e.g. UserLoginFlow).
- inputs: unique names; type one of text|number|boolean|void|unknown.
- preconditions: kind "require", ids c_req_0001, c_req_0002, ...
- forbids: kind "forbid", ids c_forbid_0001, ...
- postconditions: kind "postcondition", ids c_post_0001, ...
- transitions: transition_id t_0001, ...; effect_name ASCII; from_state and to_state only "before" or "after".
- result: short ASCII string or null as appropriate.
- All condition_id values globally unique across preconditions, forbids, postconditions.

## Expressions (JSON "type" field)
identifier, string_literal, number_literal, boolean_literal, call, binary, logical.
- binary operators: ==, !=, <, >, <=, >=
- logical operators: and, or
- Use only ASCII identifiers. Floats must be integers (no fractional handoff floats).

## Builtins (ONLY these names; match arity — unknown names fail semantic verification)
{builtins_block}

Use "exists" with one identifier argument for typical input presence checks. For transitions, effect_name must be one of the void builtins with correct argument count and types (text inputs).

## Multi-surface projections (not website-only)
The same `ir_goal` drives **several emitters**: a previewable React/Vite tree under `generated/webapp/`, relational SQL under `generated/sql/`, and stub runtimes (Rust, Python, Go, TypeScript index, C++) under `generated/<language>/`. Strategy scoring picks a primary language plus secondaries. Effects whose names suggest audit/logging (e.g. `log_successful_login`) strengthen storage/SQL scoring. You only author the IR; projectors produce files.

## Minimal valid example (structure reference; expand meaningfully for the user's prompt)
{minimal}

Prefer small, coherent workflows. If the user is vague, still emit a minimal consistent IR that passes checks rather than inventing undefined predicates."""
