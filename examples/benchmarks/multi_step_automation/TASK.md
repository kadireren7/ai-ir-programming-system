# Task: small automation (multi-step signup)

## Natural language description

Specify a compact “signup automation” that starts from authenticated credentials and completes when the automation chain is done. In a full product this might include email verification, profile creation, and default settings; here the contract only requires username/password gates and a single terminal completion marker for the automation.

## Expected behavior

- Required inputs: `username`, `password`.
- Standard username and password verification apply before completion.
- Terminal result equivalent to “AutomationComplete”.
- Additional steps are out of scope for this minimal benchmark surface.
