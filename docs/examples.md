# Examples

Torqa fits wherever you need a **single, checkable workflow spec**: generated drafts, human edits, imports from other tools, or gates in CI. The core stays the same—**parse → canonical IR → validate**—while **execution** stays in your stack.

For a single guided walkthrough (`.tq` and JSON, same validation path), see **[Flagship demo](flagship-demo.md)**.

These scenarios are **illustrative**: they describe how teams typically wrap the core. This repository does not include LLM clients, vendor importers, or runtimes—only the parser, IR, and validators.

---

## Audit labels (`meta:`)

For **ownership and policy hints** without touching execution, add an optional **`meta:`** block (see [Concepts](concepts.md)) so CI and reviewers see the same fields in **`metadata.surface_meta`**:

```text
intent example_flow
requires username, password, ip_address
meta:
  owner security_team
  severity high
result Done
flow:
  create session
  emit login_success
```

This does **not** change effects or the registry—it only carries **structured strings** for audit and tooling.

---

## CI: validate saved bundle JSON

If your pipeline **writes** a Torqa bundle (from an importer, test fixture, or `parse_tq_source` → `json.dumps`), you can **lint the same artifact** without `.tq`:

```bash
torqa validate path/to/bundle.json
```

The CLI reports **`Input type: json`** and runs **`validate_ir`** plus the default semantic report—same bar as **`torqa validate file.tq`**.

---

## Example 1 — AI-generated onboarding workflow

**Natural-language request:** “When a new employee joins, create accounts, send welcome pack, notify manager.”

**How Torqa fits:**

1. A model (or template) **drafts** workflow text—often `.tq` or structured prose your tool turns into `.tq` / bundle JSON.
2. **Torqa** turns that into **canonical IR** and runs **structural + semantic** validation. Missing `requires` fields, bad header order, unknown effects (for the registry you use), or impossible ordering surface as **errors**, not silent fixes.
3. After **`semantic_ok`**, your **HR / IT automation runtime** (scripts, queues, SaaS—outside this repo) executes the real steps.

Torqa does **not** call an LLM; it gives you a **verifiable spec** between generation and execution.

---

## Example 2 — Internal approval process

**Business story:** purchase request → manager approval → finance review → outcome.

**Why auditability matters:** Approvals touch money and policy. A spec in Git with **deterministic parse results** and **validation in CI** means reviews focus on **intent and transitions**, not on whether the file is structurally valid. **`ir_version`** in metadata also gives you a clear contract when the IR evolves.

**Honest note about `.tq` in this core:** The reference **strict `tq_v1`** flow body currently supports only **`create session`** and **`emit login_success`** (plus guarded variants)—a small, test-backed vocabulary. It does **not** yet let you write three lines meaning “purchase → manager → finance” as distinct step text. For real approval pipelines, you extend the **surface and effect registry** so transitions match your business effects; Torqa still provides **IR + validation** at that boundary.

A **valid** strict file you can run today (same as [Quickstart](quickstart.md)) shows the mechanics—**not** the three approval stages by name:

```text
intent example_flow
requires username, password, ip_address
result Done
flow:
  create session
  emit login_success
```

For purchase approval, you would typically model **inputs** (`request_id`, `amount`, …) and **transitions** once your project defines the corresponding **effects** and parser support. Until then, treat this repo as proving **parse + validate + audit trail** (headers, `ir_version`, CI), not a full BPMN-style step library out of the box.

---

## Example 3 — Vendor migration

**Situation:** Workflow definitions lived in **another product** (YAML, BPMN export, internal DSL).

**Pattern:** You build a **one-way importer** (your code) that emits a Torqa **bundle** (`ir_goal` JSON). Then:

- **`validate_ir`** catches shape mistakes from the migration.
- **`build_ir_semantic_report`** checks effects against **your** registry (defaults are small; production use usually means **extending** the registry to match your effects).

**Portability benefit:** The **handoff artifact** is no longer vendor-specific JSON blobs—it’s **versioned IR** you can lint, test, and store in repo. Torqa does not ship importers; it defines the **target contract** importers should aim for.

---

## Example 4 — CI validation

**Pattern:** Commit `.tq` (or checked-in bundle JSON) under `specs/`. In CI:

```bash
pip install -e ".[dev]"
python -m pytest
```

Add your own script that glob-files `*.tq`, runs `parse_tq_source` → `ir_goal_from_json` → `validate_ir` → `build_ir_semantic_report`, and **fails the job** on parse errors or `semantic_ok is False`.

**Why it helps:** The same inputs produce the **same IR** every time (**deterministic parsing**). Validation is **repeatable** across branches and machines—no “works on my laptop” spec drift.

---

## Example 5 — Multi-runtime future

**Pattern:** One validated **`ir_goal`** (or serialized bundle) is consumed by:

- a **batch runner** today, and
- a **different** orchestrator or language runtime later,

as long as each executor understands the **same IR contract** and your **effect names** map to real operations.

**Separation of spec vs runtime:** Torqa fixes **what** is declared and **whether** it passes checks. **How** and **where** it runs is entirely outside this repository.

---

## Common patterns

- **Approval flows** — staged decisions, recorded inputs, clear `result` text for audit.
- **Notifications** — modeled as named effects in **your** registry once you extend beyond the default set.
- **Onboarding** — high-level steps handed to provisioning and comms runtimes after validation.
- **Compliance steps** — explicit preconditions / forbids / postconditions in IR (as your surface exposes them) checked by structure and semantics.
- **Handoff processes** — one team authors spec, another owns execution; IR is the boundary.
- **Conditional flows** — guards and logic validated against the registry and `ir_logic_validation` rules you enable.

For mechanics (`.tq`, bundle, validators), see [Concepts](concepts.md) and [Quickstart](quickstart.md).
