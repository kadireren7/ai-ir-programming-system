# Benchmark task: Document approval

## Natural language description

A **document** (policy, contract, or spec) at a named **revision** must be **approved** before publication or distribution. A **requester** initiates the flow; a designated **approver** records a decision. **Locked** or inactive approver accounts must not complete approval. The system keeps enough identifiers to trace **which document**, **which revision**, **who approved**, and **who requested** the change.

## Expected behavior summary

- **Identity of artifact:** `document_id` + `revision` must be explicit in the modeled inputs.
- **Separation of roles:** Requester and approver are distinct principals in scope for this task description.
- **Guard:** Account lock / frozen approver is forbidden from completing the path (mirror `forbid locked` in the surface).
