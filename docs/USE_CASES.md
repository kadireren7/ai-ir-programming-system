# TORQA use cases — where it helps, where it does not

TORQA is **semantic-first**: a small **surface** (for example `.tq`) compiles to **canonical IR**, runs **envelope + structural + semantic checks**, then **projects** to previews (webapp, SQL, language stubs). It is **early-stage and developer-focused** — strong for **contracts and tooling**, not a drop-in replacement for a full application stack.

---

## Where TORQA is strong

### Validated intent before codegen

- Every input is **accepted or rejected** at clear stages (parse → validate → project). Invalid bundles do not complete a clean materialize path; see [VALIDATION_GATE.md](VALIDATION_GATE.md).
- Good fit when you want **AI- or human-authored specs** to pass a **hard gate** before anything is treated as “in the system” (see `examples/ai_output_validation/` and `src/evolution/ai_proposal_gate.py`).

### Compact, repeatable descriptions

- The **same intent** can be expressed with **far fewer tokens than a long natural-language task spec** in the repo’s benchmark layout — measured with a **deterministic** estimator, not live tokenizer APIs; see [BENCHMARK_COMPRESSION.md](BENCHMARK_COMPRESSION.md) and `reports/benchmark_initial.json`.
- Good fit for **storing intent in repos**, **diff-friendly** specs, and **comparing** NL vs TORQA surface size in CI.

### One IR, several projections

- One validated goal can drive **multiple outputs** (e.g. Vite + React preview under `generated/webapp/`, stubs, SQL-shaped artifacts) from the same pipeline — see `torqa build` / `torqa project` and [FIRST_REAL_DEMO.md](FIRST_REAL_DEMO.md).
- Good fit for **prototypes**, **scaffolding**, and **aligning** “what we mean” with “what we generated,” not necessarily for shipping that generated UI unchanged.

### Deterministic projection layout

- Materialization applies **stable ordering** of artifacts and files so the **same validated bundle** yields the **same paths and bytes** on disk (see `stabilize_projection_artifacts` and `compute_projection_output_digest` in `src/project_materialize.py`, tests in `tests/test_projection_output_stability.py`).
- Good fit for **regression checks** and **CI snapshots** of generated trees.

### Workflow-shaped product language (with limits)

- **Login/session-shaped** flows and **business sketches** (onboarding, approvals) work well as **intent + `requires` + small `flow:`** and comments, with richer behavior carried in IR and projection — see `examples/torqa/templates/`, `examples/workflows/`, and [TQ_AUTHOR_CHEATSHEET.md](TQ_AUTHOR_CHEATSHEET.md).

### Packages and composition

- Bundles can participate in **package / compose** workflows for sharing fragments; see [USING_PACKAGES.md](USING_PACKAGES.md) and `examples/package_demo/`.

---

## Where TORQA is not (yet) the right tool

### Arbitrary programs in the surface

- **tq_v1** is intentionally **small**: fixed header order, a **tiny** `flow:` vocabulary (`create session`, `emit login_success`, guarded variants), and **no** general-purpose programming in `.tq`. If you need **loops, exceptions, rich branching, or ad-hoc algorithms**, use a real language and treat TORQA as a **spec or codegen input**, not the implementation.

### Guaranteed production quality of generated UI

- Generated web output is a **local preview shell** (forms and copy are placeholders unless you wire them). Benchmarks **do not** score “correctness of React” or design quality; see the caveats in [BENCHMARK_COMPRESSION.md](BENCHMARK_COMPRESSION.md).

### Drop-in replacement for auth, security, or compliance by default

- TORQA helps you **state and check** intent; it does **not** replace **threat modeling**, **penetration testing**, or **legal/compliance** sign-off. Security notes for exposed surfaces (e.g. Web UI) are separate; see [WEBUI_SECURITY.md](WEBUI_SECURITY.md) if you run local demos.

### Full semantic coverage of every domain

- The **semantic registry** and **effects** are **curated** for the prototype. Unknown functions, effects, or inconsistent projections are **rejected or flagged** — that is by design for a **narrow core**, not for encoding **any** domain in IR without extending the system.

### “Just describe it in English and ship”

- Natural language remains **verbose and ambiguous** relative to the surface in measured benchmarks; TORQA’s strength is **structure + validation**, not **maximizing** NL flexibility. Pair **NL** with **TORQA** when you need a **checkable** artifact.

---

## Quick decision guide

| You need… | TORQA fits well when… | Look elsewhere (or combine) when… |
|-----------|------------------------|-----------------------------------|
| Spec + CI gate | You want **parse/validate/project** boundaries and stable diagnostics | You only need free-form docs with no machine checks |
| AI-generated configs | You can **route model output** through `surface` / `validate` / `materialize` | The model must output **unrestricted** code with no schema |
| Demo / scaffold | A **Vite + React** (or stub) tree from a **validated** goal is enough | You need **production-hardened** app code from day one |
| Business workflow | You model **inputs, guards, results** and accept **small** `flow:` | You need **arbitrary process DSL** in one file |

---

## See also

- [TRIAL_READINESS.md](TRIAL_READINESS.md) — flagship path and explicit limits  
- [TQ_SURFACE_MAPPING.md](TQ_SURFACE_MAPPING.md) — authoritative `.tq` rules  
- [STATUS.md](../STATUS.md) — maturity and scope  
