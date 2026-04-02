# Git Checkpoint Readiness (V6.3)

`validate_git_checkpoint_readiness(...) -> list[str]`

Returns blocking errors for checkpoint publication.
An empty list means checkpoint is ready for human-reviewed commit/push.

## Checks

- website success gate passed
- no fatal orchestrator consistency issue
- no unresolved fatal diagnostics
- canonical docs present
- cleanup/deprecation state recorded
- generated artifacts tracking-vs-ignored policy explicitly declared

## Push policy

- The system does not push automatically.
- Push remains human-approved.
- A **generated** `checkpoint_push_readiness.md` in the **current working directory** (from internal tooling) summarizes the current recommendation when applicable.
  - `github_push_recommended = true` only when the gate and readiness checks pass.
- A **historical** repo snapshot lived at `docs/checkpoint_push_readiness.md`; it is archived under [`archive/precursor_and_plans/checkpoint_push_readiness.md`](archive/precursor_and_plans/checkpoint_push_readiness.md). Live policy: [`CHECKPOINT_POLICY.md`](CHECKPOINT_POLICY.md).
