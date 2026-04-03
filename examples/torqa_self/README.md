# TORQA self-description (internal policy)

Specs expressed as TORQA (`.tq` → IR JSON) and consumed by Python (`src/torqa_self/`).

**Grouped map (P17):** [docs/SELF_HOST_MAP.md](../docs/SELF_HOST_MAP.md) · **JSON index:** `torqa --json language --self-host-catalog`

---

## Guidance (suggested_next & report lines)

| Artifact | Role |
|----------|------|
| `cli_onboarding.tq` | Default `suggested_next` prefix (`onboarding_*` slugs + session flow). |
| `cli_onboarding_bundle.json` | Committed IR — **do not hand-edit**; preserve `inputs` order. |
| `cli_surface_project_fail_suffix.tq` | Extra lines when surface/project fails (`surface_fail_*`). |
| `cli_surface_project_fail_suffix_bundle.json` | Committed IR — **do not hand-edit**. |
| `cli_report_suggested_next_order.tq` | Scan order for report-driven lines (`report_next_*`; predicates in Python). |
| `cli_report_suggested_next_order_bundle.json` | Committed IR — **do not hand-edit**. |
| `cli_validate_open_hints.tq` (P26) | Static `suggested_next` tails when `validate` rejects a path (wrong type / bad JSON). |
| `cli_validate_open_hints_bundle.json` | Committed IR — **do not hand-edit**. |

---

## Limits (caps & display)

| Artifact | Role |
|----------|------|
| `cli_suggested_next_merge_cap.tq` | Merged list cap (`sn_merge_cap_*`) + human CLI `Next:` cap (`sn_display_cap_*`). |
| `cli_suggested_next_merge_cap_bundle.json` | Committed IR — **do not hand-edit**. |

---

## Ordering (merge & tie-break)

| Artifact | Role |
|----------|------|
| `cli_suggested_next_merge_order.tq` | Block order (`sn_merge_order_*`) + optional report tie-break (`sn_secondary_report_order_*`). |
| `cli_suggested_next_merge_order_bundle.json` | Committed IR — **do not hand-edit**. |

---

## Language reference (`torqa language`)

| Artifact | Role |
|----------|------|
| `language_reference_taxonomy.tq` | Taxonomy lists (input types, σ states, expr types, operators, formal phases). |
| `language_reference_taxonomy_bundle.json` | Committed IR — **do not hand-edit**. |
| `layered_authoring_passes.tq` | Layered authoring passes (`layer_pass_*`). |
| `layered_authoring_passes_bundle.json` | Committed IR — **do not hand-edit**. |
| `language_reference_rules_prefix.tq` | All seven `rules` lines (`policy_rule_*` order → prose in Python). |
| `language_reference_rules_prefix_bundle.json` | Committed IR — **do not hand-edit**. |
| `language_reference_condition_patterns.tq` | `condition_id_patterns` slug order → dict. |
| `language_reference_condition_patterns_bundle.json` | Committed IR — **do not hand-edit**. |
| `language_reference_prose_refs.tq` | `diagnostics_issue_shape` + `aem_execution` prose (`ref_*`). |
| `language_reference_prose_refs_bundle.json` | Committed IR — **do not hand-edit**. |

---

## Registry & drift

All `( .tq , *_bundle.json )` pairs are listed in `src/torqa_self/bundle_registry.py`. After editing any `.tq` here, regenerate its bundle and run:

```bash
python scripts/validate_self_host_bundles.py
```

(Also covered by `tests/test_torqa_self_bundle_drift.py` in full `pytest`.)

## Regenerate bundles

```bash
torqa surface examples/torqa_self/cli_onboarding.tq --out examples/torqa_self/cli_onboarding_bundle.json
torqa surface examples/torqa_self/cli_surface_project_fail_suffix.tq --out examples/torqa_self/cli_surface_project_fail_suffix_bundle.json
torqa surface examples/torqa_self/cli_report_suggested_next_order.tq --out examples/torqa_self/cli_report_suggested_next_order_bundle.json
torqa surface examples/torqa_self/language_reference_taxonomy.tq --out examples/torqa_self/language_reference_taxonomy_bundle.json
torqa surface examples/torqa_self/layered_authoring_passes.tq --out examples/torqa_self/layered_authoring_passes_bundle.json
torqa surface examples/torqa_self/language_reference_rules_prefix.tq --out examples/torqa_self/language_reference_rules_prefix_bundle.json
torqa surface examples/torqa_self/language_reference_condition_patterns.tq --out examples/torqa_self/language_reference_condition_patterns_bundle.json
torqa surface examples/torqa_self/language_reference_prose_refs.tq --out examples/torqa_self/language_reference_prose_refs_bundle.json
torqa surface examples/torqa_self/cli_suggested_next_merge_cap.tq --out examples/torqa_self/cli_suggested_next_merge_cap_bundle.json
torqa surface examples/torqa_self/cli_suggested_next_merge_order.tq --out examples/torqa_self/cli_suggested_next_merge_order_bundle.json
```

## Python bridges

| Area | Module |
|------|--------|
| Shared bundle read | `src/torqa_self/bundle_io.py` |
| Pair registry + catalog | `src/torqa_self/bundle_registry.py` |
| Onboarding / surface-fail / report lines | `onboarding_ir.py`, `surface_fail_hints_ir.py`, `report_suggested_next_ir.py` |
| Merge + display caps | `suggested_next_merge_cap_ir.py` |
| Merge + secondary order | `suggested_next_merge_order_ir.py` |
| `language_reference_payload` slices | `language_reference_taxonomy_ir.py`, `layered_authoring_passes_ir.py`, `language_reference_rules_ir.py`, `language_reference_condition_patterns_ir.py`, `language_reference_prose_refs_ir.py` |
