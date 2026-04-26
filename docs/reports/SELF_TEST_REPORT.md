# TEST REPORT — Torqa self-evaluation

**Environment:** Windows, `python -m torqa` from repo root (after `pip install -e ".[dev]"`).  
**Date:** filled by maintainer / CI.

---

## Nasıl tekrarlanır? (Quick rerun)

1. Repo kökünde terminal aç.
2. Mutlu yol: aşağıdaki `torqa` veya `python -m torqa` komutlarını çalıştır.
3. Kırık yol: `examples/self_test_broken/` altındaki dosyalar bu rapor için oluşturulmuştur; silersen aynı içerikle yeniden yaz.
4. Profil karşılaştırması: `examples/approval_flow.tq` (**severity high**) ve `examples/ai_generated.json` (**severity low**) ile fark net görülür.

---

## 1. Happy path

| Check | Result |
|-------|--------|
| `torqa validate examples/approval_flow.tq` | **PASS** (exit 0) |
| `torqa validate examples/ai_generated.json` | **PASS** (exit 0) |
| `torqa doctor examples/approval_flow.tq --profile default` | **PASS** (exit 0) |
| `torqa doctor examples/approval_flow.tq --profile strict` | **FAIL** (exit 1) — *beklenen: strict, `severity high` ile policy FAIL* |

### Observed (sample run)

**approval_flow.tq (`validate`, default profile):**  
Structural/Semantic/Logic PASS → `Trust profile: default` → `Policy validation: PASS` → `Review required: yes` → `Risk level: high` → `Why:` includes severity-high trust reason → `Result: PASS` + Handoff line.

**ai_generated.json:**  
`Review required: no`, `Risk level: low`, “Within current heuristics…”

**doctor + strict on approval_flow:**  
`Policy validation: FAIL`, error: severity `high` not allowed under strict; Summary blocked.

**Checks:**  
- [x] PASS where expected (default/doctor default).  
- [x] Risk/review coherent: high severity → review + high risk on default; JSON low → review no + low risk.  
- [x] Profile change matters: **strict** blocks `approval_flow.tq` while **default** passes.

---

## 2. Failure path

| Fixture | Block? | Notes |
|---------|--------|--------|
| `examples/self_test_broken/missing_owner.tq` | **Yes** (exit 1) | Policy FAIL; `Risk level: high`; parse/semantics OK first |
| `examples/self_test_broken/missing_severity.tq` | **Yes** (exit 1) | Policy FAIL; `Risk level: high` |
| `examples/self_test_broken/unknown_step.tq` | **Yes** (exit 1) | **Parse FAIL** (`PX_TQ_UNKNOWN_FLOW_STEP`) — policy/risk **not reached** |

### Observed

- Missing owner/severity: clear `Policy errors:` lines; `Guardrail: spec blocked…`.
- Unknown step: stable error code, line number, allowed steps listed — **no** Risk/Review block (fails earlier).

**Checks:**  
- [x] Blocks bad specs.  
- [x] Errors understandable (policy vs parse distinguished).  
- [x] `Risk level: high` when policy fails (owner/severity).  
- [x] `review_required: no` for these two policy failures (severity not high).

---

## 3. Trust profiles (same spec, three profiles)

### `examples/ai_generated.json` (low severity, small graph)

| Profile | Policy | Review req. | Risk | Verdict |
|---------|--------|-------------|------|---------|
| **default** | PASS | no | low | All PASS |
| **strict** | PASS | no | low | All PASS — *only “Why” wording differs slightly (strict mentions ≤3 transitions)* |
| **review-heavy** | PASS | no | low | Same as default here |

*Bu dosyada* `severity` düşük ve geçiş sayısı az olduğu için üç profil de **aynı sonucu** verir; fark çoğunlukla **`Why:`** metninde.

### `examples/approval_flow.tq` (`severity high`)

| Profile | Policy | Result |
|---------|--------|--------|
| **default** | PASS | validate **PASS** |
| **strict** | FAIL | validate **FAIL** (severity high forbidden) |
| **review-heavy** | PASS | validate **PASS**; `Review required: yes` (high severity) |

**Checks:**  
- [x] Anlamlı profil farkı: **strict** yüksek severity’yi **policy hatası** yapıyor.  
- [x] Açıklanabilir: `Policy errors:` / `Why:` metinleri profili belirtiyor.

---

## 4. UX notes

**GOOD:**  
- Tek komutla katmanlar sıralı (parse → structure → semantics → trust).  
- `PX_TQ_*` ile parse hataları ayırt edilebilir.  
- Strict vs default, `approval_flow` ile net demo.

**BAD:**  
- Parse aşamasında düşen dosyada Risk/Review yok — beklenen; yine de yeni kullanıcı şaşırabilir.

**CONFUSING:**  
- Aynı dosya (`ai_generated.json`) üç profilde neredeyse aynı çıktı — fark göstermek için **`approval_flow.tq`** veya **>3 transition**’lı örnek kullan.

**MISSING:**  
- İsteğe bağlı: `review-heavy` farkını göstermek için `len(transitions) > 3` örneği (dokümantasyonda anlatılıyor).

---

## 5. Verdict

| Question | Answer |
|----------|--------|
| **Shareable yet?** | **yes** — with note that profile demos need the right fixture (`severity high` for strict). |
| **Biggest weakness** | Profil farkı “düşük risk” örneklerde görünmez; kullanıcıya hangi dosyayla test edeceği söylenmeli. |
| **Next fix** | İsteğe bağlı: `docs/` içine kısa “manual self-test” bölümü veya bu raporu periyodik güncelleme. |

---

## Komut özeti (kopyala-yapıştır)

```bash
# Mutlu yol
python -m torqa validate examples/approval_flow.tq
python -m torqa validate examples/ai_generated.json
python -m torqa doctor examples/approval_flow.tq --profile default
python -m torqa doctor examples/approval_flow.tq --profile strict

# Profiller (aynı JSON)
python -m torqa validate examples/ai_generated.json --profile default
python -m torqa validate examples/ai_generated.json --profile strict
python -m torqa validate examples/ai_generated.json --profile review-heavy

# Profiller (yüksek severity — strict FAIL)
python -m torqa validate examples/approval_flow.tq --profile default
python -m torqa validate examples/approval_flow.tq --profile strict
python -m torqa validate examples/approval_flow.tq --profile review-heavy

# Kırık örnekler
python -m torqa validate examples/self_test_broken/missing_owner.tq
python -m torqa validate examples/self_test_broken/missing_severity.tq
python -m torqa validate examples/self_test_broken/unknown_step.tq
```

`torqa` PATH’teyse `python -m torqa` yerine `torqa` kullan.
