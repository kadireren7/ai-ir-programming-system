# AI output → TORQA validate → accept / reject

Treat model-generated **`.tq`** or **bundle JSON** as untrusted input. TORQA either **accepts** (parse + diagnostics OK, then you may `project`) or **rejects** at **parse**, **validate**, or **project**.

## Safe acceptance

Example “good” surface (valid tq_v1):

- [`accepted/model_suggested_login.tq`](accepted/model_suggested_login.tq)

```bash
torqa surface examples/ai_output_validation/accepted/model_suggested_login.tq --out /tmp/ai_bundle.json
# exit code 0 when parse + diagnostics are clean
```

Then optional materialization:

```bash
torqa project --root . --source examples/ai_output_validation/accepted/model_suggested_login.tq --out /tmp/out --engine-mode python_only
```

## Rejection cases

| Fixture | Typical AI mistake | Fails at |
|---------|-------------------|----------|
| [`rejected/tq_omit_password.tq`](rejected/tq_omit_password.tq) | Omits `password` from `requires` | **parse** (`PX_TQ_MISSING_PASSWORD`) |
| [`rejected/tq_missing_result_before_flow.tq`](rejected/tq_missing_result_before_flow.tq) | Skips `result` before `flow:` | **parse** |
| [`rejected/json_extra_top_level_key.json`](rejected/json_extra_top_level_key.json) | Hallucinated top-level key on IR bundle | **validate** (envelope) |

```bash
torqa surface examples/ai_output_validation/rejected/tq_omit_password.tq
# exits 1; stderr shows TORQA parse/diagnostic guidance

torqa validate examples/ai_output_validation/rejected/json_extra_top_level_key.json
# exits non-zero; bundle shape rejected before a clean project path
```

## JSON bundles from the model

For **dict-shaped** proposals (already JSON), use the same validation stack as the CLI: envelope + IR + diagnostics. The repo helper [`src/evolution/ai_proposal_gate.py`](../../src/evolution/ai_proposal_gate.py) (`evaluate_ai_proposal`) returns `rejected` and `reasons` without writing artifacts.

## More fixtures

- Broad gate proof: [`examples/benchmark_flagship/gate_invalid/`](../benchmark_flagship/gate_invalid/) + [`docs/VALIDATION_GATE.md`](../../docs/VALIDATION_GATE.md).
