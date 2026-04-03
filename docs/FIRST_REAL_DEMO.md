# First real TORQA website demo (end-to-end)

This walkthrough shows **one path** from a small **`.tq`** specification to a **generated website preview** you can run locally. It is the flagship “TORQA generated this flow” story for product demos.

**P31 benchmark baseline** (token/compare fixtures): [`examples/benchmark_flagship/`](../examples/benchmark_flagship/) · [`BENCHMARK_FLAGSHIP.md`](BENCHMARK_FLAGSHIP.md)

## What this example is

- **Source:** [`examples/torqa_demo_site/app.tq`](../examples/torqa_demo_site/app.tq)
- **Story:** A **member sign-in** flow with:
  - required inputs (`username`, `password`, `ip_address`)
  - **guard:** `forbid locked` (account must not be locked)
  - **postcondition:** `ensures session.created` (session is established)
  - **effects:** `create session` then `emit login_success` (audit-style step)
- **Compared to** [`examples/workspace_minimal/app.tq`](../examples/workspace_minimal/app.tq): the minimal app uses an empty `flow:`; this demo includes **real transitions** and **`ip_address`** so the IR matches a fuller sign-in / audit shape. The **generated webapp** uses the same Vite + React shell as other builds, with tabs for **Overview**, **Sign in**, and **After sign-in** (see P21 webapp projection).

## What you need

- **Python 3.10+**, repo root with `pyproject.toml`
- **`pip install -e .`** so the `torqa` command exists (or use `python -m torqa` / `python -m src.cli.main` — [QUICKSTART.md](QUICKSTART.md))
- **Node.js 18+** only when you want to run the generated front-end (`npm`)

## Step 1 — Build from `.tq`

From the **repository root**:

```bash
torqa build examples/torqa_demo_site/app.tq
```

Default output tree: **`generated_out/`** under your current working directory (unless you pass `--root` / `--out` — see `torqa build --help`).

You should see **SUCCESS** (human mode) or `"ok": true` with a **`written`** list (`--json`).

## Step 2 — What gets generated

Under the output directory you will get, among other paths:

- **`generated/webapp/`** — Vite + React project (the **website demo**):
  - `package.json`, `vite.config.ts`, `index.html`, `README.md`
  - `src/main.tsx`, `src/App.tsx`, `src/styles.css`
  - `src/pages/` — `LandingPage.tsx`, `LoginPage.tsx`, `DashboardPage.tsx`
  - **`src/server_stub.ts`** — present when the IR has **transitions** (demo stub for API shape)
- **Other surfaces** — e.g. `generated/sql/`, `generated/rust/`, `generated/python/`, … (projection stubs; the walkthrough focuses on the webapp)

The **document title** and in-app heading reflect the IR goal name derived from the intent (`member_signin` → **`MemberSignin`**).

## Step 3 — Run the generated webapp

```bash
cd generated_out/generated/webapp
npm install
npm run dev
```

Open the URL Vite prints (often **http://localhost:5173**). Use the **tabs** to move between overview, sign-in form layout, and the post-sign-in placeholder screen.

**Note:** This is a **projection preview** — fields are not wired to a real backend; it demonstrates that **TORQA turned the flow spec into a coherent UI shell**.

More detail on paths and Windows commands: [DEMO_LOCALHOST.md](DEMO_LOCALHOST.md).

## What this proves about TORQA

1. **Human surface → IR → artifacts:** One **`.tq`** file drives a **canonical bundle**, validation, and **multi-surface** output.
2. **Semantics-first:** Headers like `forbid`, `ensures`, and `flow:` steps map to IR preconditions, forbids, postconditions, and transitions — not ad-hoc codegen prose.
3. **Demo-ready webapp:** The **same pipeline** that powers minimal examples scales to a **richer flow** without changing the product story (TORQA-first; projections are generated views).

## See also

- [QUICKSTART.md](QUICKSTART.md) — install and first command
- [FIRST_PROJECT.md](FIRST_PROJECT.md) — owning and editing `.tq` files
- [examples/torqa_demo_site/README.md](../examples/torqa_demo_site/README.md) — short folder readme
