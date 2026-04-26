# AI Workflow Guardrail Demo

This page is one **end-to-end** path through the guardrail story: a workflow-shaped spec exists (from a human, a template, or any system that emits `.tq` or bundle JSON). **Torqa treats it as a workflow trust layer**—not just parsing—running **structural validation**, **semantic validation**, then **policy**, **deterministic risk**, and optional **trust profiles** before any external execution step. Nothing here calls an LLM or a remote API, and nothing in this repository runs your business workflows.

**Prerequisite:** from the repository root, `pip install -e ".[dev]"`. Use `torqa` if it is on your `PATH`; otherwise `python -m torqa` (see [Quickstart](quickstart.md#if-torqa-is-not-found-often-on-windows)).

---

## Why this demo matters

Generated or imported specs are easy to produce and easy to **trust by accident**: they can look plausible while being structurally invalid, semantically inconsistent with the shipped effect registry, or **failing policy** (missing audit fields, wrong **severity** for your **`--profile`**). Feeding that straight into an executor pushes failures **downstream**—wrong behavior, opaque errors, or incident response—instead of **up front** in deterministic output.

Torqa’s role is narrow and real: **parse/load → canonical IR → validate → trust evaluation** ([Trust layer](trust-layer.md)). If structure, semantics, or **policy** do not pass, you do not treat the file as **handoff-ready**. **Risk** and **`Why:`** lines explain the tier even when policy passes.

---

## Good path

**Input file (committed in this repo):** [`examples/approval_flow.tq`](../examples/approval_flow.tq) — human-style `.tq` with `meta:` (owner, severity) and the reference `tq_v1` flow steps (`create session`, `emit login_success`). It models “audit metadata on the same IR you would hand off,” not a full approval engine.

**Commands** (from repo root):

```bash
torqa validate examples/approval_flow.tq
torqa validate --profile strict examples/approval_flow.tq
torqa inspect examples/approval_flow.tq
```

**`--profile`** switches **built-in trust rules** without changing the parser ([Trust profiles](trust-profiles.md)). On **`approval_flow.tq`**, **`severity high`** passes **`default`** policy but **fails** under **`strict`**—same file, different trust outcome.

**Short expected output (`validate` with default profile):**

- `Input type: tq`, `File: …`
- `Parse: OK` → `Structural validation: PASS` → `Semantic validation: PASS` → `Logic validation: PASS`
- `Trust profile: default` → `Policy validation: PASS` → `Review required: yes` (this file uses **`severity high`**) or adjust **`meta:`** in a copy to see `no`
- `Risk level:` and **`Why:`** with deterministic reason lines ([Trust risk scoring](trust-scoring.md))
- `Result: PASS` and **`Handoff: validated artifact ready for external handoff.`** when everything passes

With **`--profile strict`**, expect **`Policy validation: FAIL`** and policy errors if **`severity: high`** remains—illustrating **trust strictness**, not a parse difference.

**Short expected output (`inspect`):**

- **Stderr:** `Input type`, `File:`, and notes that **stdout** is the canonical **`ir_goal` JSON** for tooling (no execution).
- **Stdout:** JSON only — pretty-printed, sorted keys — safe to pipe to `jq`, redirect to a file, or diff in review.

**What “handoff-ready” means here:** Under the **default effect registry**, current IR rules, and **chosen profile**, the spec meets the **trust bar** for treating it as the **contract artifact** you pass to **your** runtime, codegen, or orchestrator. Torqa still **does not** execute that workflow. Operational correctness remains **your** integration and runtime testing.

---

## Bad path

**Bad input:** an intentionally invalid strict `.tq` — valid headers, but a **flow step** that `tq_v1` does not allow (the reference surface only permits `create session` and `emit login_success` plus guarded variants).

Save as `bad_guardrail_demo.tq` (any path; not shipped in the repo):

```text
intent demo_bad
requires username, password, ip_address
result Done
flow:
  create session
  notify lead
```

**Command:**

```bash
torqa validate bad_guardrail_demo.tq
```

**Expected blocked result (non-zero exit):**

- `Parse: FAIL` — **trust layer is not reached** (no policy/risk lines for this failure mode)
- `Error: PX_TQ_UNKNOWN_FLOW_STEP` with a line number and message listing allowed steps
- `Result: FAIL`
- `Guardrail: spec blocked before execution.`

**Why this is useful:** The failure is **early**, **explicit**, and **stable** (`PX_TQ_*`), not a surprise at deploy time or inside a worker. The same guard applies whether `notify lead` came from a typo, a bad merge, or a generator that hallucinated a step name.

---

## Same contract, different sources

| Source | Example in repo | Same gate |
|--------|------------------|-----------|
| **`.tq`** | `examples/approval_flow.tq` | `torqa validate` → parse → `validate_ir` → semantics → **policy / risk / profile** |
| **Bundle JSON** | `examples/ai_generated.json` | `torqa validate` → load → same trust stack |

```bash
torqa validate examples/approval_flow.tq
torqa validate examples/ai_generated.json
```

Both must reach **`Result: PASS`** and the **Handoff** line under the **same profile** for the artifact to be treated as validated. The JSON file illustrates what an importer or generator might emit; it is **not** produced by a bundled AI in this repository.

---

## What Torqa does and does not do

| Does | Does not |
|------|----------|
| **Validates** structure and semantics; **evaluates** policy, risk, and profile | **Execute** workflows or call side effects |
| **Canonicalizes** to **`ir_goal`** (e.g. via `torqa inspect` stdout) | **Call** external APIs or models |
| **Reports** trust output: profile, policy, review, risk, reasons, handoff / guardrail lines | **Replace** integration tests or production monitoring |

---

## Practical team use

- **Local dev:** Run `torqa validate` (and pick **`--profile`** to match team CI) before promoting a spec to “what we deploy.”
- **CI:** Fail on non-zero `torqa validate` ([`examples/ci_check.md`](../examples/ci_check.md)); optionally **`--profile strict`** on protected branches.
- **Review process:** Attach **`torqa inspect`** output or bundle JSON; include **policy / risk** lines from **`validate`** in review notes.

---

## See also

- [Trust layer](trust-layer.md) — policy, risk, profiles in one narrative  
- [Flagship demo](flagship-demo.md) — alternate walkthrough with lead-intake and JSON export  
- [Starter use cases](use-cases.md) — index of `examples/`  
- [Quickstart](quickstart.md) — install and CLI reference  
