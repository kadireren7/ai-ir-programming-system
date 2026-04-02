# Minimal workspace (F1)

From **repository root**, paths are `examples/workspace_minimal/app.tq` (see root [`README.md`](../../README.md) Happy path). From **this directory**, use `app.tq` below.

**1)** Compile `.tq` to IR bundle JSON:

```bash
torqa surface app.tq --out ir_bundle.json
```

**2)** Materialize (idempotent; overwrites same paths):

```bash
torqa project --root . --source ir_bundle.json --out generated_out --engine-mode python_only
```

Or one step from the surface file:

```bash
torqa project --root . --source app.tq --out generated_out --engine-mode python_only
```

See also [`docs/TORQA_NIHAI_VISION_ROADMAP.md`](../../docs/TORQA_NIHAI_VISION_ROADMAP.md) (F1).
