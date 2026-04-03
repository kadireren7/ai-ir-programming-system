# Task: multi-step logic (branching inputs)

## Natural language description

Author a flow called “branchy flow” where the user signs in and provides two categorical inputs: `region` and `plan_tier`. Routing or policy may depend on these values in a full implementation; for this benchmark the contract only requires that both are present and validated after authentication, and that the flow completes in a named routed state.

## Expected behavior

- Required inputs: `username`, `password`, `region`, `plan_tier`.
- Password verification must succeed for the given username.
- `region` and `plan_tier` must exist as inputs before completion.
- Terminal result name equivalent to “Routed”.
