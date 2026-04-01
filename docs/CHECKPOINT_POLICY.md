# Checkpoint policy

Internal checkpoints (see `build_system_health_report` → `checkpoints`):

- `diagnostics_ok` — structural + handoff + determinism + semantic errors clear
- `semantic_ok` — semantic report
- `artifact_validation_ok` — `validate_generated_artifacts`
- `website_threshold_passed` — `can_generate_simple_website`
- `orchestrator_consistency_clean` — projection graph vs artifacts

CLI `TORQA check` exits `0` only if **all** are true; otherwise `3`.

Use for local gates before treating a bundle as “application-ready” internally—not as production SLA.
