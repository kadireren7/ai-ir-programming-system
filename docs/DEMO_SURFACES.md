# Demo surfaces (P34)

Short guide for **showing** TORQA with the **flagship benchmark**, **compression story (P32)**, and **validation gate (P33)** — without a full product redesign.

**End-to-end public story:** [FLAGSHIP_DEMO.md](FLAGSHIP_DEMO.md) (P35) · **single demo entry:** `torqa demo` (prints verify, build, and these surfaces).

**Surface split:** **`/`** = **marketing website** only ([`website/`](../website/)) · **`/console`** → **`/`** (IR lab removed) · **`/desktop`** = pointer to **native** `torqa-desktop`. Rules: [UI_SURFACE_RULES.md](UI_SURFACE_RULES.md) · [P73_PRODUCT_SURFACES.md](P73_PRODUCT_SURFACES.md).

## Website + web console

**Launch** (from repo root, with dependencies installed):

```bash
python -m website.server
# or
torqa-console
```

- **`/`** — Marketing site (positioning, proof sections, theme toggle, optional live benchmark panel when APIs are up).  
- **`/console`** — Redirects to **`/`** (no browser lab).

Default base URL **http://127.0.0.1:8000/** (port may vary).

**What to showcase**

- **Site (`/`):** TORQA story, compression + gate narrative, benchmark visualization (via API when running locally), desktop CTA — **no** in-browser editor.
- **Deep tooling:** CLI and **TORQA Desktop** (`torqa-desktop`) for validate, build, IR inspection, and samples.

**Related docs:** [BENCHMARK_FLAGSHIP.md](BENCHMARK_FLAGSHIP.md), [VALIDATION_GATE.md](VALIDATION_GATE.md), [WEBUI_SECURITY.md](WEBUI_SECURITY.md).

## Official native desktop (Electron)

**Launch:**

```bash
torqa-desktop
```

Requires `cd desktop && npm install` once; see [`desktop/README.md`](../desktop/README.md). **Dev:** `cd desktop && npm run dev`.

**What to showcase**

- Folder picker, `.tq` list, editor, **Validate** / **Build** / **Benchmark**, output + diagnostics + IR preview — all via **`torqa` CLI**; **no** duplicated validation in the shell.

**Related:** [DEMO_LOCALHOST.md](DEMO_LOCALHOST.md) for running generated Vite apps.

## Consistency with CLI

Flagship paths and gate behavior match:

- `torqa build examples/benchmark_flagship/app.tq`
- `torqa-gate-proof`

The UIs are **thin clients** over the same core APIs and `project_materialize` pipeline as the CLI.
