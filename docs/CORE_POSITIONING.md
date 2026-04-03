# TORQA — core product definition (frozen)

This document is the **canonical product identity** for TORQA. It does not describe the roadmap, syntax, or implementation stack.

---

## Canonical definition

**TORQA is a validated semantic compression system for workflows and automation.**  
Authors express intent in a **small, structured surface** that compiles to a **canonical intermediate representation (IR)**. That IR is **checked** (envelope, shape, semantics) **before** anything is treated as a successful “build.” Valid IR can **project** to multiple technical artifacts (including, where appropriate, UI shells or stubs). **The product is the checked model and its compression story—not any single generated website.**

---

## What TORQA is

- **Semantic compression:** The same workflow or automation intent is represented in **far fewer tokens and moving parts** than ad-hoc natural language plus one-off codegen loops, while remaining **machine-checkable**.
- **Validation-first:** Invalid or incomplete intent is **rejected with diagnostics**; there is no “silent success” path that pretends bad specs shipped cleanly.
- **One structured model, many projections:** The **IR and validation** are the contract; projections (code, SQL, stubs, previews) are **outputs**, not the source of truth.
- **Automation- and integration-oriented:** Suited to **repeatable** flows, guards, and handoffs between humans, tools, and AI—where **meaning** must stay stable across surfaces.

---

## What TORQA is not

- **Not a website generator.** Websites or UI previews may appear as **one possible projection** of validated intent; they are **not** the definition of the product.
- **Not “another generic code-from-prompt” tool** whose primary output is arbitrary application code without a durable, validated spec.
- **Not a replacement for full product design, security review, or operations**—TORQA narrows and checks **intent**; shipping still requires engineering discipline outside this core.
- **Not a claim of universal coverage** for every domain or every kind of software; the core is **workflow-shaped, checkable intent** and **faithful projection** from that model.

---

## Primary use cases

### Workflow automation

Describe **steps, inputs, transitions, pre/post conditions, and forbidden paths** in one place. The same model can drive documentation, execution sketches, and generated glue—after validation—so automation stays **aligned with declared behavior**.

### Data transformation

Encode **what must hold** before and after data moves (constraints, effects, disallowed states) in a structured form. Validation ensures the transformation story is **coherent** before generating scripts, SQL, or adapters from the IR.

### Validation of AI outputs

Use the IR and gate as a **hard check** on structured output from LLMs or other generators: bundles are either **accepted or rejected** with explicit diagnostics, rather than merged half-correctly into a codebase. TORQA is the **contract surface** against which those outputs are tested.

---

## Stability of this document

Wording here defines **what we call TORQA** for positioning and communication. Changes should be **intentional and rare**; they are product-definition changes, not release notes.
