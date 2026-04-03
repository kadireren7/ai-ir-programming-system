# Task: simple form flow

## Natural language description

Build a user-facing flow named “contact submit”. The user must provide a username, a password, and an email address before the flow can complete. The system must verify that the username is acceptable and that the password matches the account for that username (standard login-style checks). When all inputs are present and valid, the flow completes with an explicit outcome indicating the submission was accepted.

## Expected behavior

- Required inputs: `username`, `password`, `email` (all must exist before completion).
- Preconditions: username verification and password verification against the username must succeed.
- Terminal result: a single named completion state equivalent to “Submitted” for a successful contact submission.
- No additional side effects or branches are required beyond this minimal contract.
