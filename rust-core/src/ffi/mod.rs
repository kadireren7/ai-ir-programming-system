use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::execution::evaluator::{default_reference_runtime, execute, ExecutionResult, RuntimeMap};
use crate::execution::planner::build_execution_plan;
use crate::execution::runtime::ExecutionContext;
use crate::ir::goal::IrGoalEnvelope;
use crate::ir::normalize::{compute_ir_fingerprint, normalize_ir_goal};
use crate::ir::validate::validate_ir;
use crate::semantics::guarantees::build_guarantee_table;
use crate::semantics::symbol_table::build_symbol_table;
use crate::projection::strategy::{choose_projection_targets, ProjectionPlan};
use crate::semantics::verifier::validate_semantics;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RustCoreReport {
    pub ir_valid: bool,
    pub validation_errors: Vec<String>,
    pub semantic_errors: Vec<String>,
    pub semantic_warnings: Vec<String>,
    pub fingerprint: Option<String>,
    pub projection_plan: ProjectionPlan,
    pub semantic_report: Value,
    pub execution_plan: Option<Value>,
    pub execution_result: Option<ExecutionResult>,
}

pub fn run_rust_pipeline(ir_bundle_json: &str) -> Result<Value, String> {
    let v: Value = serde_json::from_str(ir_bundle_json).map_err(|e| e.to_string())?;
    let action = v
        .get("action")
        .and_then(|x| x.as_str())
        .unwrap_or("full_pipeline");
    let ir_goal_v = v
        .get("ir")
        .and_then(|x| x.get("ir_goal"))
        .cloned()
        .ok_or_else(|| "Missing ir.ir_goal in bundle".to_string())?;
    let env = IrGoalEnvelope { ir_goal: serde_json::from_value(ir_goal_v).map_err(|e| e.to_string())? };
    let n = normalize_ir_goal(&env.ir_goal);
    let val_errors = validate_ir(&n);
    let (sem_errors, sem_warns) = validate_semantics(&n);
    let plan = choose_projection_targets(&n, &sem_errors, &sem_warns);
    let sem_report = build_semantic_report(&n, &sem_errors, &sem_warns);
    let fp = compute_ir_fingerprint(&n).ok();
    let context = parse_context(v.get("context"));
    let exec_plan_pending = build_execution_plan(&n);
    let (exec_plan_value, exec) = if val_errors.is_empty() && sem_errors.is_empty() {
        let mut ctx = ExecutionContext::new(context.inputs);
        ctx.world_state = context.world_state;
        let runtime: RuntimeMap = default_reference_runtime();
        let (res, final_plan) = execute(&n, &mut ctx, &runtime);
        (json!(final_plan), Some(res))
    } else {
        (json!(exec_plan_pending), None)
    };

    if action == "validate_ir" {
        return Ok(json!({
            "ir_valid": val_errors.is_empty(),
            "validation_errors": val_errors,
            "fingerprint": fp,
        }));
    }
    if action == "semantic_report" {
        return Ok(json!({
            "ir_valid": val_errors.is_empty(),
            "validation_errors": val_errors,
            "semantic_errors": sem_errors,
            "semantic_warnings": sem_warns,
            "semantic_report": sem_report,
            "fingerprint": fp,
        }));
    }
    if action == "execute_ir" {
        return Ok(json!({
            "ir_valid": val_errors.is_empty(),
            "validation_errors": val_errors,
            "semantic_errors": sem_errors,
            "semantic_warnings": sem_warns,
            "execution_plan": exec_plan_value.clone(),
            "execution_result": exec,
            "fingerprint": fp,
        }));
    }

    serde_json::to_value(RustCoreReport {
        ir_valid: val_errors.is_empty(),
        validation_errors: val_errors,
        semantic_errors: sem_errors,
        semantic_warnings: sem_warns,
        fingerprint: fp,
        projection_plan: plan,
        semantic_report: sem_report,
        execution_plan: Some(exec_plan_value),
        execution_result: exec,
    })
    .map_err(|e| e.to_string())
}

#[derive(Default)]
struct ParsedContext {
    inputs: std::collections::HashMap<String, Value>,
    world_state: std::collections::HashMap<String, Value>,
}

fn parse_context(v: Option<&Value>) -> ParsedContext {
    let mut out = ParsedContext::default();
    if let Some(obj) = v.and_then(|x| x.as_object()) {
        if let Some(inputs) = obj.get("inputs").and_then(|x| x.as_object()) {
            for (k, val) in inputs {
                out.inputs.insert(k.clone(), val.clone());
            }
        }
        if let Some(world) = obj.get("world_state").and_then(|x| x.as_object()) {
            for (k, val) in world {
                out.world_state.insert(k.clone(), val.clone());
            }
        }
    }
    out
}

fn build_semantic_report(
    goal: &crate::ir::goal::IrGoal,
    errors: &Vec<String>,
    warnings: &Vec<String>,
) -> Value {
    let symbol_table = build_symbol_table(goal).unwrap_or_default();
    let gtable = build_guarantee_table(goal);
    let mut before = serde_json::Map::new();
    let mut after = serde_json::Map::new();
    if let Some(m) = gtable.get("before") {
        for (k, v) in m {
            before.insert(k.clone(), json!(v.iter().map(|g| {
                json!({
                    "identifier": g.identifier,
                    "state": g.state,
                    "guarantee_type": g.kind,
                    "source_id": g.source_id,
                    "equals_value": Value::Null
                })
            }).collect::<Vec<_>>()));
        }
    }
    if let Some(m) = gtable.get("after") {
        for (k, v) in m {
            after.insert(k.clone(), json!(v.iter().map(|g| {
                json!({
                    "identifier": g.identifier,
                    "state": g.state,
                    "guarantee_type": g.kind,
                    "source_id": g.source_id,
                    "equals_value": Value::Null
                })
            }).collect::<Vec<_>>()));
        }
    }
    json!({
        "symbol_table": symbol_table,
        "guarantee_table": {
            "before": before,
            "after": after
        },
        "errors": errors,
        "warnings": warnings,
        "semantic_ok": errors.is_empty()
    })
}
