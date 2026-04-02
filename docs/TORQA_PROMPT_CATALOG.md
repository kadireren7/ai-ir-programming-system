# TORQA prompt kataloğu (görev türüne göre)

**Ne işe yarar:** `docs/AI_FIRST_PROMPT_PLAYBOOK.md` faz sırasını verir; bu dosya **aynı disipline uygun**, konuya göre seçilebilir **ek şablonlar** sunar. **Büyük dil/sistem işleri + depo temizliği:** [`TORQA_MAJOR_WORK_PROMPTS.md`](TORQA_MAJOR_WORK_PROMPTS.md). **Nihai vizyon (F0–F5 + faz prompt’ları):** [`TORQA_NIHAI_VISION_ROADMAP.md`](TORQA_NIHAI_VISION_ROADMAP.md). Çıktı dili: teknik İngilizce (modele yapıştırma); açıklamalar Türkçe.

**Kurallar (tüm promptlarda):** `docs/AI_GENERATION_PROFILE.md`; `ir_version` = `CANONICAL_IR_VERSION`; registry dışı isim yok; IR için gerektiğinde **yalnızca tek JSON**, markdown fence yok.

**Depoda karşılığı (örnek eşleme):** P5.1/P5.2 → `tests/test_prompt_catalog_coverage.py`, `tests/data/negative_px_unknown_function.json` · P6.4 → `scripts/validate_bundle.py` · P4.2/P4.3 → `src/surface/parse_tq.py` (`result …` satırı), `examples/torqa/signin_flow.tq` · `.tq` doğrulama → `tests/test_surface_tq.py` (tüm `examples/torqa/*.tq`) · P11.1 → `README.md` (Quickstart validate). P5.4 kasıtlı şablon (dosya adı verilmediği için refaktör tetiklemez).

---

## 1 — Bağlam ve rol

**P1.1 — Kısa sistem**

```text
TORQA repo assistant. Read-only analysis unless I say "implement". Cite file paths from this repo only. JSON IR answers: single object, no fences.
```

**P1.2 — Kod değişikliği modu**

```text
You may edit the repository. Minimal diff; match existing style and tests; do not refactor unrelated code. After changes, list files touched and suggest pytest paths to run.
```

**P1.3 — Sadece plan**

```text
Propose a step plan only (max 8 bullets). No code. Each step must name a file or test path where possible.
```

**P1.4 — Karşılaştırma**

```text
Compare bundle A vs bundle B (I will paste both). List semantic differences: inputs, condition ids, transitions (from/to/effect), postconditions. Ignore key ordering. No JSON output unless I ask.
```

**P1.5 — Registry diff**

```text
Diff the builtin registry expectations between docs/AI_GENERATION_PROFILE.md §2 and default_ir_function_registry in code. Table: doc rule | code reality | action if mismatch.
```

---

## 2 — IR üretimi (iskelet ve genişletme)

**P2.1 — Yeni hedef adı**

```text
Rename goal field to <PascalCaseName> only; keep everything else identical in this bundle (paste JSON). Output full JSON.
```

**P2.2 — Yeni text girdi**

```text
Add input {"name": "<snake_or_given>", "type": "text"} to ir_goal. Add a matching require precondition using exists(<that_name>) with a new unique c_req_NNNN. Paste base JSON; output full JSON only.
```

**P2.3 — İkili string kıyası**

```text
Add a precondition (require) or postcondition using strings_equal on two existing text inputs (paste bundle). New unique condition_id. Output full JSON only.
```

**P2.4 — Tek transition**

```text
Add transition t_NNNN before→after with void effect <registry_effect_name> and arguments matching arity (paste bundle). Output full JSON only.
```

**P2.5 — Zincir transition**

```text
Add N transitions so execution path is before→after→after→… (paste bundle and N). Each effect void; ids unique. Output full JSON only.
```

**P2.6 — NL → sadece iskelet**

```text
Natural language: <paste>. Emit ONLY minimal_valid_bundle_json-equivalent skeleton (metadata complete). Do not add transitions yet.
```

**P2.7 — NL → tam bundle (tek sefer)**

