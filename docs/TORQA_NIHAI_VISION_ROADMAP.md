# TORQA nihai vizyon — yol haritası + faz prompt’ları

**Kuzey yıldızı (asıl fikir):** [`TORQA_VISION_NORTH_STAR.md`](TORQA_VISION_NORTH_STAR.md).

Bu belge **ürün önceliğini** netler: insanlar ve araçlar önce **TORQA** (.tq / kanonik IR) ile yazar; üretilen proje ağacı bu çekirdekten çıkar. **Çok dilli önizleme** (React, Kotlin, vb.) ayrı, güncellenebilir **ek paket(ler)** olarak kalır — çekirdeği kilitlemez.

**İlişkili prompt setleri:** [`AI_FIRST_PROMPT_PLAYBOOK.md`](AI_FIRST_PROMPT_PLAYBOOK.md) · [`TORQA_PROMPT_CATALOG.md`](TORQA_PROMPT_CATALOG.md) · [`TORQA_MAJOR_WORK_PROMPTS.md`](TORQA_MAJOR_WORK_PROMPTS.md).

---

## Faz tamamlanınca “nerede olursun?” (kabaca)

| Faz bittiğinde | Anlam |
|----------------|--------|
| **F0** | Mevcut çekirdek + CI + dokümantasyon hizası doğrulanmış “taban çizgisi”. |
| **F1** | Tek çalışma kökü: `.tq` / `ir_goal.json` → diske **deterministik ağaç** yazımı (script veya CLI); tekrarlanabilir demo. |
| **F2** | **torqa-core** (şema, doğrulama, yürütme, .tq) ile **önizleme/projeksiyon** sınırları belgelenmiş; ayrı paket için iskelet kararları. |
| **F3** | Yazarlık deneyimi: web veya masaüstünde “TORQA önce” akışı (klasör, dosya listesi, derleme). |
| **F4** | Dağıtım: sürümlü `pip` paketleri, kullanıcı migrasyon cümlesi, minimal “getting started” tek sayfa. |
| **F5** | Ekosistem başlangıcı: `library_refs` / paylaşılan IR parçaları veya kayıt defteri taslağı. |

Yüzde vermek bilimsel değil; pratik kural: **F0–F1 = çekirdek ürünün omurgası**, **F2–F4 = nihai sürüme yaklaşma**, **F5 = büyüme**.

---

## F0 — Taban çizgisi (doğrula, sonra inşa)

**Çıktı:** `pytest` yeşil; `torqa validate` / `bundle-lint` / `surface` dokümante; Rust CI yeşil (Linux).

**Prompt F0.1 — Sağlık kontrolü**

```text
TORQA repo. Run mentally: list commands to verify (pytest full, torqa --help subcommands, optional cargo test). Output a copy-paste bash block for maintainers. No code changes.
```

**Prompt F0.2 — Çekirdek vs önizleme envanteri**

```text
List every module path under src/codegen and src/projection that emits host-language files (TS, SQL, Kotlin, …). Classify each as CORE (required for IR validity story) vs PREVIEW (replaceable template). Table: path | classification | one-line rationale.
```

**Prompt F0.3 — Playbook hizası**

```text
Read docs/TORQA_NIHAI_VISION_ROADMAP.md phases F1–F2. List which existing files already satisfy partial F1 (e.g. ci_build_generated_webapp, torqa surface). Gaps only.
```

---

## F1 — “Her şey TORQA’dan dosya” (minimum ürün omurgası)

**Çıktı:** `PROJECT_ROOT` altında: kaynak `.tq` veya `ir_goal.json` + `torqa project` (veya eşdeğer) ile `generated/` (veya seçilen çıktı kökü) **idempotent** yazılır; README’de tek komut örneği.

**Prompt F1.1 — Proje komutu spesifikasyonu**

```text
Design CLI: torqa project --root <dir> --source <path.tq|bundle.json> --out generated. Contract: stdout JSON summary { "written": [...], "errors": [...] }; exit 1 if validate fails. Reuse SystemOrchestrator and existing materialize logic; minimal new code. List files to touch.
```

