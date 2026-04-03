# TORQA — büyük işler + depo temizliği prompt rehberi

Bu dosya **gözle görülür dil/sistem değişiklikleri** ve **güvenli dosya/klasör sadeleştirmesi** için modele verilecek büyük promptları içerir. Küçük şablonlar için: [`TORQA_PROMPT_CATALOG.md`](TORQA_PROMPT_CATALOG.md), faz sırası için: [`AI_FIRST_PROMPT_PLAYBOOK.md`](AI_FIRST_PROMPT_PLAYBOOK.md).

## Uygulama özeti (bu depoda güncel)

Aşağıdaki **M1–M3** maddelerinin çoğu koda yansıdı; yeni iş öncesi burayı kontrol edin.

| Alan | Ne var | Ana girdi noktaları |
|------|--------|----------------------|
| **CLI** | `language --minimal-json`, `bundle-lint`, `surface` (.tq/.pxir) | `src/cli/main.py`, `README.md` Quickstart |
| **Web** | IR / `.tq` modu, örnek yükleme, derleme | `GET /api/examples/tq/{name}`, `POST /api/compile-tq`, `GET /api/examples` → `tq_examples` — `website/server/app.py`, `website/static/*` |
| **.tq** | `ensures session.created` → `postcondition` (`session_stored_for_user`); `forbid locked` eş anlamlıları; `unless` → `PX_TQ_UNLESS_UNSUPPORTED` | `src/surface/parse_tq.py`, `tests/test_surface_tq.py` |
| **Builtin** | `session_stored_for_user(text)` | `src/semantics/ir_semantics.py`, `src/execution/ir_execution.py`, `rust-core/src/execution/evaluator.rs`, `examples/core/valid_session_postcondition_flow.json` |
| **Kotlin stub** | `generated/kotlin/Main.kt` yolu | `tests/test_kotlin_stub.py`, `artifact_builder` / orchestrator kancaları |
| **Diagnostik** | Sık kodlar için `hint` + `FORMAL_CORE` bağlantısı | `src/diagnostics/user_hints.py`, `build_full_diagnostic_report` |
| **Docker** | OCI `LABEL` (title/version) | `Dockerfile`, `README.md` (`docker inspect` notu) |
| **Arşiv** | Eski v3/v4 plan notları | `docs/archive/INDEX.md`, `docs/DEPRECATION_MAP.md` → `docs/archive/v4_cleanup_and_deprecation_plan.md` |

**Rust:** Yerelde MSVC `link.exe` yoksa `cargo test` çalışmayabilir; **CI (Linux)** parity / Rust job esas alınmalı.

**Kullanıcı migrasyonu:** Eski `docs/v4_*.md` kök yolları → `docs/archive/v4_*.md`. `.tq` `ensures` / desteklenmeyen `forbid` / `unless` için `PX_TQ_*` kodlarına bakın.

---

## Güvenlik kuralları (her oturumda modele hatırlat)

```text
TORQA repo. Before deleting any tracked file: (1) rg/grep for imports, path references in tests, CI, Dockerfile, pyproject, README. (2) Never delete spec/, examples/core/, rust-core/src/, src/ without proof of zero references. (3) Never commit rust-core/target/, .pytest_cache/, .ci_out/, *.egg-info/, dist/, build/ — they belong in .gitignore only. (4) After deletes or moves: run full pytest and cargo test (if Rust changed). (5) Prefer git rm for tracked files; document breaking changes in CHANGELOG or README if public API (root shims, CLI) changes.
```

---

## Bölüm M1 — Depo hijyeni ve “Project-X” / VS Code

**M1.1 — Envanter (silmeden önce)**

```text
List every file at repository root (depth 1) with extension .py. For each, say whether it is a shim to src.*, entry script, or orphan. Cite one import line if shim. Do not delete yet.
```

**M1.2 — Yinelenen / kazara kopya dokümanlar**

```text
Find duplicate or near-duplicate markdown under docs/ (same title, " (2)" suffix, or identical first 20 lines). Recommend delete or merge targets; show rg evidence. Minimal diff: delete only confirmed duplicates after grep shows no links to the removed path.
```

**M1.3 — Build çıktısı git’te mi?**

```text
Verify rust-core/target/, .ci_out/, .pytest_cache/ are gitignored and not tracked. If any path is tracked, run git rm -r --cached on that path only, keep local files optional. Do not add new binary artifacts.
```

**M1.4 — Workspace görünür adı**

```text
Repository folder on disk may still be named Project-X. Add or update Torqa.code-workspace at repo root so VS Code shows a clear folder label "TORQA" and window title includes "TORQA". Document in README § IDE: open via File > Open Workspace from File… selecting Torqa.code-workspace. Do not rename the user’s disk folder automatically (that is a manual OS action).
```

**M1.5 — Kök shim’lerin kaderi**

```text
Legacy shims live under compat/*.py (re-export src.*). Search GitHub-style usage for old root imports (import canonical_ir, etc.). Migration: use src.* or compat.<module>. Do not reintroduce root-level *.py shims.
```

**M1.6 — docs/ arşivleme**

```text
Identify docs that are purely historical (v3, v4 plans, superseded rust migration drafts). Propose moving to docs/archive/ with a single docs/archive/INDEX.md listing moved files and "superseded by" pointers. Implement moves + index; fix no more than 3 inbound links in README or ROADMAP.
```

---

## Bölüm M2 — TORQA dilinde görünür özellikler (.tq / IR)

**M2.1 — `ensures` → gerçek postcondition**

