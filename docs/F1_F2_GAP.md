# F1–F2 status vs repo (F0.3)

Cross-check with [`TORQA_NIHAI_VISION_ROADMAP.md`](TORQA_NIHAI_VISION_ROADMAP.md).

## Already satisfied (partial F1)

| Roadmap intent | In-repo |
|----------------|---------|
| Compile `.tq` → IR | `torqa surface`, `parse_tq.py`, `/api/compile-tq` |
| Validate / lint | `torqa validate`, `torqa bundle-lint`, `build_full_diagnostic_report` |
| Write generated tree | `torqa project` with `--root`, `--source`, `--out`; `src/project_materialize.py` |
| CI webapp smoke | `scripts/ci_build_generated_webapp.py` (golden JSON → npm build) |
| Demo emit | `torqa demo emit` |

## Gaps closed in this iteration

- **F1** explicit `examples/workspace_minimal/` + README two-command flow.
- **F1** JSON contract `written` / `errors` on `torqa project`.
- **F2** `docs/PACKAGE_SPLIT.md`, optional `[preview-web]` extra (placeholder), `src/torqa_public.py`.
- **F3** zip download API (no arbitrary server paths): `POST /api/materialize-project-zip`.
- **F4** `CHANGELOG.md`, `docs/WEBUI_SECURITY.md`, path sanitization tests.
- **F5** `examples/packages/demo_lib/` + consuming bundle test.

## Remaining optional work

- Split packages on PyPI (`torqa-core` vs `torqa-preview-web`) as separate distributions.
- Desktop/web polish (full “Project mode” UI parity with CLI).
