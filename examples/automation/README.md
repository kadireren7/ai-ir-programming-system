# Automation sketches (minimal TORQA)

In **tq_v1**, `flow:` allows at most:

1. `create session`
2. One `emit login_success` line (optional `when <ident>`)

That is the full **step chain** the surface can express today. **Condition-based branching** is the `emit login_success when <ident>` guard: the emit is tied to a binding in `requires`.

Longer automation (many steps, richer branches) belongs in **IR** (`transitions`, conditions) after projection; these files stay minimal and valid `.tq`.

| File | Idea |
|------|------|
| `two_step_chain.tq` | Sequential: session then unconditional audit emit. |
| `gated_second_step.tq` | Same chain; `emit login_success when run_audit` (needs `ip_address` in `requires` per parser). |
