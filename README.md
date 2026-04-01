# TORQA

**AI-native core language for software systems.**

TORQA is not a language for imitating human code. It is a **semantic-first core language for AI-built systems** — a canonical representation layer where **explicit semantics, validation, and deterministic structure** take precedence over syntax-shaped imperative text.

---

## 1. Title and identity

| | |
|--|--|
| **Project** | TORQA |
| **Language** | TORQA |
| **Canonical artifact extension** | `.tq` |
| **Positioning** | TORQA is an **AI-native core language for building software systems with explicit semantics.** |

---

## 2. What TORQA is

TORQA is:

- **AI-native** — designed so models and tools can *produce* and *repair* artifacts against a machine-checkable core, not open-ended prose or ad-hoc JSON.
- **Semantic-first** — meaning (goals, constraints, flows, effects) is primary; surface syntax is secondary and may evolve.
- **Canonical** — a single structured representation is the logical source of truth for tooling and pipelines.
- **Validation-oriented** — correctness is established through **phased verification** (syntax, kind/type, well-formedness, policy), not informal review alone.
- **Long-term host-language-independent in ambition** — today’s reference tooling may use Python, Rust, or other hosts; the **authority** is intended to live in specification and shared semantics, not in any one runtime API.

TORQA is **not**:

- a thin wrapper whose semantics are defined by Python, Rust, or TypeScript;
- “just” a schema, config format, or codegen template language;
- a replacement for all human-oriented languages — it is a **core** aimed at **AI-mediated system construction**.

---

## 3. Why TORQA exists

Most programming languages are optimized for **human authors**: familiar syntax, implicit conventions, and large cultural context. AI systems are then forced to emit **human-shaped code**, which introduces:

- unnecessary translation overhead between *intent* and *structure*;
- ambiguity and inconsistency under generative noise;
- weak guarantees unless heavy linting and review are layered on afterward.

TORQA exists to give AI-mediated pipelines a **more explicit, structurally meaningful core** — one where **semantics and validation are first-class**, and human-readable projections are **downstream**, not the ground truth.

---

## 4. Design principles

- **Semantics over syntax** — the model of record is semantic structure; notation serves it.
- **Intent over implementation detail** — workflows and guarantees before incidental code shape.
- **Determinism over ambiguity** — where predictability is required, the core favors definite rules and stable ordering.
- **Validation as a first-class concern** — multi-phase checks with stable codes and formal phases (`syntax`, `kind_type`, `wellformed`, `policy`).
- **Projections are downstream** — TypeScript, SQL, Rust stubs, and similar outputs are **emitted artifacts**, not the semantic source of truth.
- **Human-readable output is useful, not sovereign** — editors and generated files help people; they do not define correctness.

---

## 5. Architecture

A realistic layered view:

| Layer | Role |
|-------|------|
| **`.tq` source** | Canonical *textual* artifact for TORQA programs (introduced as the forward-facing extension; the semantic model is authoritative). |
| **Parser** | Maps `.tq` (and transitional surfaces) into an internal AST or canonical interchange. *Maturity: early; some pipelines still accept JSON IR envelopes during migration.* |
| **Validator** | Schema + structural + semantic rules; attaches issues to legacy and **formal** validation phases. |
| **Semantic model** | Registry of predicates and effects, guarantee and handoff rules, determinism constraints. |
| **Evaluator / runtime** | Abstract execution schedule (preconditions → forbids → transitions → postconditions) with explicit **control state** and **AEM-aligned** halt codes. Reference hosts implement this today; **full runtime independence is a goal, not a claim of the current repo.** |
| **Projection layer** | Emits **TORQA.web**-style (e.g. Vite/React trees), **TORQA.db**-style (SQL), **TORQA.app** / **TORQA.sys**-style stubs — described as **future named families** over the same core. |

**Future domain families** (extensions of the ecosystem, not separate languages):

- **TORQA.web** — browser and HTTP-oriented projections.
- **TORQA.db** — relational and storage-oriented projections.
- **TORQA.app** — application shell and UI composition.
- **TORQA.sys** — services, deployment, and systems glue.

These are **optional layers** on top of the same semantic core; the repository may grow emitters and profiles under those names over time.

---

## 6. Example syntax (illustrative `.tq`)

The snippet below is **early illustrative syntax**. The **semantic model and validators** matter more than this exact surface; the notation may change as the parser matures.

```tq
module auth.login

intent user_login
requires email, password
ensures session.created

flow:
  validate email
  validate password
  find user by email
  verify password
  create session
  emit login_success
```

A copy of this example lives at `examples/torqa/auth_login.tq`.

---

## 7. File extension

