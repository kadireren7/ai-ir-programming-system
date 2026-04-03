# Validation stress suite

Fixture cases under [`cases/`](cases/) plus [`manifest.json`](manifest.json) prove invalid inputs are **rejected** at the right pipeline stage:

- **Parse** failures never reach validation or projection (`validate_stage_ok` / `project_stage_ok` unset).
- **Validate** failures never complete a successful projection (`project_stage_ok` is not `true`).

Regenerate the summary JSON:

```bash
torqa-validation-gate --repo-root .
```

Output: [`reports/validation_gate.json`](../../reports/validation_gate.json).
