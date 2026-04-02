"""
Derive human-readable projection text from canonical IR (not a second source of truth).
"""

from __future__ import annotations

import json
from typing import Any, List

from src.ir.canonical_ir import IRGoal, ir_expr_to_json, ir_goal_to_json, ir_type_to_rust


def _header_lines(goal_name: str) -> List[str]:
    return [
        f"// Auto-generated from AI core IR (goal: {goal_name}).",
        "// Do not treat as primary source — edit through the platform / core IR.",
        "",
    ]


def ir_expr_compact(expr: Any) -> str:
    return json.dumps(ir_expr_to_json(expr), ensure_ascii=False, separators=(",", ":"))


def ir_goal_sql_projection(goal: IRGoal) -> str:
    lines: List[str] = []
    lines.append("-- Auto-generated from AI core IR.")
    lines.append("-- Do not treat as primary source — edit through the platform / core IR.")
    lines.append("")
    lines.append(f"-- Goal: {goal.goal}")
    if goal.result:
        lines.append(f"-- Result label: {goal.result}")
    lines.append("")
    lines.append("/* Inputs (workflow-facing columns) */")
    col_defs: List[str] = []
    for inp in sorted(goal.inputs, key=lambda x: x.name):
        sql_t = {"text": "TEXT", "number": "NUMERIC", "boolean": "BOOLEAN"}.get(
            inp.type_name, "TEXT"
        )
        col_defs.append(f"  {inp.name} {sql_t} NOT NULL")
    if col_defs:
        lines.append("CREATE TABLE IF NOT EXISTS workflow_inputs (")
        lines.append(",\n".join(col_defs))
        lines.append(");")
    else:
        lines.append("-- (no inputs declared)")
    lines.append("")
    for i, c in enumerate(goal.preconditions):
        lines.append(
            f"-- require {c.condition_id}: {ir_expr_compact(c.expr)}"
        )
    for i, c in enumerate(goal.forbids):
        lines.append(f"-- forbid {c.condition_id}: {ir_expr_compact(c.expr)}")
    for t in goal.transitions:
        lines.append(
            f"-- effect {t.transition_id} {t.effect_name} {t.from_state}->{t.to_state} "
            f"args={json.dumps([ir_expr_compact(a) for a in t.arguments])}"
        )
    return "\n".join(lines) + "\n"


def ir_goal_typescript_index_projection(goal: IRGoal) -> str:
    bundle = ir_goal_to_json(goal)
    lines = _header_lines(goal.goal)
    lines.append("/** Embedded IR bundle for tooling / tests (read-only). */")
    lines.append(f"export const IR_GOAL_NAME = {json.dumps(goal.goal)};")
    lines.append(
        "export const IR_BUNDLE: Record<string, unknown> = "
        + json.dumps(bundle, ensure_ascii=False)
        + " as Record<string, unknown>;"
    )
    lines.append("")
    lines.append("export function describeFlow(): string {")
    lines.append(f"  return `Flow: ${{IR_GOAL_NAME}}, inputs: {len(goal.inputs)}, "
                 f"requires: {len(goal.preconditions)}, forbids: {len(goal.forbids)}, "
                 f"effects: {len(goal.transitions)}`;")
    lines.append("}")
    lines.append("")
    return "\n".join(lines) + "\n"


def _rust_quoted(s: str) -> str:
    escaped = s.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def ir_goal_rust_projection(goal: IRGoal) -> str:
    lines = [
        "//! Auto-generated from AI core IR.",
        "//! Do not treat as primary source.",
        "",
        f"//! Goal: {goal.goal}",
    ]
    if goal.result:
        lines.append(f"//! Result: {goal.result}")
    lines.append("")
    lines.append("fn main() {")
    lines.append(f"    let goal: &str = {_rust_quoted(goal.goal)};")
    lines.append('    println!("goal={goal}");')
    if goal.result:
        lines.append(f"    let result_label: &str = {_rust_quoted(goal.result)};")
        lines.append('    println!("result_label={result_label}");')
    lines.append("}")
    lines.append("")
    lines.append("/* Mapped input types (conservative Rust): */")
    for inp in sorted(goal.inputs, key=lambda x: x.name):
        try:
            rt = ir_type_to_rust(inp.type_name)
        except ValueError:
            rt = "String"
        lines.append(f"// {inp.name}: {rt}")
    return "\n".join(lines) + "\n"


def ir_goal_python_projection(goal: IRGoal) -> str:
    lines = [
        f"# Auto-generated from AI core IR (goal: {goal.goal}).",
        "# Do not treat as primary source — edit through the platform / core IR.",
        "",
    ]
    lines.append('"""IR-derived skeleton — behavior lives in verified core + runtime."""')
    lines.append("")
    lines.append(f"GOAL_NAME = {json.dumps(goal.goal)}")
    lines.append(f"RESULT_LABEL = {json.dumps(goal.result)}")
    lines.append("")
    lines.append("def describe() -> str:")
    lines.append(
        f"    return f\"goal={{GOAL_NAME!r}}, inputs={len(goal.inputs)}, "
        f"effects={len(goal.transitions)}\""
    )
    lines.append("")
    lines.append("def main() -> None:")
    lines.append("    print(describe())")
    lines.append("")
    lines.append('if __name__ == "__main__":')
    lines.append("    main()")
    lines.append("")
    return "\n".join(lines)


def ir_goal_kotlin_projection(goal: IRGoal) -> str:
    g = json.dumps(goal.goal)
    lines = [
        "// Auto-generated from AI core IR.",
        "// Do not treat as primary source.",
        "",
        "package generated",
        "",
        "fun main() {",
        f'    println("goal: " + {g})',
        "}",
        "",
    ]
    return "\n".join(lines) + "\n"


def ir_goal_go_projection(goal: IRGoal) -> str:
    lines = [
        "// Auto-generated from AI core IR.",
        "// Do not treat as primary source.",
        "",
        "package main",
        "",
        "import \"fmt\"",
        "",
        "func main() {",
        f"\tfmt.Println(\"goal:\", {json.dumps(goal.goal)})",
        "}",
        "",
    ]
    return "\n".join(lines) + "\n"


def _cpp_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"')


def ir_goal_cpp_projection(goal: IRGoal) -> str:
    g = _cpp_escape(goal.goal)
    lines = [
        "// Auto-generated from AI core IR.",
        "// Do not treat as primary source.",
        "",
        "#include <iostream>",
        "",
        "int main() {",
        f'    std::cout << "goal: {g}" << std::endl;',
        "    return 0;",
        "}",
        "",
    ]
    return "\n".join(lines) + "\n"


def ir_goal_server_typescript_stub(goal: IRGoal) -> str:
    """Side-effect list derived from transitions (replaces empty stub)."""
    lines = _header_lines(goal.goal)
    effects = [json.dumps(t.effect_name) for t in goal.transitions]
    lines.append("/** Declared effect names from IR transitions (projection only). */")
    lines.append(f"export const DECLARED_EFFECTS = [{', '.join(effects)}] as const;")
    lines.append("")
    lines.append("export function runServerStub(): string {")
    lines.append(
        '  return `effects: ${DECLARED_EFFECTS.join(", ")}`;'
    )
    lines.append("}")
    lines.append("")
    return "\n".join(lines) + "\n"
