use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;

use crate::execution::planner::{build_execution_plan, ExecutionPlan};
use crate::execution::runtime::ExecutionContext;
use crate::ir::expr::IrExpr;
use crate::ir::goal::{IrCondition, IrGoal, IrTransition};

pub const AEM_PRECOND_FALSE: &str = "AEM_PRECOND_FALSE";
pub const AEM_FORBID_TRUE: &str = "AEM_FORBID_TRUE";
pub const AEM_POSTCOND_FALSE: &str = "AEM_POSTCOND_FALSE";
pub const AEM_EFFECT_REJECT: &str = "AEM_EFFECT_REJECT";
pub const AEM_EFFECT_EXN: &str = "AEM_EFFECT_EXN";
pub const AEM_STATE_MISMATCH: &str = "AEM_STATE_MISMATCH";

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ExecutionResult {
    pub success: bool,
    pub result_text: Option<String>,
    pub executed_transitions: Vec<String>,
    pub failed_step: Option<String>,
    pub errors: Vec<String>,
    pub after_state_summary: Value,
    #[serde(default)]
    pub aem_codes: Vec<String>,
}

pub type RuntimeImpl = Box<dyn Fn(Vec<Value>, &mut ExecutionContext) -> Value + Send + Sync>;
pub type RuntimeMap = HashMap<String, RuntimeImpl>;

pub fn evaluate_expr(expr: &IrExpr, ctx: &mut ExecutionContext, runtime: &RuntimeMap) -> Value {
    match expr {
        IrExpr::Identifier { name, .. } => ctx
            .inputs
            .get(name)
            .cloned()
            .or_else(|| ctx.world_state.get(name).cloned())
            .unwrap_or(Value::Null),
        IrExpr::StringLiteral { value } => Value::String(value.clone()),
        IrExpr::NumberLiteral { value } => json!(value),
        IrExpr::BooleanLiteral { value } => json!(value),
        IrExpr::Call { name, arguments } => {
            let args = arguments
                .iter()
                .map(|a| evaluate_expr(a, ctx, runtime))
                .collect::<Vec<_>>();
            runtime.get(name).map(|f| f(args, ctx)).unwrap_or(Value::Null)
        }
        IrExpr::Binary {
            left,
            operator,
            right,
        } => {
            let l = evaluate_expr(left, ctx, runtime);
            let r = evaluate_expr(right, ctx, runtime);
            match operator.as_str() {
                "==" => json!(l == r),
                "!=" => json!(l != r),
                ">" => json!(l.as_i64().unwrap_or(0) > r.as_i64().unwrap_or(0)),
                "<" => json!(l.as_i64().unwrap_or(0) < r.as_i64().unwrap_or(0)),
                ">=" => json!(l.as_i64().unwrap_or(0) >= r.as_i64().unwrap_or(0)),
                "<=" => json!(l.as_i64().unwrap_or(0) <= r.as_i64().unwrap_or(0)),
                _ => Value::Null,
            }
        }
        IrExpr::Logical {
            left,
            operator,
            right,
        } => {
            let l = evaluate_expr(left, ctx, runtime).as_bool().unwrap_or(false);
            let r = evaluate_expr(right, ctx, runtime).as_bool().unwrap_or(false);
            match operator.as_str() {
                "and" => json!(l && r),
                "or" => json!(l || r),
                _ => Value::Null,
            }
        }
    }
}