**`.tq` is the canonical extension for TORQA source artifacts.**  
Other interchange forms (e.g. JSON envelopes for tooling and bridges) may coexist during development; they should be treated as **serialization profiles** of the core, not competing languages.

---

## 8. Roadmap

Honest staged direction:

| Stage | Focus |
|-------|--------|
| **V0** | Core surface syntax, parser experiments, mapping to a canonical interchange. |
| **V1** | Validator + semantic rules + **stable IR** (JSON schema and interchange used in CI today). |
| **V2** | Evaluator and **runtime direction** — AEM-style execution, parity across reference hosts. |
| **V3** | **Projection ecosystem** — TORQA.web / TORQA.db / TORQA.app / TORQA.sys style emitters and quality gates. |
| **V4** | **Self-hosting direction** — core tooling described and evolved under TORQA’s own rules (long-term; **not** claimed today). |

**Host-language independence** and **production hardening** are **goals**, not current assertions.

---

## 9. Repository contents (this tree)

This repository is expected to hold:

- **Language core** — semantic types, validation, diagnostics, formal phases.
- **Syntax experiments** — line- and block-oriented surfaces toward `.tq`.
- **Parser / validator work** — Python reference implementation; Rust reference engine and bridge.
- **Projection experiments** — multi-surface codegen from the canonical model.
- **Runtime research** — execution plans, traces, AEM codes, engine parity tests.
- **Tooling** — CLI (`torqa`), web console (`torqa-console`), Docker, optional desktop shell.

Layout (abbreviated):

| Path | Purpose |
|------|---------|
| `src/ir/` | Canonical IR types, bundle envelope, migration, fingerprints |
| `src/semantics/` | Semantic analyzer and registry |
| `src/execution/` | Execution, engine routing, parity |
| `src/diagnostics/` | Codes, formal phases, reports |
| `src/codegen/` | Projection builders |
| `src/orchestrator/` | End-to-end pipeline |
| `rust-core/` | Rust validation, semantics, execution, bridge binary |
| `examples/core/` | Golden JSON IR bundles (interchange tests) |
| `examples/torqa/` | Illustrative `.tq` sources |
| `spec/IR_BUNDLE.schema.json` | JSON Schema for the bundle envelope |
| `docs/` | Charter, formal core, AEM spec, generation profile, versioning |
| `webui/` | FastAPI + static console |

---

## 10. Status

TORQA is **experimental and early-stage**, but **architected seriously**: formal validation phases, AEM-oriented execution semantics, proposal gating for AI-produced bundles, and documentation that separates **intent** from **implementation status**.

It is **not** claimed to be fully self-hosting, fully runtime-independent, production-ready, or widely adopted. Those are **directions** documented in `docs/` and `ROADMAP.md`.

---

## Logo direction

- **Minimal, geometric**, systems-oriented (compiler / runtime / language identity).
- **Monogram or mark** combining **T** and **Q**.
- The **Q tail** may suggest **flow**, a **graph edge**, or a **semantic transition** — not a literal “AI sparkles” trope.
- Avoid consumer-startup flash; prefer something that would sit comfortably next to LLVM, Rust, or Zig branding in density and restraint.

---

## Suggested landing page copy

**Headline:** Build from semantics.  
**Alternative headline:** AI needs a native core language.

**Subheadline:** TORQA is a semantic-first language for AI-built systems.

**One sentence:** TORQA gives AI-mediated software construction an explicit, validatable core — so intent becomes structure, projections stay downstream, and correctness is engineered, not improvised.

---

## Quick start

### Install

```bash
pip install -r requirements-dev.txt
pip install -e ".[dev]"
```

### Tests

```bash
python -m pytest
cargo test --manifest-path rust-core/Cargo.toml   # optional; requires Rust
```

### Web console

```bash
pip install -r requirements.txt
torqa-console
# or: python -m webui
```

Use `TORQA_WEB_HOST` / `TORQA_WEB_PORT` or CLI `--host` / `--port`. Docker: `docker compose up --build` → `http://127.0.0.1:8000`.

### CLI

```bash
torqa demo
torqa guided examples/core/valid_minimal_flow.json --inputs-json "{\"username\":\"alice\"}"
torqa validate examples/core/valid_minimal_flow.json
torqa language
torqa proposal-gate examples/core/valid_minimal_flow.json
```

Without install: `python -m src.cli.main validate <file.json>`.

---

## Security

See `docs/PROTOTYPE_SECURITY.md`. Treat AI suggestions and generated projections as **untrusted** until reviewed; do not expose the console to the public internet without hardening.

---

## Contributing

See `CONTRIBUTING.md`.

---

## License

Licensed under the [MIT License](LICENSE). You may replace the copyright line in `LICENSE` with your name or organization when you publish your fork.