```text
Extend parse_tq.py so a line like `ensures session.created` maps to a valid IR postcondition (or documented policy with PX_TQ_* when impossible). Update examples/torqa/*.tq and tests/test_surface_tq.py. Run torqa surface on each example; pytest full suite.
```

**M2.2 — `forbids` veya `unless` yüzeyi**

```text
Design optional .tq syntax for forbids (aligned with IR forbids[]). Implement minimal parser branch + mapping + tests; update editors/vscode-torqa grammar if needed for highlighting.
```

**M2.3 — CLI: `torqa language`**

```text
Add CLI subcommand that prints minimal_valid_bundle_json and registry table (reuse authoring_prompt helpers). stdout stable for scripting; document in README Quickstart.
```

**M2.4 — Web konsolda .tq sekmesi veya örnek**

```text
In the site/API host (`website/server`), add a visible UX element: either a second Monaco tab "TORQA (.tq)" with sample from examples/torqa/signin_flow.tq, or a dropdown example that loads .tq and compiles via new internal API wrapping parse_tq_source. Must fail gracefully with PX_TQ_* display. Add/adjust tests/test_webui*.py if HTTP surface changes.
```

**M2.5 — Tanılama mesajları (kullanıcıya görünür)**

```text
Pick 5 frequent diagnostic codes. For each, ensure user-facing string in report or CLI includes: phase name, one-line fix hint, link to docs/FORMAL_CORE.md anchor if present. Add tests in tests/test_diagnostics.py if output shape changes.
```

---

## Bölüm M3 — Sistem / motor / codegen (büyük görünür etki)

**M3.1 — Yeni stdlib builtin (uçtan uca)**

```text
Add one new predicate or void effect to default_ir_function_registry with docstring, Python runtime impl, Rust default_reference_runtime parity, golden JSON example under examples/core/, and pytest covering validate + execute path. Visible to AI profile table in docs/AI_GENERATION_PROFILE.md if vocabulary changes.
```

**M3.2 — Yeni projeksiyon hedefi**

```text
Add a new projection stub language (e.g. Kotlin or Go enhancement) in artifact_builder / orchestrator path: at least one generated file under generated/<lang>/, one invariant test, documented in ROADMAP. Keep CI time reasonable.
```

**M3.3 — `torqa bundle-lint` (P6.2 somut)**

```text
Implement torqa bundle-lint <file.json>: stdout JSON summary of issue count by phase; exit 1 if ok=false. Reuse validate + build_full_diagnostic_report. Tests in tests/test_cli.py.
```

**M3.4 — Docker görünür etiket**

```text
Set Docker image OCI labels (org.opencontainers.image.title=TORQA, version from pyproject) and README badge or one-liner so docker inspect shows identity, not generic "project-x".
```

---

## Bölüm M4 — Tek seferlik “büyük temizlik” oturumu (prompt zinciri)

Sırayla aynı modele veya oturumlara bölerek verin; her adımda **pytest**.

1. **M1.1** → **M1.3** → **M1.2** (sıra: ne var, git temizliği, doc duplicate)  
2. **M1.4** + README IDE notu  
3. **M2.1** veya **M3.1** (bir dil özelliği seç)  
4. **M1.6** (isteğe bağlı, büyük docs hareketi)

---

## Bölüm M5 — Çıktı disiplini

```text
After completing a major task: (1) list files added/removed/moved. (2) paste pytest summary line. (3) if CLI or schema changed, give one migration sentence for users. (4) suggest conventional commit subject line.
```

---

## Bu repoda yapılan somut temizlik (referans)

- `rust-core/target/` artık git indeksinden çıkarılmalıydı (yalnızca yerelde `cargo build` ile üretilir); `.gitignore` zaten `**/target/` kapsıyor.  
- Yinelenen `docs/checkpoint_push_readiness (2).md` kaldırıldı; tarihsel örnek `docs/archive/precursor_and_plans/checkpoint_push_readiness.md` altında.  
- VS Code için kökte `Torqa.code-workspace` eklendi — klasör adı diskte hâlâ `Project-X` olsa bile çalışma alanı adı **TORQA** görünür.
- **M1.6:** `docs/v3_*.md` ve `docs/v4_*.md` plan taslakları `docs/archive/` altında; `docs/archive/INDEX.md`, `DEPRECATION_MAP.md`.
- **M2 / M3 (özeti):** Yukarıdaki **Uygulama özeti** tablosu. Ayrıca `editors/vscode-torqa` anahtar kelimeleri (`unless`, `forbid`, …); `docs/AI_GENERATION_PROFILE.md` builtin satırı.

### M1.1 — `compat/` paketi (eski kök shim’ler)

| Konum | Rol |
|--------|-----|
| `compat/torqa_cli.py` | `python -m compat.torqa_cli` → `src.cli.main` |
| `compat/canonical_ir.py`, `compat/system_orchestrator.py`, … | İnce shim: `from src.* import *` |
| Kök dizinde artık bu modüller yok; yeni kod yalnızca `src.*` veya `torqa` CLI. |

**M1.5:** Shim’ler `compat/` altında tutuluyor; dışarıdan `import canonical_ir` (kök) **kırıldı** → `from compat import canonical_ir` veya `from src.ir.canonical_ir import …`.

Disk üst klasörünü yeniden adlandırmak (`Project-X` → `torqa`): **Cursor/VS Code dışında**, Explorer veya `git mv` ile siz yapın; repo içinden otomatik yapılmaz.
