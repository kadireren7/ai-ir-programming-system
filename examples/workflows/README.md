# Reusable workflow templates (`.tq`)

Small **starting points** for common product patterns. Each file is valid **tq_v1** as-is (`torqa surface <file>.tq`).

Copy one into your package, rename `module` / `intent`, adjust `requires` to your fields, then extend IR (preconditions, transitions, `flow:`) when your projection path needs them.

| Template | Use when |
|----------|-----------|
| [`customer_onboarding.tq`](customer_onboarding.tq) | New account / B2B signup: email, company, role, recorded terms acceptance. |
| [`document_approval.tq`](document_approval.tq) | Policy or contract revision: who approved, which doc + revision, requester traceability. |
| [`approval_flow.tq`](approval_flow.tq) | Pending request → approver decision; tie `request_id` / `approver_id` to your IR. |
| [`intake_form.tq`](intake_form.tq) | Collect several required inputs before success (contact, ticket intake, signup). |
| [`decision_tree.tq`](decision_tree.tq) | Branching over a few discrete inputs (region, tier, feature flags). |

**Rules reminder:** `requires` must list **`password`** for the current surface parser; use other names for real business fields. See [`docs/TQ_AUTHOR_CHEATSHEET.md`](../../docs/TQ_AUTHOR_CHEATSHEET.md).

More starters: [`examples/torqa/templates/`](../torqa/templates/).
