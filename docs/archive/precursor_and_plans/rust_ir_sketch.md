# Rust IR sketch (documentation only)

Recommended shapes for a future Rust engine mirroring `canonical_ir.py`. This is **not** compiled code in this repository; it guides implementation of `rust-core/src/ir/`.

## Type mapping (from Python `ir_type_to_rust`)

- `text` → `String`
- `number` → `i64` (see `rust_core_blueprint.md`; fractional literals are rejected at handoff for now)
- `boolean` → `bool`
- `void` → unit `()`
- `unknown` → placeholder enum, e.g. `IrUnknown`

## Suggested enums and structs

```rust
/// Canonical semantic / input type labels (IR contract).
#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub enum IrType {
    Text,
    Number,
    Boolean,
    Void,
    Unknown,
}

/// Placeholder for unresolved or bound-input typing.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum IrUnknown {}

#[derive(Clone, Debug, PartialEq)]
pub enum IrExpr {
    Identifier {
        name: String,
        semantic_type: Option<IrType>,
    },
    StringLiteral {
        value: String,
    },
    NumberLiteral {
        value: i64,
    },
    BooleanLiteral {
        value: bool,
    },
    Call {
        name: String,
        arguments: Vec<IrExpr>,
    },
    Binary {
        left: Box<IrExpr>,
        operator: String,
        right: Box<IrExpr>,
    },
    Logical {
        left: Box<IrExpr>,
        operator: String,
        right: Box<IrExpr>,
    },
}

#[derive(Clone, Debug, PartialEq)]
pub struct IrInput {
    pub name: String,
    pub type_name: IrType, // or String if you prefer loose coupling to JSON first
}

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub struct IrCondition {
    pub condition_id: String, // e.g. c_req_0001, c_forbid_0001, c_post_0001
    pub kind: String,        // "require" | "forbid" | "postcondition"
    pub expr: IrExpr,
}

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub struct IrTransition {
    pub transition_id: String, // e.g. t_0001
    pub effect_name: String,
    pub arguments: Vec<IrExpr>,
    pub from_state: String,
    pub to_state: String,
}

#[derive(Clone, Debug, PartialEq)]
pub struct IrGoal {
    pub goal: String,
    pub inputs: Vec<IrInput>,
    pub preconditions: Vec<IrCondition>,
    pub forbids: Vec<IrCondition>,
    pub transitions: Vec<IrTransition>,
    pub postconditions: Vec<IrCondition>,
    pub result: Option<String>,
    pub metadata: std::collections::BTreeMap<String, String>,
}
```

Use `serde` with `rename_all = "snake_case"` where JSON field names must match the Python `ir_goal_to_json` output. Stronger typing for `IrCondition.kind` and state names (`before` / `after`) can replace `String` once the schema is frozen.

## Bundle wrapper (handoff root)

The Rust side should deserialize the full bundle:

- `bundle_version`
- `ir` → nested `ir_goal`
- `validation` → `ir_valid`, `errors`
- `metadata` → Rust handoff metadata (`target_core`, `design_intent`, etc.)

This matches `export_ir_bundle()` in Python.
