# FAQ

## Is Torqa a workflow engine?

**No.** It parses specs (mainly `.tq`), builds **canonical IR**, and runs **structural + semantic** validation. **Running** steps, calling APIs, or scheduling work happens in **your** code or another product.

## Why not JSON only?

You *can* treat the **bundle** (`ir_goal`) as JSON on the wire—but something has to **produce** valid IR. Raw JSON without rules tends to drift; Torqa adds a **strict surface** (`.tq`) and **validators** so “valid JSON” and “valid Torqa spec” are not the same accident. If you generate JSON directly, you still must satisfy **`validate_ir`** and semantics.

## Why `.tq`?

**Human review and deterministic parsing.** `.tq` is line-oriented, ordered, and small—easy to read in a PR and easy to map to one IR. It complements AI-generated or imported text by giving everyone the **same target shape** after parse.

## Can AI generate Torqa specs?

**Yes, in principle**—if the output is **valid `.tq`** (or valid bundle JSON). The core does not call any model; it only parses and validates. Quality depends on the generator meeting the grammar and semantic registry.

## Can I build my own runtime?

**Yes—that’s the intended split.** After **`semantic_ok`**, read **`ir_goal`** and implement execution however you like. This repo does not include a runtime library.

## Is this production ready?

**Use your own criteria.** This is an **early core**: reference Python, a **small** default effect registry, and tests focused on smoke coverage—not a long enterprise support matrix. Production use means **you** validate fit: error handling, registry coverage for your effects, security review of parsers, and your execution layer.

## What does `semantic_ok` mean?

**No semantic or logic errors** in the report’s merged error list. **Warnings** may still appear. Structural issues belong to **`validate_ir`** (and parse errors throw before that).

## Why does my spec require `ip_address` (or similar)?

The **strict `tq_v1`** rules and the flows you model may **require** certain `requires` fields so audit- or security-sensitive patterns are not under-specified. Failures use codes like **`PX_TQ_MISSING_IP`**.

## What is `.pxir`?

A **transitional** format for older material. Use **`.tq`** for new specs.

## Does Torqa ship OpenAI or other AI integrations?

**No.** The project is **tool-agnostic**—no API clients for models in-tree.