pub fn execute(
    goal: &IrGoal,
    ctx: &mut ExecutionContext,
    runtime: &RuntimeMap,
) -> (ExecutionResult, ExecutionPlan) {
    let mut plan = build_execution_plan(goal);
    let c_req: HashMap<String, &IrCondition> = goal
        .preconditions
        .iter()
        .map(|c| (c.condition_id.clone(), c))
        .collect();
    let c_forbid: HashMap<String, &IrCondition> = goal
        .forbids
        .iter()
        .map(|c| (c.condition_id.clone(), c))
        .collect();
    let trans: HashMap<String, &IrTransition> = goal
        .transitions
        .iter()
        .map(|t| (t.transition_id.clone(), t))
        .collect();
    let mut executed = Vec::new();
    let mut sigma = "before".to_string();

    for s in &mut plan.steps {
        match s.kind.as_str() {
            "precondition" => {
                if let Some(c) = c_req.get(&s.ref_id) {
                    let ok = evaluate_expr(&c.expr, ctx, runtime).as_bool().unwrap_or(false);
                    if !ok {
                        s.status = "failed".to_string();
                        return (
                            ExecutionResult {
                                success: false,
                                result_text: None,
                                executed_transitions: executed,
                                failed_step: Some(s.step_id.clone()),
                                errors: vec![format!("Precondition '{}' failed.", c.condition_id)],
                                after_state_summary: json!({}),
                                aem_codes: vec![AEM_PRECOND_FALSE.to_string()],
                            },
                            plan,
                        );
                    }
                    s.status = "passed".to_string();
                }
            }
            "forbid" => {
                if let Some(c) = c_forbid.get(&s.ref_id) {
                    let bad = evaluate_expr(&c.expr, ctx, runtime).as_bool().unwrap_or(false);
                    if bad {
                        s.status = "failed".to_string();
                        return (
                            ExecutionResult {
                                success: false,
                                result_text: None,
                                executed_transitions: executed,
                                failed_step: Some(s.step_id.clone()),
                                errors: vec![format!("Forbid '{}' triggered.", c.condition_id)],
                                after_state_summary: json!({}),
                                aem_codes: vec![AEM_FORBID_TRUE.to_string()],
                            },
                            plan,
                        );
                    }
                    s.status = "passed".to_string();
                }
            }
            "transition" => {
                if let Some(t) = trans.get(&s.ref_id) {
                    if sigma != t.from_state {
                        s.status = "failed".to_string();
                        return (
                            ExecutionResult {
                                success: false,
                                result_text: None,
                                executed_transitions: executed,
                                failed_step: Some(s.step_id.clone()),
                                errors: vec![format!(
                                    "Transition {}: σ={} does not match from_state={} (AEM).",
                                    t.transition_id, sigma, t.from_state
                                )],
                                after_state_summary: json!({}),
                                aem_codes: vec![AEM_STATE_MISMATCH.to_string()],
                            },
                            plan,
                        );
                    }
                    if let Some(f) = runtime.get(&t.effect_name) {
                        let args = t
                            .arguments
                            .iter()
                            .map(|a| evaluate_expr(a, ctx, runtime))
                            .collect::<Vec<_>>();
                        let _ = f(args, ctx);
                    } else {
                        s.status = "failed".to_string();
                        return (
                            ExecutionResult {
                                success: false,
                                result_text: None,
                                executed_transitions: executed,
                                failed_step: Some(s.step_id.clone()),
                                errors: vec![format!(
                                    "No runtime implementation for transition '{}'.",
                                    t.effect_name
                                )],
                                after_state_summary: json!({}),
                                aem_codes: vec![AEM_EFFECT_REJECT.to_string()],
                            },
                            plan,
                        );
                    }
                    sigma = t.to_state.clone();
                    executed.push(t.transition_id.clone());
                    s.status = "executed".to_string();
                }
            }
            "finish" => {
                if !goal.postconditions.is_empty() {
                    if sigma != "after" {
                        s.status = "failed".to_string();
                        return (
                            ExecutionResult {
                                success: false,
                                result_text: None,
                                executed_transitions: executed,
                                failed_step: Some(s.step_id.clone()),
                                errors: vec![format!(
                                    "Postconditions require σ='after' (current σ={}).",
                                    sigma
                                )],
                                after_state_summary: json!({}),
                                aem_codes: vec![AEM_STATE_MISMATCH.to_string()],
                            },
                            plan,
                        );
                    }
                    for c in &goal.postconditions {
                        let ok = evaluate_expr(&c.expr, ctx, runtime).as_bool().unwrap_or(false);
                        if !ok {
                            s.status = "failed".to_string();
                            return (
                                ExecutionResult {
                                    success: false,
                                    result_text: None,
                                    executed_transitions: executed,
                                    failed_step: Some(s.step_id.clone()),
                                    errors: vec![format!(
                                        "Postcondition '{}' evaluated to false.",
                                        c.condition_id
                                    )],
                                    after_state_summary: json!({}),
                                    aem_codes: vec![AEM_POSTCOND_FALSE.to_string()],
                                },
                                plan,
                            );
                        }
                    }
                }
                s.status = "done".to_string();
            }
            _ => {}
        }
    }
    (
        ExecutionResult {
            success: true,
            result_text: goal.result.clone(),
            executed_transitions: executed,
            failed_step: None,
            errors: vec![],
            after_state_summary: json!({ "guarantees": {}, "reads": [], "writes": [] }),
            aem_codes: vec![],
        },
        plan,
    )
}
