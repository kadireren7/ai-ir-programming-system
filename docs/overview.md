# Overview

**Torqa** is a canonical and verifiable workflow specification core for AI-native automation. The **center of gravity** is **canonical IR** (`ir_goal` in a versioned JSON bundle) plus **structural and semantic validation**—the **contract** you treat as authoritative before anything executes.

**`.tq`** is an **optional, ergonomic text authoring layer** that compiles to that IR via the **reference parser** shipped in this repository. Over time, **other ways to produce the same bundle** (importers, codegen, additional surfaces) can sit alongside `.tq`; they are not required to be text. What stays constant is **IR + validation**.

## What Torqa is

- **Torqa Core:** **`ir_goal`**, **`validate_ir`**, semantic reporting with a **default effect registry**, and **JSON Schema** for the wire format.
- **Trust:** one **checkable** artifact for “what this automation claims to do,” suitable for CI and review.
- **Portability:** the same IR can be consumed by different downstream tools if they honor the contract.

## Why it exists

Teams need a **single, verifiable definition** of workflow intent—especially when sources are mixed (humans, generators, migrations). Unconstrained JSON or prose does not give you a **stable contract**. Torqa concentrates **verification** on the IR: **validate** first, execute elsewhere.

## Who it is for

- **Engineers and platform teams** who want a **stable IR** and validation hooks for tests, policy, or codegen.
- **Spec authors** who may use **`.tq`** for readable files or **emit JSON** through their own pipelines.
- **Anyone** who needs the **same canonical target** whether the spec started as text or structured data.

## When to use it

- You want a **versioned IR contract** with **structural** and **semantic** checks before handoff.
- You can **produce** `ir_goal` JSON that matches the schema (via **`.tq`**, an importer, or another path you own).
- You plan to **own execution elsewhere** and need a **verified** spec, not a black-box runtime.

## When not to use it

- You need a **workflow engine** that runs steps or calls APIs—Torqa does not execute workflows.
- You want a **full product UI** or **hosted automation platform** in this repo.
- You expect **`.tq`** to be the only input forever—**the core is IR**; text is optional.

## What this repository contains

| Piece | Purpose |
|-------|---------|
| **IR + validators** | `canonical_ir`, `validate_ir`, semantics / registry, `spec/IR_BUNDLE.schema.json` |
| **`.tq` (optional)** | Reference **text → bundle** parser for ergonomic authoring |
| **Transitional `.pxir`** | Legacy surface; prefer `.tq` for new text |

Everything beyond **IR construction → validate** is out of scope here.

## Examples

Concrete scenarios (CI, migration, multiple runtimes) are in [Examples](examples.md).
