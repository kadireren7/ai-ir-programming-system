# TORQA — current maturity

**What is real:** Canonical IR interchange (v1.4), Python + Rust verification/execution, orchestrator, multi-target codegen (TORQA.web / TORQA.db–style projections today), golden tests, diagnostics with formal phases, web console (Monaco), CLI (`torqa`), patch preview, system health report, CI, bundle envelope checks, 1.3→1.4 migration, transitional `.pxir` surface subset, optional `library_refs`, third-party projection env hook (`TORQA_PROJECTION_MODULE`).

**What is partial:** Native `.tq` parser pipeline vs JSON IR, Rust toolchain on all dev machines, execution trace richness, full editor session/undo, enterprise security, deep multi-domain projection families.

**What is experimental:** Self-evolution modules, syntax surface toward `.tq`, aggressive legacy removal.

**Next milestone (recommended):** `.tq` parse path toward canonical model; harden website projection + generation quality gates; expand golden tests around `check` and parity; optional self-hosted Monaco assets.

See `README.md` for positioning and `ROADMAP.md` for staged direction.
