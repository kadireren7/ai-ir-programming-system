# AI-first TORQA — sıralı prompt listesi

Bu dosya, **önce AI üretim hedefi (kanonik IR)**, sonra **doğrulama / eval**, en sonda **`.tq` yüzeyi** mantığıyla ilerlemek için **doğrudan modele yapıştırılabilir** prompt şablonlarıdır. Amaç: düşük token, yüksek sinyal, `docs/AI_GENERATION_PROFILE.md` ve `docs/AI_NATIVE_LANGUAGE_CHARTER.md` ile uyum.

**Konuya göre ek şablonlar:** [`docs/TORQA_PROMPT_CATALOG.md`](TORQA_PROMPT_CATALOG.md) (P1–P11 indeksli katalog). **Büyük işler + temizlik:** [`docs/TORQA_MAJOR_WORK_PROMPTS.md`](TORQA_MAJOR_WORK_PROMPTS.md). **Nihai vizyon yolu (F0–F5):** [`docs/TORQA_NIHAI_VISION_ROADMAP.md`](TORQA_NIHAI_VISION_ROADMAP.md).

**Ön koşul (sen doldur):** depo kökü, güncel `CANONICAL_IR_VERSION` (`src/ir/canonical_ir.py`), isteğe bağlı `examples/core/*.json` referans dosyaları.

---

## Aşama 0 — Bağlam yükleme (tek sefer)

**A0.1 — Sistem bağlamı**

```text
You are implementing and extending the TORQA toolchain. Primary output for IR authoring is a single JSON object with top-level key "ir_goal" unless the task says otherwise. Follow docs/AI_GENERATION_PROFILE.md strictly: fixed id patterns, only registry builtins, metadata.ir_version must equal the active toolchain version, no markdown fences around JSON.

Repository layout: spec/IR_BUNDLE.schema.json, docs/CORE_SPEC.md, docs/FORMAL_CORE.md, src/language/authoring_prompt.py (minimal_valid_bundle_json, build_ai_authoring_system_prompt), src/semantics/ir_semantics.py (builtin registry).

When asked to emit IR, output ONLY the JSON object, no commentary, unless I ask for explanation in a separate message.
```

**A0.2 — Registry snapshot isteği (model araç kullanmıyorsa)**

```text
List every builtin name, arity, and types from default_ir_function_registry that are allowed in IR conditions and transitions. Output as a compact markdown table. Do not invent names; if you cannot read the repo, say so.
```

---

## Aşama 1 — Minimal geçerli iskelet (AI üretim çekirdeği)

**A1.1 — İskelet üret**

```text
Emit minimal_valid_bundle_json equivalent: the smallest structurally valid ir_goal that passes schema and handoff rules. Use metadata.ir_version exactly as specified in the task (I will paste CANONICAL_IR_VERSION). PascalCase goal name, one text input, one require precondition with exists(username), empty forbids/transitions/postconditions, result "OK", metadata.source "python_prototype", canonical_language "english".

Output: single JSON only.
```

**A1.2 — Tek adımda genişlet (precondition)**

```text
Start from this bundle (paste JSON). Add exactly one new require precondition with a new condition_id following c_req_NNNN pattern, unique in the goal. Use only registry builtins. Output: full corrected JSON only; preserve all existing ids unless an error requires renaming.
```

**A1.3 — Geçiş ekle**

```text
Start from this bundle (paste JSON). Add one transition from "before" to "after" with transition id t_NNNN, unique. effect_name must be a void builtin from the registry with correct arity. Output: full JSON only.
```

---

## Aşama 2 — Validate-then-expand disiplini

**A2.1 — Hata onarımı (diagnostic-driven)**

```text
Verifier output (paste JSON from build_full_diagnostic_report or validate_ir):

<paste diagnostics here>

Original bundle:

<paste ir bundle JSON>

Rules: minimal diff; fix only nodes implicated by codes; do not change ir_version to silence errors; keep id stability; output single corrected JSON object only.
```

**A2.2 — Çok adımlı genişletme (oturum planı)**

```text
For this natural-language intent (one paragraph):

<paste intent>

Step 1: Emit minimal valid skeleton only.
Step 2: I will reply "ok" — then add all preconditions.
Step 3: I will reply "ok" — then add forbids if any.
Step 4: I will reply "ok" — then add transitions with void effects only.
Step 5: I will reply "ok" — then add postconditions.

After each step output JSON only. Wait for my "ok" between steps.
```

