# AI-native dil charter’ı (taslak)

Bu belge, TORQA’nın **yapay zekâ için üretim ve doğrulama dili** hedefini çerçeveler; normatif teknik sözleşme değildir. Ayrıntılı IR sözleşmesi için bkz. [`CORE_SPEC.md`](CORE_SPEC.md).

## (a) Hedeflenmeyen şey: insan dillerini taklit etmek

Amaç, Türkçe/İngilizce gibi doğal dillerin **akıcılığını, günlük konuşma ergonomisini veya “insan okuması öncelikli” sözdizimini** kopyalamak değildir. Okunabilirlik, yardımcı projeksiyonlar ve araç çıktıları üzerinden **ikincil** ele alınır; birincil ölçüt, ifadelerin **makine tarafından üretilmesi, denetlenmesi ve kanıtlanabilir şekilde işlenmesi**dir. “Doğal dil gibi hissettirmek”, güvenlik sınırı, deterministik çekirdek veya doğrulama modelinin yerine geçmez.

## (b) Host dil bağımsızlığı

**Host dil bağımsızlığı**, dilin anlamının, doğrulanabilirliğinin ve yürütümünün **Python veya Rust (veya başka bir uygulama dili) tarafından tanımlanmış olmaması** demektir. Bu diller yalnızca bugünkü taşıyıcılar olabilir; otorite, **dilin kendi semantik tanımı**, **kendi doğrulama kuralları** ve **kendi yürütme (operasyonel) modeli** üzerinde toplanır. Host tarafındaki kütüphaneler ve çalışma zamanları, bu tanımlara **uyumlu referans uygulamalar** veya **geçiş katmanları** olarak konumlanır; “neyin doğru sayıldığı” sorusunun nihai cevabı host API’lerine devredilmez.

## (c) Bootstrap ve hedef mimari

**Bootstrap (geçici):** Mevcut prototip; IR’yi üretmek, doğrulamak ve elden geçirmek için Python; performans ve FFI için Rust; ara yüzler ve el sıkışma için JSON/şema tabanlı kablolar. Bu katman, ürünün kalıcı tanımı değil, **erişilebilir bir yol**dur.

**Hedef mimari:** Semantik çekirdek ve doğrulama modeli **dil-spesifikasyonu düzeyinde** kapalı; genişleme **açıkça kurallı**; yürütüm tanımı host’tan ayrıştırılmış (aynı anlam, farklı referans motorlarıyla teyit edilebilir). Bootstrap kodu, bu hedefe yaklaştıkça **yetki devrini** (kimin “kaynak gerçek” olduğunu) çekirdeğe kaydırır.

## (d) Başarı ölçütleri

- **Doğrulanabilirlik:** Her anlamlı parça, şema ve/veya kurallarla kontrol edilebilir; “sadece çalışıyor” yeterli sayılmaz.
- **Deterministik çekirdek:** Öngörülebilirlik gerektiren bölümler (özellikle bütünlük ve el sıkışma) **deterministik** tutulur; belirsizlik varsa sınırları ve etkileri açıkça modellenir.
- **Genişlemenin kuralları:** Yeni yapı/taşıyıcı/efekt eklemek, çekirdeği sessizce genişletmez; **sürümleme, şema/uyumluluk sözleşmesi ve geriye dönük politika** ile bağlanır; deneysel yüzeyler ayrıştırılır.

## IRGoal ve JSON şemasıyla ilişki

Bugünkü **IRGoal**, `ir_goal` alanında taşınan yapılandırılmış çekirdeği temsil eder; **`spec/IR_BUNDLE.schema.json`** (JSON Schema) ve [`CORE_SPEC.md`](CORE_SPEC.md) bu yapının **makine tarafından okunabilir sınırını** ve el sıkışma zarfını (`ir_goal` zorunlu, isteğe bağlı `library_refs`) tanımlar. Dolayısıyla JSON şeması, hedef dilin kendisi değil, **şimdilik kanonik kablo biçimi ve doğrulama iskeleti**dir: ileride yüzey sözdizimi veya ikili bir temsil gelse bile, aynı anlamsal IRGoal (veya onun evrimi) **tek mantıksal gerçeklik** olarak kalır; şema sürümleri bu gerçekliğin taşınmasını ve araç zincirinin uyumunu sabitler.
