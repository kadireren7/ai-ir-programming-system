# Benchmark task: Simple form flow

## Natural language description

A user-facing flow collects a small set of required fields (for example: name, email, and a short message), validates them at submission time, and either accepts the submission or returns clear validation errors without persisting invalid data. After a successful submission, the user sees a confirmation state. The system must not store or forward the payload until all required fields pass basic checks (non-empty where required, email in a plausible format).

## Expected behavior summary

- **Inputs:** At least three fields; all marked required must be present and non-blank before success.
- **Validation gate:** Invalid submissions are rejected; no side effects (no persistence, no downstream calls) occur on reject.
- **Success path:** On valid submission, the user enters a **confirmed** state; the system records or acknowledges the payload exactly once (idempotent submit behavior is not required unless you extend the task).
- **Observability:** Distinguishable outcomes: validation error vs success confirmation.