---

## Aşama 3 — Eval ve regresyon (ölçülebilir başarı)

**A3.1 — Golden çift üret**

```text
Given this ir_goal JSON (paste), produce:
(1) Five short natural-language paraphrases that should formalize to the same intent class (not necessarily byte-identical IR).
(2) Five adversarial paraphrases that should FAIL validation (wrong types, invented builtins, duplicate ids) — list expected error codes if known from docs/FORMAL_CORE.md phases.

Be concise; no full IR for adversarial cases unless I ask.
```

**A3.2 — Regression checklist prompt**

```text
Check this bundle against AI_GENERATION_PROFILE.md §8 conformance checklist. Output a markdown checklist with pass/fail per item; if fail, cite the exact JSON path and rule.
```

---

## Aşama 4 — Proposal / evrim hattı (politika)

**A4.1 — Patch öncesi gate**

```text
This proposed bundle change (diff or before/after JSON) must pass: schema, structural, handoff, determinism, semantic. Summarize risk in one sentence, then list which automated commands in this repo would validate it (pytest paths, torqa CLI subcommands if any). Do not apply the change; analysis only.
```

---

## Aşama 5 — `.tq` yüzeyi (insan yazabilir; otorite yine IR)

**A5.1 — Örnekten parse hedefi**

```text
File examples/torqa/auth_login.tq is illustrative surface syntax. Without changing canonical IR semantics, specify a deterministic parse strategy: token/line model, AST nodes, and mapping rules to ir_goal (inputs, preconditions as requires, flow steps as transitions/effects where applicable). Output as numbered steps and a table (tq construct → IR location). If something is ambiguous, mark AMBIGUOUS and propose one resolution aligned with CORE_SPEC.

Do not implement code unless I say "implement".
```

**A5.2 — `.tq` → IR implementasyon promptu**

```text
Implement or extend the .tq parser in this repo (see src/surface/ and torqa surface CLI). Constraints: parsed output must round-trip through validate_ir; reject constructs that cannot map to schema; surface diagnostics with stable codes. Add tests under tests/ mirroring examples/torqa/*.tq. Minimal diff; match existing style.
```

**Depoda uygulanan karşılık (A5.2):** `src/surface/parse_tq.py`; CLI `torqa surface <dosya>` — `.tq` için bu parser; parse hatalarında **`PX_TQ_*`** kodları (stderr’de JSON tanı). Testler: `tests/test_surface_tq.py`. Örnek yüzey: `examples/torqa/auth_login.tq` (`username`, `password`, `ip_address`; `log_successful_login` ile uyum). `ensures` gibi ifadeler şimdilik **AMBIGUOUS / yok sayım** — ileride `postcondition` politikası ile bağlanabilir.

**A5.3 — İnsan + AI aynı hedef**

```text
Document in one paragraph: for any authoring path (LLM JSON or human .tq), the single source of truth after parse is canonical ir_goal JSON. AI prompts should never target .tq as primary wire format unless the human explicitly authors .tq; default wire remains JSON per AI_GENERATION_PROFILE.
```

---

## Aşama 6 — Projeksiyon ve codegen (üretilen yazılım)

**A6.1 — Çok yüzey tutarlılığı**

```text
Given ir_goal (paste), list which projection targets the orchestrator may emit (website, sql, rust, python, ...). For each, name one file path pattern and one invariant that pytest or CI should check. No code.
```

**A6.2 — CI kırığı onarımı**

```text
CI failed at: <paste log snippet>. Repo has scripts/ci_build_generated_webapp.py and tests/test_website_generation_gate.py. Hypothesize the smallest fix (file + change type); then if I say "apply", implement minimal patch.
```

---

## Kullanım sırası (özet)

1. **A0** → bağlam ve registry  
2. **A1–A2** → iskelet, genişletme, onarım (AI için asıl müfredat)  
3. **A3** → ölçüm  
4. **A4** → değişiklik politikası  
5. **A5** → `.tq` insan yüzeyi (IR’ye bağlı, ikincil)  
6. **A6** → çıktı kalitesi ve CI  

Bu sıra, “insan için anlatı” yerine **makine için sıkı sınır + hızlı doğrulama** önceliğini korur; `.tq` sonra eklenir ve **yine aynı IR’ye kilitlenir**.