```text
Natural language: <paste>. Emit full valid ir_goal in one JSON. If ambiguous, choose the smallest valid interpretation and list assumptions in one line after JSON (only if I allow commentary).
```

**P2.8 — Metadata düzeltme**

```text
Fix metadata only in this bundle to satisfy PX_IR_METADATA / schema (paste JSON + error). Output full JSON; do not rename condition/transition ids unless error requires it.
```

---

## 3 — Onarım ve diagnostik

**P3.1 — Kod + bundle**

```text
Diagnostics JSON: <paste>. Bundle: <paste>. Minimal-diff fix; preserve ids. Output JSON only.
```

**P3.2 — Sadece açıklama**

```text
Explain diagnostic code <CODE> using docs/FORMAL_CORE.md phases. One short paragraph; cite phase name.
```

**P3.3 — Çakışan id**

```text
Resolve condition_id collision in pasted bundle with minimal edits; renumber only colliding nodes. Output full JSON.
```

**P3.4 — Yanlış effect**

```text
Transition uses non-void or unknown effect (paste bundle + error). Replace with nearest valid void effect from registry or remove transition—choose smallest fix; output JSON only.
```

**P3.5 — Handoff ihlali**

```text
Fix handoff/profile violations only (paste diagnostics + bundle). Output full JSON; do not change semantics beyond handoff rules.
```

**P3.6 — Toplu onarım oturumu**

```text
I will paste up to 5 diagnostic rounds. After each, reply with corrected JSON only. Stop if validate_ir would pass (state "PASS" once).
```

---

## 4 — `.tq` ve surface

**P4.1 — Parse doğrula**

```text
Explain how torqa surface would compile this .tq (paste path or content). List mapped ir_goal fields and any ignored lines (e.g. ensures). If parse_tq.py would error, predict PX_TQ_* code.
```

**P4.2 — .tq genişletme**

```text
Extend src/surface/parse_tq.py to support construct: <describe>. Must preserve validate_ir on examples/torqa/*.tq; add tests in tests/test_surface_tq.py. Minimal diff.
```

**P4.3 — Yeni örnek .tq**

```text
Write a new examples/torqa/<name>.tq that compiles to a valid login-like flow with effects log_successful_login and inputs username, password, ip_address. Keep syntax consistent with auth_login.tq.
```

**P4.4 — pxir vs tq**

```text
Compare parse_pxir.py vs parse_tq.py responsibilities in one table: input syntax, output shape, error code families.
```

**P4.5 — ensures politikası**

```text
Propose a policy mapping ensures <clause> to postconditions (or explicit ignore) aligned with CORE_SPEC. No code—design only, max 10 bullets.
```

---

## 5 — Test ve golden

**P5.1 — Yeni pytest**

```text
Add a pytest that loads <json path>, runs validate_ir (or orchestrator), asserts readiness flags. Mirror style of tests/test_golden_ir.py. Minimal code.
```

**P5.2 — Negatif test**

```text
Add tests/data negative case for <diagnostic code>: invalid bundle snippet + assert code appears in diagnostics. Minimal file footprint.
```

**P5.3 — Golden güncelle**

```text
This golden file changed behavior (paste diff intent). List which tests under tests/ must be updated and why—file:line if possible.
```

**P5.4 — Parametrize**

```text
Refactor repeated IR tests into @pytest.mark.parametrize without changing assertions. Touch only the test file I name.
```

**P5.5 — Website gate**

```text
Given ir_goal (paste), predict whether tests/test_website_generation_gate.py passes; cite artifact_builder requirements.
```

**P5.6 — Parity**

```text
Explain what tests/test_engine_parity_ci.py checks and when it skips. No code.
```

---

## 6 — CLI ve otomasyon

**P6.1 — Komut öner**

```text
I want to validate bundle X and run diagnostics. List exact torqa CLI invocations from src/cli/main.py help text patterns. No execution.
```

**P6.2 — Yeni alt komut taslağı**

```text
Design a new torqa subcommand <name> with args <...>. stdin/stdout contract; exit codes; which existing modules to call. No implementation.
```

