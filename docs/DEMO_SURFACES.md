# Demo surfaces (P34)

Short guide for **showing** TORQA with the **flagship benchmark**, **compression story (P32)**, and **validation gate (P33)** — without a full product redesign.

**End-to-end public story:** [FLAGSHIP_DEMO.md](FLAGSHIP_DEMO.md) (P35) · **single demo entry:** `torqa demo` (prints verify, build, and these surfaces).

**Surface split (P36 / P72):** **`/`** = **official** product website (built from [`website/`](../website/)) · **`/console`** = browser IR lab · **`/desktop`** = browser IDE shell. Rules: [UI_SURFACE_RULES.md](UI_SURFACE_RULES.md) · [P72_WEBSITE_OFFICIAL.md](P72_WEBSITE_OFFICIAL.md).

## Website + web console

**Launch** (from repo root, with dependencies installed):

```bash
python -m webui
# or
torqa-console
```

- **`/`** — Product site (hero, proof sections, theme toggle).  
- **`/console`** — IR lab (Monaco, flagship sidebar, pipeline, ZIP).

Default base URL **http://127.0.0.1:8000/** (port may vary).

**What to showcase**

- **Site (`/`):** TORQA story, compression + gate + flagship as **proof**, links to docs and **Open web console**.
- **Console (`/console`):** **Sidebar · Flagship demo:** **Load flagship .tq** loads `examples/benchmark_flagship/app.tq`. **Compile → IR bundle** runs the same validation path as the CLI and fills the editor with IR.
- **Metrics block** under those buttons: live summaries from **`/api/demo/benchmark-report`** (P32 fixture) and **`/api/demo/gate-proof-report`** (P33 manifest run).
- **Results · validation banner:** after diagnostics, compile, pipeline run, or ZIP, a clear **pass/fail** line appears above the tabs, plus artifact hints when the pipeline succeeds.
- **Download ZIP:** validated bundle only; failures surface in the banner and response body (no silent accept).

**Related docs:** [BENCHMARK_FLAGSHIP.md](BENCHMARK_FLAGSHIP.md), [VALIDATION_GATE.md](VALIDATION_GATE.md), [WEBUI_SECURITY.md](WEBUI_SECURITY.md).

## Desktop (embedded webview)

**Official native app (Electron):**

```bash
torqa-desktop
```

Requires `cd desktop && npm install` once; see [`desktop/README.md`](../desktop/README.md).

**Legacy Python desktop (Tk / pywebview to `/desktop`):**

```bash
torqa-desktop-legacy
python -m desktop_legacy --tk
```

**What to showcase**

- **Webview (legacy):** opens **`/desktop`** in an embedded browser — IDE-style shell tied to `torqa-console` APIs.
- **Tk:** IR JSON workflow + flagship / benchmark / gate shortcuts; see [`desktop_legacy/README.md`](../desktop_legacy/README.md).

**Related:** [DEMO_LOCALHOST.md](DEMO_LOCALHOST.md) for running generated Vite apps.

## Official Electron desktop (P71)

Same as **TORQA Desktop** in [`desktop/`](../desktop/): folder picker, `.tq` editor, Validate/Build/Benchmark via **`torqa` CLI**, pipeline chips, samples, themes — **no** duplicated validation in the UI layer.

**Launch:** `torqa-desktop` or `cd desktop && npm run dev`.

## Consistency with CLI

Flagship paths and gate behavior match:

- `torqa build examples/benchmark_flagship/app.tq`
- `torqa-gate-proof`

The UIs are **thin clients** over the same core APIs and `project_materialize` pipeline as the CLI.
