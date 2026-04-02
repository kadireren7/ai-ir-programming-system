# Deprecation map

| Item | Status | Replacement |
|------|--------|-------------|
| `compat/*.py` legacy shims | **shim** | Import from `src.*` (or `compat.<name>` only if you must keep old module names) |
| `CoreGoal` execution path in `kural_parser` | **transitional** | IR-native pipeline |
| Python as sole semantic authority | **deprecated** | Rust-preferred per `rust_dominance_status` |

Precursor **Kural v0** notes, old rust migration drafts, and one-off reports were moved to [`docs/archive/precursor_and_plans/`](archive/precursor_and_plans/) (see [`archive/INDEX.md`](archive/INDEX.md)); they are not current TORQA normative docs.

Nothing listed here is removed without a tracked migration; see `docs/archive/v4_cleanup_and_deprecation_plan.md` for history.