**P6.3 — CI adımı**

```text
Propose a new GitHub Actions step (yaml snippet) that runs only tests matching -k <pattern>. Must use existing workflow style in .github/workflows/ci.yml.
```

**P6.4 — Script**

```text
Add scripts/<name>.py that wraps existing Python APIs (no new semantics). argparse; exit 1 on failure; docstring with example invocation.
```

---

## 7 — Şema ve spec

**P7.1 — Şema uyumu**

```text
Does this JSON (paste) satisfy spec/IR_BUNDLE.schema.json? List each failure path as JSON Pointer + keyword.
```

**P7.2 — Spec cümlesi**

```text
Find the normative sentence in docs/CORE_SPEC.md that governs <topic>. Quote one sentence only with file path.
```

**P7.3 — Versiyon bump**

```text
List all files that must change if CANONICAL_IR_VERSION bumps from 1.4 to 1.5. Checklist only.
```

**P7.4 — AEM**

```text
Summarize AEM σ / aem_codes responsibilities in Python executor vs Rust (paths only + one line each).
```

---

## 8 — Projeksiyon ve codegen

**P8.1 — artifact_builder**

```text
Which files does artifact_builder emit for website target? List paths; note which are required by can_generate_simple_website.
```

**P8.2 — Yeni stub**

```text
Add a minimal projection stub file pattern for language <L> consistent with existing generated/<L>/ layout. Show orchestrator hook points only—plan, no large patch.
```

**P8.3 — CI webapp**

```text
Trace scripts/ci_build_generated_webapp.py steps. What failure modes produce exit 1?
```

**P8.4 — SQL yüzeyi**

```text
From pasted ir_goal, describe expected generated/sql artifacts and one invariant test idea.
```

**P8.5 — Patch önizleme**

```text
How does POST /api/preview-patch differ from full run? Cite Python module and one key function.
```

---

## 9 — Güvenlik ve proposal gate

**P9.1 — Gate çalıştır**

```text
Explain torqa proposal-gate: inputs, checks, exit meaning. File: src/evolution/ai_proposal_gate.py.
```

**P9.2 — Secret tarama**

```text
What patterns does the light secret scan catch? Suggest one false-positive-prone pattern and mitigation—design note only.
```

**P9.3 — Güvenli diff**

```text
Review this proposed IR diff (paste). Flag any risk: new effects, new external strings, metadata drift. No moralizing; technical bullets only.
```

---

## 10 — Rust ve parity

**P10.1 — Rust evaluator**

```text
Where is default_reference_runtime defined and what builtins must match Python for parity tests?
```

**P10.2 — FFI**

```text
Summarize Python↔Rust execute path in one diagram (mermaid or ascii). Max 15 lines.
```

**P10.3 — cargo öncesi**

```text
What must be true in repo before cargo test passes in CI rust job? Environment + pip install -e . if relevant.
```

---

## 11 — Dokümantasyon

**P11.1 — README parçası**

```text
Write a "Quickstart validate" section for README: 3 commands, copy-paste, no fluff. English.
```

**P11.2 — Playbook senkron**

```text
Diff docs/AI_FIRST_PROMPT_PLAYBOOK.md against actual CLI and parse_tq implementation; list stale lines to update.
```

**P11.3 — CHANGELOG maddesi**

```text
One conventional-commit style bullet summarizing these user-visible changes (paste summary). No scope creep.
```

---

## Hızlı indeks

| ID | Konu |
|----|------|
| P1.* | Bağlam, rol, plan |
| P2.* | IR üret / genişlet |
| P3.* | Diagnostik onarım |
| P4.* | `.tq` / surface |
| P5.* | Test / golden |
| P6.* | CLI / CI script |
| P7.* | Şema / spec / versiyon |
| P8.* | Codegen / API |
| P9.* | Gate / güvenlik |
| P10.* | Rust / FFI |
| P11.* | Docs |

**Önerilen kullanım:** yeni oturumda önce **P1.1** veya Playbook **A0.1**; IR işi **P2.\*** + **P3.\***; `.tq` **P4.\***.
