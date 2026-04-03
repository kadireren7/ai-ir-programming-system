# Architecture rules (P18)

Strict **positioning** rules for this repository. They do not replace normative specs (`CORE_SPEC.md`, `FORMAL_CORE.md`, etc.); they state how we **present** and **grow** the system.

## 1. Product identity

- **TORQA** is the visible product and primary surface: the language (`.tq`), canonical IR, diagnostics story, and author experience.
- User-facing **documentation, examples, and flows** should center **TORQA**, not implementation languages. The default author loop remains **`torqa build`** on a `.tq` or IR source (see [QUICKSTART.md](QUICKSTART.md)).
- Do **not** market or document the project as “a Python toolkit” or “a Rust library” first; those are **engines under** TORQA.

## 2. Rust role (compact core)

- **Rust** should concentrate on **core engine** concerns: verification, execution/runtime paths, and **projection internals** where performance and tight IR handling matter.
- Rust is **not** the product name users adopt; it is the **implementation layer** for parts of the TORQA stack.

## 3. Python role (thin orchestration)

- **Python** should concentrate on **CLI glue**, **tooling**, **compatibility**, **fallback**, web/console hosting, and bridging TORQA bundles to the outside world.
- Avoid growing Python into the “main story” in READMEs and tutorials; keep it **supporting**.

## 4. Self-host and P17.1 lock

- The **self-host map**, registry pairs, **group ids**, and **slug/file naming** for `examples/torqa_self/` remain **locked** per [SELF_HOST_MAP.md](SELF_HOST_MAP.md) (P17.1).
- Do **not** expand or rename that layer unless a **new roadmap priority** explicitly authorizes it (post–P18).

## 5. Presentation rule

- When adding docs or examples, ask: *Would a new author think TORQA is the product?* If the text centers Python/Rust filenames or “how our Python package works” without TORQA context, revise.

---

## Next after P18

Engineering focus should move to **hardening the spine**:

1. **`.tq` → canonical IR → projection`** — parse, validate, and codegen paths that stay stable and well-tested.
2. **Rust** should **concentrate** in **core engine** paths (verification/runtime/projection hot spots), not spread ad hoc.
3. **Python** should **thin gradually** via small, safe extractions — **not** disruptive big-bang rewrites or removing fallback until replacements are proven.

This document should be updated when roadmap phases explicitly change layering goals.
