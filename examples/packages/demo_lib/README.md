# demo_lib — shared IR reference example (F5)

This folder documents how a **consuming bundle** can declare **`library_refs`** on the envelope.

- **Machine contract:** optional `library_refs` entries are validated by `validate_bundle_envelope` (name, version, optional fingerprint). See [`docs/CORE_SPEC.md`](../../../docs/CORE_SPEC.md) and [`spec/IR_BUNDLE.schema.json`](../../../spec/IR_BUNDLE.schema.json).
- **Link-time merge** of external IR libraries is **not** fully automated in this repo yet; refs are **metadata** for tooling and ecosystem alignment.

Example consumer: [`examples/core/consumes_torqa_demo_lib.json`](../../core/consumes_torqa_demo_lib.json).
