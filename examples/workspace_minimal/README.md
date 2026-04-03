# Minimal workspace (F1)

**Start here if you have not installed yet:** [`docs/QUICKSTART.md`](../../docs/QUICKSTART.md).

**More `.tq` patterns:** copy from [`examples/torqa/templates/`](../torqa/templates/) (minimal form, session-only, guarded, full login).

From **repository root**, paths are `examples/workspace_minimal/app.tq` (see root [`README.md`](../../README.md)). From **this directory**, use `app.tq` below.

**1)** Compile `.tq` to IR bundle JSON:

```bash
torqa surface app.tq --out ir_bundle.json
```

**2)** Materialize (idempotent; overwrites same paths):

```bash
torqa project --root . --source ir_bundle.json --out generated_out
```

Or one step from the surface file:

```bash
torqa build app.tq
```

See also [`docs/TORQA_NIHAI_VISION_ROADMAP.md`](../../docs/TORQA_NIHAI_VISION_ROADMAP.md) (F1).
