# Starter use cases

Runnable artifacts under [`examples/`](../examples/) show how Torqa helps **today** with the **shipped** strict `.tq` surface, JSON bundles, and the `torqa` CLI. Nothing here executes business workflows—only **parse, load, validate**, then **policy, risk, and profile** evaluation on the same IR.

---

## 1. AI workflow trust gate

**What it is:** A single pipeline for **any** workflow-shaped input—human **`.tq`**, **bundle JSON** from a template, importer, or **generator**—with **no** separate “AI bypass.” After load, Torqa runs **structural validation**, **semantic validation**, then **`build_policy_report`** (policy gates, deterministic **risk level**, **`reasons`**, optional **`--profile`**). See **[Trust layer](trust-layer.md)** for how this differs from parse-only checks.

**Demonstrates:** Do **not** promote generated or pasted bytes to “the spec we run” until **`torqa validate`** exits **0**: same **trust bar** for human or generated input.

**Who uses it:** Teams that need a **deterministic gate** between draft and execution—not a bundled model, but real checks on **`.tq`** and JSON the repo already supports.

**How to run:**

```bash
torqa validate examples/ai_generated.json
torqa validate --profile strict examples/ai_generated.json
torqa inspect examples/ai_generated.json
```

```bash
torqa validate examples/approval_flow.tq
```

**Expected value:** Invalid structure, unknown effects (for the default registry), **policy** failures (e.g. missing audit metadata), or **strict** profile rules surface as **errors or non-zero exit**—not silent acceptance. **`Risk level:`** and **`Why:`** explain the classification under current heuristics.

**Honest limit:** Torqa does **not** call external models; it **evaluates** artifacts you save or generate elsewhere. Extending **`tq_v1`** vocabulary or effect registries is **your** work; this layer still supplies **verification and trust signals** at the boundary.

**See:** [`examples/ai_guardrail.md`](../examples/ai_guardrail.md), [AI Workflow Guardrail Demo](guardrail-demo.md).

---

## 2. CI, review, and policy-based approval

**CI — block bad specs before merge:** Run **`torqa validate`** (optionally with **`--profile strict`** for stricter gates) on committed **`.tq`** and bundle JSON so drift fails the build. Patterns: [`examples/ci_check.md`](../examples/ci_check.md).

**Review — canonical artifact, not only prose:** Use **`torqa inspect`** to emit **`ir_goal`** JSON for diff, tooling, or attach to review threads. Failed validation is a hard stop; passing output is the **same contract** whether the file was typed or imported.

**Policy-oriented approval — audit metadata on the IR:** [`examples/approval_flow.tq`](../examples/approval_flow.tq) shows **`meta:`** (`owner`, **`severity`**) carried into **`metadata.surface_meta`** for policy and **`review_required`** / risk behavior. It illustrates **ownership and risk labels** on the validated IR you commit—not a full BPM engine; the reference **`tq_v1`** flow body remains the small shipped vocabulary.

```bash
torqa validate examples/approval_flow.tq
torqa inspect examples/approval_flow.tq
```

**Expected value:** **Deterministic** failures on bad specs; reviewers work from **intent + IR + trust output**, not surprise parse errors at release time.

---

## See also

- [Trust layer](trust-layer.md) — narrative for policy, risk, and profiles  
- [Examples (patterns)](examples.md) — migration, multi-runtime  
- [Flagship demo](flagship-demo.md) — guided `.tq` / JSON path  
- [Quickstart](quickstart.md) — install and CLI reference  
