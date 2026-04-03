# Benchmark task specification (P31) — stable comparator prompt

Use this file as the **fixed natural-language task** when measuring token count, latency, or output size for **non-TORQA** baselines (e.g. codegen from plain English or from a longer informal spec).

**Task ID:** `p31_login_dashboard_shell_v1`

## Product intent (what to build)

Implement a **small web experience** for a **member login flow** that includes:

1. **Inputs:** username, password, and client IP (treat IP as a required field for audit display in copy, not as a live geo feature).
2. **Rules:** reject sign-in if the account is **locked** (surface this as validation or error messaging in the UI copy).
3. **Success path:** on valid credentials, **create a session** and **record a successful login audit** tied to username + IP.
4. **UI:** a **multi-section shell** — at minimum an overview, a sign-in form area, and a post-sign-in / dashboard-style section (placeholders are fine; no real backend required).
5. **Stack:** a **local-preview** SPA (e.g. Vite + React or equivalent) with `npm install` + `npm run dev` workflow documented in a README.

## Out of scope (keep the benchmark small)

- No production auth server, database, or real account store.
- No third-party identity providers.
- Styling may be minimal but should look intentional (not a single unstyled HTML file unless the baseline explicitly targets that).

## Success criteria for the baseline artifact

- Runnable dev server instructions exist.
- All three conceptual areas (overview, sign-in, post-sign-in) appear in the navigation or routing.
- Locked-account and audit/session concepts are reflected in copy or comments.

---

**TORQA baseline:** the same intent is expressed in `app.tq` in this directory (~25 lines including comments). Compare your baseline’s **prompt + generated source** token/line counts against that plus `torqa build` output under `generated/webapp/`.
