"""
Stable machine-readable diagnostic codes for tooling, CI, and AI repair loops.
Messages remain human-readable; codes are stable identifiers.
"""

from __future__ import annotations

# Structural / IR integrity (validate_ir)
PX_IR_GOAL_EMPTY = "PX_IR_GOAL_EMPTY"
PX_IR_INPUT_DUPLICATE = "PX_IR_INPUT_DUPLICATE"
PX_IR_INPUT_TYPE = "PX_IR_INPUT_TYPE"
PX_IR_PRECONDITION_KIND = "PX_IR_PRECONDITION_KIND"
PX_IR_PRECONDITION_ID = "PX_IR_PRECONDITION_ID"
PX_IR_FORBID_KIND = "PX_IR_FORBID_KIND"
PX_IR_FORBID_ID = "PX_IR_FORBID_ID"
PX_IR_POSTCONDITION_KIND = "PX_IR_POSTCONDITION_KIND"
PX_IR_POSTCONDITION_ID = "PX_IR_POSTCONDITION_ID"
PX_IR_CONDITION_ID_COLLISION = "PX_IR_CONDITION_ID_COLLISION"
PX_IR_TRANSITION_ID = "PX_IR_TRANSITION_ID"
PX_IR_TRANSITION_DUPLICATE = "PX_IR_TRANSITION_DUPLICATE"
PX_IR_TRANSITION_STATE = "PX_IR_TRANSITION_STATE"
PX_IR_METADATA = "PX_IR_METADATA"
PX_IR_EXPR = "PX_IR_EXPR"
PX_IR_SEMANTIC_DETERMINISM = "PX_IR_SEMANTIC_DETERMINISM"
PX_IR_CANONICAL_ORDER = "PX_IR_CANONICAL_ORDER"
PX_IR_TRANSITION_AMBIGUOUS = "PX_IR_TRANSITION_AMBIGUOUS"

# Handoff (ASCII / operator constraints)
PX_HANDOFF = "PX_HANDOFF"

# Semantic verifier
PX_SEM_UNKNOWN_FUNCTION = "PX_SEM_UNKNOWN_FUNCTION"
PX_SEM_ARITY = "PX_SEM_ARITY"
PX_SEM_TYPE = "PX_SEM_TYPE"
PX_SEM_UNDEFINED_IDENT = "PX_SEM_UNDEFINED_IDENT"
PX_SEM_FORBID_GUARANTEE = "PX_SEM_FORBID_GUARANTEE"
PX_SEM_TRANSITION_READ = "PX_SEM_TRANSITION_READ"
PX_SEM_UNKNOWN_EFFECT = "PX_SEM_UNKNOWN_EFFECT"
PX_SEM_LOGICAL_OPERAND = "PX_SEM_LOGICAL_OPERAND"
PX_SEM_COMPARISON = "PX_SEM_COMPARISON"

# External / transport
PX_SCHEMA_INVALID = "PX_SCHEMA_INVALID"
PX_PARSE_FAILED = "PX_PARSE_FAILED"
PX_AI_NO_KEY = "PX_AI_NO_KEY"
PX_AI_HTTP = "PX_AI_HTTP"
PX_AI_JSON = "PX_AI_JSON"
PX_AI_MAX_RETRIES = "PX_AI_MAX_RETRIES"

# Mutation API
PX_MUTATION_UNSUPPORTED = "PX_MUTATION_UNSUPPORTED"
PX_MUTATION_INVALID = "PX_MUTATION_INVALID"
PX_MUTATION_BATCH = "PX_MUTATION_BATCH"


def classify_message(message: str) -> str:
    """Best-effort mapping from legacy string errors to stable codes."""
    m = message
    if "goal must be a non-empty" in m:
        return PX_IR_GOAL_EMPTY
    if "input names must be unique" in m:
        return PX_IR_INPUT_DUPLICATE
    if "has type_name" in m and "not in allowed set" in m:
        return PX_IR_INPUT_TYPE
    if "preconditions[" in m and "must have kind 'require'" in m:
        return PX_IR_PRECONDITION_KIND
    if "preconditions[" in m and "condition_id must match c_req_" in m:
        return PX_IR_PRECONDITION_ID
    if "forbids[" in m and "must have kind 'forbid'" in m:
        return PX_IR_FORBID_KIND
    if "forbids[" in m and "condition_id must match c_forbid_" in m:
        return PX_IR_FORBID_ID
    if "postconditions[" in m and "must have kind 'postcondition'" in m:
        return PX_IR_POSTCONDITION_KIND
    if "postconditions[" in m and "condition_id must match c_post_" in m:
        return PX_IR_POSTCONDITION_ID
    if "condition_id values must be globally unique" in m:
        return PX_IR_CONDITION_ID_COLLISION
    if "transition_id must match t_" in m:
        return PX_IR_TRANSITION_ID
    if "transition_id values must be unique" in m:
        return PX_IR_TRANSITION_DUPLICATE
    if "from_state must be 'before' or 'after'" in m or "to_state must be 'before'" in m:
        return PX_IR_TRANSITION_STATE
    if "metadata must include" in m or "metadata ir_version must be" in m:
        return PX_IR_METADATA
    if "Semantic determinism:" in m:
        return PX_IR_SEMANTIC_DETERMINISM
    if "must be ascending by numeric suffix" in m or "must be ascending by transition_id" in m:
        return PX_IR_CANONICAL_ORDER
    if "at most one transition may go from" in m and "before" in m and "after" in m:
        return PX_IR_TRANSITION_AMBIGUOUS
    if m.startswith("Handoff:"):
        return PX_HANDOFF
    if "unknown function" in m:
        return PX_SEM_UNKNOWN_FUNCTION
    if "wrong arity" in m:
        return PX_SEM_ARITY
    if "type mismatch" in m:
        return PX_SEM_TYPE
    if "undefined identifier" in m:
        return PX_SEM_UNDEFINED_IDENT
    if "without a before-state guarantee" in m and "forbid" in m:
        return PX_SEM_FORBID_GUARANTEE
    if "read by transition" in m and "no before-state guarantee" in m:
        return PX_SEM_TRANSITION_READ
    if "unknown effect" in m:
        return PX_SEM_UNKNOWN_EFFECT
    if "logical" in m and "operand must be boolean" in m:
        return PX_SEM_LOGICAL_OPERAND
    if "comparison type mismatch" in m:
        return PX_SEM_COMPARISON
    if "unknown IR expression" in m or "Unsupported mutation_type" in m:
        return PX_IR_EXPR
    return "PX_UNSPECIFIED"


def annotate(messages: list[str], *, phase: str) -> list[dict]:
    return [{"code": classify_message(msg), "phase": phase, "message": msg} for msg in messages]
