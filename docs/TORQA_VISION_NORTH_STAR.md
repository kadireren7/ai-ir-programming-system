# TORQA — Kuzey yıldızı (asıl fikir, unutulmaması gereken)

Bu dosya **ürün ve AI kullanım modelinin** tek sayfalık özetiidir. **Normatif teknik sözleşme değildir**; şema ve kurallar için `docs/CORE_SPEC.md`, `docs/FORMAL_CORE.md`, `spec/IR_BUNDLE.schema.json` esastır. Charter ile çelişki olursa **önce spec**, bu belge **yön** olarak güncellenir.

---

## 1. Ne inşa ediliyor?

**TORQA = yapay zekânın yazdığı dar, sıkı, makinece doğrulanan anlam katmanı.**  
Pratikte bugün bu **kanonik IR (JSON) + kurallar + (isteğe bağlı) `.tq` yüzeyi** ile temsil edilir. Amaç ileride daha da **kompakt bir wire** olabilir; fikir aynı kalır.

**GitHub’da Rust ekosistemi gibi görünmek** = dil + araç + test + doküman + sürüm disiplini; ayrı bir **sunum ve organizasyon** hedefi, çekirdek tanımın yerine geçmez.

---

## 2. Ana kazanımlar (neden var?)

| Hedef | Anlam |
|--------|--------|
| **Aşırı az token** | Küçük kelime dağarcığı, sabit AST şekilleri, tek nesne / tur başına net format (bkz. `docs/AI_GENERATION_PROFILE.md`). |
| **Hata “imkansız” olsun** | Felsefi %100 değil; **mühendislik**: modelin çıktısı **şema ve fazlı doğrulamadan geçmezse üretim sayılmaz** — reddet, düzelt, tekrar dene. |
| **Büyük iş, küçük ifade** | Uygulama mantığı **TORQA/IR** ile kısaca tanımlanır; dosya ağaçları **projeksiyon** ile üretilir. |
| **Otomatik geliştirme** | Öneri → gate → test → migrasyon hattına bağlanabilir (repoda kancalar mevcut; politika ve kapsam büyür). |

---

## 3. AI site mi yazar, yoksa TypeScript zorunlu mu? (kafa karışıklığının cevabı)

**Doğru model:**

- **AI’nın zorunlu yazdığı:** **TORQA / IR** (az token, sıkı sınır).
- **Sistemin ürettiği (çoğu senaryoda):** **TypeScript, Rust, SQL, …** — **çalışan kod ve şablonlar**; bunlar **çıktı katmanı**.
- **Tarayıcı / sunucu:** Hâlâ **TS/JS, WASM, native** vb. çalıştırır; bu normal ve kaçınılmazdır.

Özet cümle:

> **Website “AI uzun uzun React yazar” diye yapılmaz; AI kısa TORQA/IR verir, site dosyaları araç çıktısıdır.**

**Zorunlu:** AI hedefi **TORQA/IR**.  
**Zorunlu değil:** AI’nın doğrudan “güncel dille” tüm uygulamayı serbest yazması — o, isteğe bağlı veya ince SDK tarafı.

---

## 4. İnsan yüzeyi ve paketler

- **İnsan için yüzey** (`.tq`, editör) **şimdilik ikincil** olabilir; **otorite** IR + doğrulama.
- **Benimseme:** TORQA çekirdeğinin yanında **resmî ince SDK’lar** (ör. npm’de `@torqa/…`, PyPI `torqa`, …) — **aynı şemayı** uygular; semantiği her dilde kopya kopya yeniden yazmak hedef değildir.

---

## 5. Bu belgeyle diğer dokümanlar

| Belge | Rol |
|--------|-----|
| **Bu dosya** | Asıl fikir, yön, “unutma” listesi. |
| `CORE_SPEC.md`, `FORMAL_CORE.md`, şema | **Normatif** teknik sözleşme. |
| `AI_NATIVE_LANGUAGE_CHARTER.md` | AI-native sınırlar ve hedefler (tamamlayıcı). |
| `TORQA_NIHAI_VISION_ROADMAP.md` | Fazlı yol ve prompt zinciri (uygulama planı). |
| `AI_GENERATION_PROFILE.md` | LLM çıktı disiplini (düşük token). |

