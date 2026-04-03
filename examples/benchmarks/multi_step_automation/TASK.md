# Benchmark task: Small multi-step automation

## Natural language description

An automation runs a short sequence of steps triggered by a single user or system event (e.g. “new signup”). Steps might include: create a profile record, send a welcome notification, and register a default preference. If any step fails, the automation stops; earlier successful steps may already have occurred (partial completion is allowed unless you specify compensations). The order of steps is fixed in the spec.

## Expected behavior summary

- **Ordering:** Steps execute in the declared order when the trigger fires.
- **Failure:** On failure at step *k*, steps *k+1…n* do not run; the failure is reported.
- **Success:** On full success, all *n* steps complete and the final state reflects all effects (e.g. profile exists, notification queued, preference set).
- **Trigger:** Exactly one entry point starts the chain for a given automation id (no duplicate concurrent runs required unless you extend the task).