**Prompt F1.2 — Implement torqa project**

```text
Implement the F1.1 design. Add tests under tests/ that use a tmp_path, run project command, assert key files exist and second run is idempotent (or documented overwrite policy). Match repo style.
```

**Prompt F1.3 — Örnek repo şablonu**

```text
Add examples/workspace_minimal/ with one .tq file and README: two commands — compile to IR, run torqa project to emit tree. No large assets.
```

**F1 bitti sayılır:** CI’da veya dokümanda bu akış **tek blokta** anlatılıyor ve test kırılmıyor.

---

## F2 — Paket ayrımı (çekirdek vs torqa-preview-*)

**Çıktı:** `docs/PACKAGE_SPLIT.md` (veya bu dosyada alt bölüm): hangi bağımlılıklar çekirdekte kalır; önizleme paketi `vite`, `npm` gibi şeyleri **optional extra** taşır. `pyproject.toml` için **optional-dependencies** veya ayrı repo şablonu kararı yazılı.

**Prompt F2.1 — Paket sınırı tasarımı**

```text
Propose split: package A torqa-core (no Node), package B torqa-preview-web (depends on core, runs npm/vite helpers). For monorepo: use optional extras [preview-web]. List what moves from src/codegen to preview package in phase 1 vs phase 2. No code yet.
```

**Prompt F2.2 — Extra ile izolasyon**

```text
If staying monorepo: gate heavy preview behind pip install -e ".[preview-web]" and document in README. Implement only pyproject optional extra + import-time guard or lazy imports so core tests never require Node. Minimal diff.
```

**Prompt F2.3 — Public API yüzeyi**

```text
Define stable Python public API for "core only": 5 functions or classes (e.g. parse_tq_source, validate_bundle, build_generation_plan). List in docs/PACKAGE_SPLIT.md. No re-export spam from compat/.
```

**F2 bitti sayılır:** Yeni katkıcı “önizleme = ekstra” diyebiliyor; belge ve `pyproject` uyumlu.

---

## F3 — İnsanın gördüğü TORQA öncelikli UX

**Çıktı:** Web veya Tauri/Electron MVP: solda `.tq` / IR, sağda “çıktı ağacı” listesi; **Compile** → **Write to disk** (veya zip indir). Önizleme dili ikincil (ayrı sekme veya “Install preview extra”).

**Prompt F3.1 — Web MVP**

```text
Extend `website/server`: add "Project" mode — user pastes or loads .tq, compiles to IR, then POST /api/materialize-project with target root path OR returns zip of generated tree (choose one for security). Document threat model (no arbitrary path without auth). Tests with TestClient.
```

**Prompt F3.2 — Masaüstü kabuk (ince)**

```text
Using existing desktop/ package: add menu action "Generate into folder" calling same Python API as torqa project (subprocess or import). Document Windows path caveats. Minimal Tk or reuse pywebview route.
```

**Prompt F3.3 — VS Code / Cursor**

```text
Update editors/vscode-torqa: tasks.json snippet or README section — run torqa surface on save optional; link to TORQA_NIHAI_VISION_ROADMAP F1 commands.
```

**F3 bitti sayılır:** Kullanıcı akışı **TORQA yaz → üret** olarak demo edilebilir.

---

## F4 — Nihai sürüm dağıtımı (sürüm, migrasyon, güven)

**Çıktı:** Anlamlı `version` (pyproject), etiketleme politikası, `IR_VERSIONING.md` ile uyum; Docker/README tek giriş noktası.

**Prompt F4.1 — Sürüm ve CHANGELOG disiplini**

```text
Add CHANGELOG.md with Keep a Changelog format. Link IR version bump checklist from docs/IR_VERSIONING.md. First entry describes package split / F2 if done.
```

**Prompt F4.2 — Güvenlik gözden geçirme**

