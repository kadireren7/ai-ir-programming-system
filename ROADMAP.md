# TORQA roadmap (honest)

**Asıl fikir (kuzey yıldızı):** [`docs/TORQA_VISION_NORTH_STAR.md`](docs/TORQA_VISION_NORTH_STAR.md).

1. **Website milestone** — Baseline done: `tests/test_website_generation_gate.py` + CI `scripts/ci_build_generated_webapp.py` (`npm install` + `npm run build` on materialized `generated/webapp`) — early **TORQA.web** projection path. **Kotlin stub** — `generated/kotlin/Main.kt` via `generate_stub_artifact` when strategy selects `kotlin` (`tests/test_kotlin_stub.py`).
2. ~~**Parity**~~ — `tests/test_engine_parity_ci.py` runs in the **rust** CI job after `cargo test` (golden `valid_minimal_flow`); local run skips if the bridge is unavailable.
3. ~~**Patch UX**~~ — Web console: **Patch preview** tab + **Preview patch** button (`POST /api/preview-patch`); CLI had `preview-patch` already.
4. ~~**Execution traces (baseline)**~~ — `execution_trace` on `/api/run` and `torqa guided`: enriched step summaries (`summary`, `effect_name`); Python fallback uses `ir_execution_plan_to_json`. Web **Trace** tab.
5. **IR migration** — `migrate_ir_bundle` for documented jumps (e.g. 1.3→1.4); future bumps as the core evolves.

**Recently shipped:** `torqa guided` (diagnostics → full pipeline JSON), `docker-compose` + `Dockerfile` for the web console, shared `build_console_run_payload` (`src/orchestrator/pipeline_run.py`), golden `valid_start_session_flow.json`, `src/execution/trace_pack.py`, website gate + trace UI tests, **`.tq` illustrative syntax** under `examples/torqa/`.

See `docs/IMPLEMENTATION_STATUS.md` and `STATUS.md`.

**AI-native vision (non-normative):** [`docs/AI_NATIVE_LANGUAGE_CHARTER.md`](docs/AI_NATIVE_LANGUAGE_CHARTER.md) — goals and boundaries; normative wire contract remains [`docs/CORE_SPEC.md`](docs/CORE_SPEC.md).

**Specification stack (formal + ops):** [`docs/FORMAL_CORE.md`](docs/FORMAL_CORE.md) (single law + validation phases), [`docs/AEM_SPEC.md`](docs/AEM_SPEC.md) (abstract machine), [`docs/SELF_EVOLUTION_PIPELINE.md`](docs/SELF_EVOLUTION_PIPELINE.md) (evolution / policy), [`docs/AI_GENERATION_PROFILE.md`](docs/AI_GENERATION_PROFILE.md) (LLM profile; wired in `authoring_prompt.py`). Table and ordering: `CORE_SPEC.md` § *Specification stack*.

**Implemented hooks:** Diagnostics issues carry **`formal_phase`** (`src/diagnostics/formal_phases.py`); Python + Rust executors enforce AEM **σ** + **`aem_codes`**; `torqa proposal-gate FILE` runs `src/evolution/ai_proposal_gate.py` (envelope + diagnostics + light secret scan).

**Nihai vizyon (TORQA-öncelikli ürün + ayrı önizleme paketi):** [`docs/TORQA_NIHAI_VISION_ROADMAP.md`](docs/TORQA_NIHAI_VISION_ROADMAP.md) — fazlar **F0–F5**, her fazda bitirişe kilitlenen **prompt listesi**.

---

## Desktop “Cursor-style” IDE (folder + prompt + project) — *not shipped today*

**What exists now**

- **Web console** (`torqa-console` / Docker): browser UI, Monaco JSON editor, examples, Run, AI suggest (server needs `OPENAI_API_KEY`), no native “pick a folder on disk” workflow.
- **CLI**: `torqa demo` / `torqa demo emit`, `project`, `guided`, `ai-suggest` — all path-based; no bundled graphical installer or VS Code–class shell.

**Gap vs a downloadable Cursor-like product**

| Capability | Today | Typical target |
|------------|--------|----------------|
| Installable desktop app (.exe / .dmg) | No | Electron / Tauri + auto-update |
| Workspace = arbitrary local folder | Partial (CLI paths only) | File tree, `File > Open Folder` |
| Prompt → IR → files in that folder | Partial (`demo`/`project` to `--out`) | One-click “Generate into workspace” + diff preview |
| LSP / diagnostics in editor | No | Extension or embedded Monaco + language server for IR/Kural |
| Offline-first AI | IR pipeline yes; `ai-suggest` needs API key | Optional local model / Ollama path |

**Suggested phases (if you prioritize this)**

1. **MVP shell** — Tauri or Electron: embed `torqa-console` or static build + spawn local FastAPI; “Open folder” → set `PROJECT_ROOT`, list `.json` bundles, run `torqa project` into `generated/` under that root.
2. **Prompt UX** — Single panel: natural language → `ai-suggest` → show diff → apply to `ir_goal.json`; reuse patch preview APIs.
3. **Polish** — Auto-open generated Vite app, session/undo, settings for model endpoint (not only OpenAI).

**Bottom line:** *Şu an* bilgisayara “Cursor gibi” tek paket indirip klasör seçerek tam o deneyimi **yapmıyor**; teknik olarak **yapılabilir** çünkü motor ve HTTP/CLI yüzeyleri hazır — eksik olan ürün kabuğu (masaüstü + dosya workspace modeli + akış birleştirme).

---

## How “independent language” is the core IR? — maturity ladder

**Already independent of any vendor model**

- **Truth = canonical JSON IR** + `validate_ir` / handoff / semantics / diagnostics codes.
- **Execution + projections** run without OpenAI; LLM is optional *proposal* path only.

**Still dependent on ecosystem / representation**

| Dimension | Maturity | What “full independence” would add |
|-----------|----------|-------------------------------------|
| **Notation** | High for *data* (JSON IR), low for *human* syntax | Optional text/Kural surface with formal grammar → same IR |
| **Verifier authority** | Python + Rust path; CI parity | Rust-only or formally specified semantics doc = single law |
| **Builtin / stdlib** | Small registry (`ir_semantics`) | Versioned stdlib, domains (payments, auth, …) with golden tests each |
| **Tooling** | CLI + web + Docker | Installable IDE, LSP, formatter, package registry (optional) |
| **Self-hosting** | Scaffold (`self_hosting` modules) | Pipeline described in IR and emitted by same codegen (long arc) |

**Rough progression**

1. **v1.3** — Verifier-first IR, multi-surface codegen, AI formalization behind the same wall. *(done)*  
2. **v1.4+** — Real migrations (1.3→1.4), larger stdlib (`strings_equal`, …), Rust parity path in CI; canonical `ir_version` is **1.4**. *(in repo)*  
3. **“Language” in the usual sense** — Canonical **`.tq`** (`examples/torqa/`); transitional `.pxir` (`src/surface/parse_pxir.py`), CLI `torqa surface`, VS Code grammar under `editors/vscode-torqa/`. *(subset + editor grammar; LSP/formatter still future)*  
4. **Ecosystem** — Third-party projection hook (`TORQA_PROJECTION_MODULE`), optional `library_refs` on bundles + envelope validation. *(hooks + schema; full package registry still future)*

Use this section with `STATUS.md` for honest “where we are” messaging to users and investors.
