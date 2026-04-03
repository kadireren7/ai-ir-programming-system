# Benchmark task: Approval workflow

## Natural language description

A request (e.g. expense, access grant, or content change) is created in a **pending** state. A designated **approver** must explicitly approve or reject it. While pending, the request cannot take effect. If approved, the request moves to an **active** or **applied** state and downstream effects may run. If rejected, it moves to a **rejected** terminal state with a reason; no downstream effects run. Only users in the approver role may change the decision from pending.

## Expected behavior summary

- **States:** At minimum `pending`, `approved`, `rejected` (names may vary; semantics must match).
- **Guards:** No transition to “applied” or equivalent without approval; reject is terminal for that request.
- **Authorization:** Non-approvers cannot approve or reject.
- **Audit-friendly:** Final decision is unambiguous and attributable (who decided is in scope if your comparator includes identity; otherwise at least **what** was decided and **when**).