```text
Review `website/server` materialize and project APIs for path traversal and zip slip. List fixes with CVE-style severity wording; implement minimal path canonicalization tests.
```

**F4 bitti sayılır:** Dışarıya “1.x deney” demek için yeterli süreç var.

---

## F5 — Ekosistem (sonraki büyüme)

**Çıktı:** `library_refs` için örnek paket + kilitleme; veya `TORQA_PROJECTION_MODULE` dokümantasyonu + bir örnek eklenti repo şablonu.

**Prompt F5.1 — Paylaşılan IR paketi örneği**

```text
Add examples/packages/demo_lib/ with small IR fragment and consuming bundle using library_refs; validate in pytest. Document limits in CORE_SPEC pointer.
```

**Prompt F5.2 — Önizleme paketi şablonu**

```text
Scaffold empty repo layout docs/TEMPLATE_preview_package.md — pyproject depends on torqa, entry point TORQA_PROJECTION_MODULE, one noop projection test.
```

**F5 bitti sayılır:** Üçüncü taraflar “önizleme” ekleyebileceğini anlıyor.

---

## Tek seferde çalıştırılacak “sprint zinciri” (özet)

Aynı modele veya sırayla:

1. **F0.1 → F0.2 → F0.3** (1 oturum)  
2. **F1.1 → F1.2 → F1.3** (1–2 oturum)  
3. **F2.1 → F2.2 → F2.3**  
4. **F3.1** veya **F3.2** (birini seç)  
5. **F4.1 → F4.2**  
6. **F5.*** (isteğe bağlı)

Her faz sonunda: `TORQA_MAJOR_WORK_PROMPTS.md` içindeki **M5** çıktı disiplini (dosya listesi + pytest özeti + migrasyon cümlesi + commit önerisi).

---

## Nihai vizyon cümlesi (tek satır)

> **TORQA ile yaz; çekirdek doğrulasın ve proje ağacını üretsin; çok dilli önizleme ayrı paketle güncellenir.**

---

## Uygulama durumu (repo; F0–F5 özeti)

| Faz | Durum | Öne çıkan çıktılar |
|-----|--------|-------------------|
| **F0** | Tamamlandı | [`MAINTAINER_VERIFY.md`](MAINTAINER_VERIFY.md), [`CODEGEN_INVENTORY.md`](CODEGEN_INVENTORY.md), [`F1_F2_GAP.md`](F1_F2_GAP.md) |
| **F1** | Tamamlandı | `torqa project` (`src/cli/main.py`, `src/project_materialize.py`), [`examples/workspace_minimal/`](../examples/workspace_minimal/) |
| **F2** | Monorepo içi | [`PACKAGE_SPLIT.md`](PACKAGE_SPLIT.md), `src/torqa_public.py`, `pyproject.toml` → `[preview-web]` (placeholder extra) |
| **F3** | Kısmen | Web: `POST /api/materialize-project-zip` + **Download ZIP** (`website/server/`). Masaüstü: `materialize_project` / **Üretim ağacı yaz** (`desktop/`). VS Code: [`editors/vscode-torqa/tasks.json`](../editors/vscode-torqa/tasks.json) + [`README.md`](../editors/vscode-torqa/README.md) |
| **F4** | Tamamlandı | [`CHANGELOG.md`](../CHANGELOG.md), [`WEBUI_SECURITY.md`](WEBUI_SECURITY.md), güvenlik testleri (`tests/test_materialize_security.py`) |
| **F5** | Örnek + şablon | [`examples/packages/demo_lib/`](../examples/packages/demo_lib/), [`examples/core/consumes_torqa_demo_lib.json`](../examples/core/consumes_torqa_demo_lib.json), [`TEMPLATE_preview_package.md`](TEMPLATE_preview_package.md) |

**PyPI’de ayrı `torqa-core` / `torqa-preview-web` paketleri** henüz yok; ayrım tasarımı `PACKAGE_SPLIT.md` içinde.
