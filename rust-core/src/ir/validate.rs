//! Structural IR validation (shape, ids, metadata.ir_version).
//!
//! P24: This crate path is the first **surfaced** Rust concentration for TORQA — exposed to Python
//! via the bridge ``validate_ir`` action and ``rust_structural_validation_digest``. Python
//! ``canonical_ir.validate_ir`` remains stricter (condition_id patterns, kinds, full metadata);
//! do not assume parity on every edge case until deliberately aligned.

use std::collections::HashSet;

use crate::ir::expr::IrExpr;
use crate::ir::goal::IrGoal;

pub const CANONICAL_IR_VERSION: &str = "1.4";

pub fn validate_ir(goal: &IrGoal) -> Vec<String> {
    let mut errors: Vec<String> = Vec::new();
    if goal.goal.trim().is_empty() {
        errors.push("IR validation: goal must be non-empty.".to_string());
    }

    let allowed_types: HashSet<&str> = ["text", "number", "boolean", "void", "unknown"]
        .iter()
        .copied()
        .collect();
    let mut input_names = HashSet::new();
    for i in &goal.inputs {
        if !input_names.insert(i.name.clone()) {
            errors.push(format!("IR validation: duplicate input '{}'.", i.name));
        }
        if !allowed_types.contains(i.type_name.as_str()) {
            errors.push(format!(
                "IR validation: unsupported input type '{}' for '{}'.",
                i.type_name, i.name
            ));
        }
    }

    let mut cond_ids = HashSet::new();
    for c in goal
        .preconditions
        .iter()
        .chain(goal.forbids.iter())
        .chain(goal.postconditions.iter())
    {
        if !cond_ids.insert(c.condition_id.clone()) {
            errors.push(format!(
                "IR validation: duplicate condition_id '{}'.",
                c.condition_id
            ));
        }
        validate_expr(&c.expr, &mut errors);
    }

    let mut trans_ids = HashSet::new();
    for t in &goal.transitions {
        if t.effect_name.trim().is_empty() {
            errors.push("IR validation: transition effect_name must be non-empty.".to_string());
        }
        if !["before", "after"].contains(&t.from_state.as_str())
            || !["before", "after"].contains(&t.to_state.as_str())
        {
            errors.push(format!(
                "IR validation: transition '{}' has invalid state edge {} -> {}.",
                t.transition_id, t.from_state, t.to_state
            ));
        }
        if !trans_ids.insert(t.transition_id.clone()) {
            errors.push(format!(
                "IR validation: duplicate transition_id '{}'.",
                t.transition_id
            ));
        }
        for a in &t.arguments {
            validate_expr(a, &mut errors);
        }
    }

    if let Some(v) = goal.metadata.get("ir_version").and_then(|v| v.as_str()) {
        if v != CANONICAL_IR_VERSION {
            errors.push(format!(
                "IR validation: metadata.ir_version must be '{}', got '{}'.",
                CANONICAL_IR_VERSION, v
            ));
        }
    } else {
        errors.push("IR validation: metadata.ir_version missing.".to_string());
    }
    errors
}

fn validate_expr(expr: &IrExpr, errors: &mut Vec<String>) {
    match expr {
        IrExpr::Identifier { .. }
        | IrExpr::StringLiteral { .. }
        | IrExpr::NumberLiteral { .. }
        | IrExpr::BooleanLiteral { .. } => {}
        IrExpr::Call { name, arguments } => {
            if name.trim().is_empty() {
                errors.push("IR validation: call name must be non-empty.".to_string());
            }
            for a in arguments {
                validate_expr(a, errors);
            }
        }
        IrExpr::Binary { left, right, .. } | IrExpr::Logical { left, right, .. } => {
            validate_expr(left, errors);
            validate_expr(right, errors);
        }
    }
}
