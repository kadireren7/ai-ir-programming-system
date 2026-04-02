# Internal Application Shell (V6.3)

`internal_application_shell.py` provides the first internal testing application layer.

It is intentionally practical and minimal, and is not the final public product UI.

## Scope

- load/create canonical IR into an editor session
- inspect semantic and diagnostics state
- apply edits through editor session APIs only
- preview execution and projection strategy
- run generation to artifacts
- evaluate website threshold pass/fail
- compute checkpoint and Git readiness

## Enforced flow

All shell-driven changes follow:

`shell action -> editor session -> IR mutation -> validation -> previews -> generation`

Direct mutation of generated files is not part of this architecture.

## Shell-visible output domains

- System Manifest
- Capability Registry
- Editor Session Status
- Generation Report
- Website Threshold Result
- Git Checkpoint Readiness