**Silme politikası:** Bu dosya **spec/charter’ın yerine geçmez**. Çakışan *ürün anlatıları* ileride tekilleştirilebilir; spec silinmez.

---

## 6. Tek paragraf (paylaşılabilir özet)

**TORQA, AI’nın düşündüğü ve yazdığı sıkı anlam dilidir: ucuz token, makine doğrulaması, hatalı çıktının sisteme girmemesi. Güncel programlama dilleri TORQA’nın rakibi değil; çalışan kodu taşıyan çıktı ve ekosistem paketleridir. Web veya başka ürün, TORQA → doğrula → projeksiyon zinciriyle üretilir; GitHub’da hedef, bu çekirdeği Rust disiplinine yakın bir dil ve araç ailesi olarak büyütmektir.**

---

## 7. Şimdi hayata geçirme (somut sıra)

1. **Sıkılık:** `pytest` + CI yeşil; `validate` / `bundle-lint` / `AI_GENERATION_PROFILE` ile golden’lar uyumlu kalsın.  
2. **Tek giriş yüzeyi:** Yeni araçlar mümkünse `src/torqa_public.py` ve `torqa` CLI; paralel “ikinci gerçek” semantik tanım yok.  
3. **Projeksiyon:** Önce şablon (`artifact_builder`); marka/tasarım ayrı iş kalemi.  
4. **İnce SDK’lar:** `docs/PACKAGE_SPLIT.md`; ileride `packages/` altında `@torqa/*` iskeleti — önce bir dil, sonra çoğalt.  
5. **Org hissi:** README + bu dosya + `CHANGELOG.md` sürüm disiplini.

Detaylı fazlar: `docs/TORQA_NIHAI_VISION_ROADMAP.md`, `ROADMAP.md`.

---

## 8. Üretim durumu (bu repoda — §7 karşılığı)

Aşağıdakiler **şu an** bu monorepoda uygulanmış kabul edilir; sürüm disiplini kök `pyproject.toml` + kök [`CHANGELOG.md`](../CHANGELOG.md) + [`IR_VERSIONING.md`](IR_VERSIONING.md).

| §7 maddesi | Karşılık |
|------------|-----------|
| **Sıkılık** | `python -m pytest`; `torqa validate` / `torqa bundle-lint`; golden’lar; [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) (Python + Rust + Vite üretim dumanı). |
| **Tek giriş yüzeyi** | `torqa` CLI (`src/cli/main.py`) ve [`src/torqa_public.py`](../src/torqa_public.py) — çekirdek API listesi [`PACKAGE_SPLIT.md`](PACKAGE_SPLIT.md). |
| **Projeksiyon** | `SystemOrchestrator` + `artifact_builder` / projeksiyon stratejisi; `torqa project` / `materialize_to_directory`. |
| **İnce SDK’lar** | `docs/PACKAGE_SPLIT.md`; `packages/js/torqa-types/` iskelet (gelecek `@torqa/*`); `pip install -e ".[preview-web]"` yer tutucu. |
| **Org hissi** | README kuzey yıldızı linki; bu dosya; `CHANGELOG.md`; bakımcı komutları [`MAINTAINER_VERIFY.md`](MAINTAINER_VERIFY.md). |

**Not:** “Üretim ürün” burada **çekirdek araç + doğrulama + deterministik ağaç üretimi + güvenli web zip** anlamındadır; host dilinde tam ürün (hosting, kimlik, ödeme) bu repunun kapsamı dışındadır.

---

*Son güncelleme: repo içi “kuzey yıldızı” olarak tutulur; strateji değişince önce bu dosya ve README bağlantısı güncellenir.*
