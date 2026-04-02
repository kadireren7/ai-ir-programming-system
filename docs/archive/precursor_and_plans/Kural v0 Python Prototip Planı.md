# Kural v0 Python Prototip Planı

Bu belge, Kural dilinin v0 prototipinin Python ile nasıl geliştirileceğine dair mimariyi, bileşenleri ve temel tasarım kararlarını detaylandırmaktadır. Odak noktası, dilin insan-okunabilir yüzey katmanını ayrıştırmak ve AI-odaklı çekirdek temsiline dönüştürmek, ayrıca temel doğrulama kontrollerini gerçekleştirmektir.

## 1. Ayrıştırıcı (Parser) Mimarisi

Kural v0 ayrıştırıcısı, iki ana aşamadan oluşacaktır: sözcüksel analiz (lexer) ve sözdizimsel analiz (parser).

### 1.1. Sözcüksel Analiz (Lexer/Tokenizer)

*   **Görev:** Kural kaynak kodunu bir dizi anlamlı birime (token) bölmek. Bu tokenlar anahtar kelimeler (`hedef`, `girdi`, `gerektirir`, vb.), tanımlayıcılar (değişken adları, fonksiyon adları), operatörler (`==`, `>`, `ve`, `veya`), değişmezler (sayılar, metinler) ve yorumlar gibi öğeleri içerecektir.
*   **Teknoloji:** Python'ın `re` modülü veya basit bir elle yazılmış durum makinesi kullanılacaktır. Düzenli ifadeler, token desenlerini tanımlamak için idealdir.
*   **Çıktı:** Her bir token için tipini (örneğin, `KEYWORD`, `IDENTIFIER`, `NUMBER`, `STRING`), değerini ve kaynak kodundaki konumunu (satır, sütun) içeren bir nesne veya demet listesi.

### 1.2. Sözdizimsel Analiz (Parser)

*   **Görev:** Lexer'dan gelen token akışını kullanarak, dilin EBNF dilbilgisine uygun olarak bir Soyut Sözdizimi Ağacı (AST) oluşturmak. Bu aşama, dilin yapısal doğruluğunu kontrol eder.
*   **Teknoloji:** V0 için, karmaşıklığı düşük tutmak amacıyla elle yazılmış bir **özyinelemeli inişli ayrıştırıcı (recursive descent parser)** tercih edilecektir. Bu yaklaşım, dilbilgisinin her kuralı için bir Python fonksiyonu yazmayı içerir. Daha sonraki versiyonlarda `PLY` veya `Lark` gibi ayrıştırıcı üreteçleri düşünülebilir.
*   **Çıktı:** Kural kodunun yapılandırılmış bir Python sözlüğü olarak temsili. Bu sözlük, daha önce tanımlanan JSON AST yapısını birebir yansıtacaktır.

## 2. Doğrulayıcı (Verifier) Mimarisi

Ayrıştırma işleminden sonra, doğrulayıcı AST üzerinde anlamsal analiz yaparak programın mantıksal tutarlılığını ve kurallara uygunluğunu kontrol edecektir.

### 2.1. Anlamsal Analiz

*   **Görev:** AST'yi gezerek tip kontrolü, tanımlayıcı çözünürlüğü ve domain-spesifik kural ihlallerini tespit etmek.
*   **Teknoloji:** AST üzerinde gezinti yapan Python fonksiyonları. Bu fonksiyonlar, her bir AST düğüm tipine özgü doğrulama mantığını içerecektir.
*   **Çıktı:** Doğrulama başarılıysa bir başarı durumu, aksi takdirde tespit edilen tüm anlamsal hataların bir listesi.

## 3. AST Yapısı

Soyut Sözdizimi Ağacı (AST), iç içe geçmiş Python sözlükleri ve listeleri kullanılarak temsil edilecektir. Bu yapı, daha önce tanımlanan JSON AST örnekleriyle uyumlu olacaktır. Temel düğüm tipleri ve özellikleri şunları içerecektir:

*   **Ana Yapı:** Her Kural programı, `hedef`, `girdi`, `gerektirir`, `yasaklar`, `etkiler`, `sonuç` gibi anahtar kelimelerin karşılık geldiği anahtar-değer çiftlerini içeren bir sözlük olacaktır.
*   **Girdi Tanımları:** `girdi` bölümü, her bir girdinin `ad` (string) ve `tip` (string: `metin`, `sayi`, `boolean`) bilgilerini içeren sözlüklerden oluşan bir liste olacaktır.
*   **Koşullar/İfadeler:** `gerektirir` ve `yasaklar` bölümleri, `tip` (örneğin, `karsilastirma`, `mantiksal_operator`, `fonksiyon_cagrisi`, `mevcut`) ve ilgili parametreleri (`sol`, `sag`, `operator`, `parametreler`, `ad`) içeren sözlüklerden oluşan listeler olacaktır.
*   **Etkiler:** `etkiler` bölümü, `atama` veya `fonksiyon_cagrisi` tiplerinde sözlüklerden oluşan bir liste olacaktır.
*   **Değişmezler:** Sayılar Python `int` veya `float`, metinler Python `str` olarak temsil edilecektir.

Örnek bir AST düğümü:

```python
{
  "tip": "karsilastirma",
  "sol": "miktar",
  "operator": ">",
  "sag": 0
}
```

## 4. Hata İşleme Kuralları

Sağlam bir hata işleme mekanizması, dilin kullanılabilirliği için kritik öneme sahiptir. Kural prototipi aşağıdaki hata türlerini ele alacaktır:

*   **Sözcüksel Hatalar:** Tanınmayan karakterler veya hatalı biçimlendirilmiş değişmezler (örneğin, kapanmamış metin dizileri). Lexer, bu tür hataları tespit ettiğinde, hatanın konumunu (satır, sütun) ve açıklamasını içeren bir `LexerError` nesnesi üretecektir.
*   **Sözdizimsel Hatalar:** Dilbilgisi kurallarına uymayan yapısal hatalar (örneğin, eksik anahtar kelimeler, yanlış operatör kullanımı, beklenmeyen tokenlar). Parser, bu tür hataları tespit ettiğinde, hatanın konumunu ve beklenen/beklenmeyen token bilgisini içeren bir `ParserError` nesnesi üretecektir.
*   **Anlamsal Hatalar:** Sözdizimsel olarak doğru ancak mantıksal olarak hatalı olan durumlar (örneğin, tanımlanmamış değişken kullanımı, tip uyumsuzlukları, mantıksal çelişkiler). Verifier, bu tür hataları tespit ettiğinde, hatanın bağlamını ve açıklamasını içeren bir `SemanticError` nesnesi üretecektir.

**Hata Raporlama:** Tüm hata türleri, dosya adı, satır numarası, sütun numarası ve açıklayıcı bir mesaj içeren standart bir formatta raporlanacaktır. Mümkün olduğunca, ayrıştırıcı ve doğrulayıcı tek bir hatada durmak yerine tüm olası hataları toplamaya çalışacaktır.

## 5. Doğrulama Kontrolleri (Verifier İçin Örnekler)

Doğrulayıcı, aşağıdaki gibi temel anlamsal kontrolleri gerçekleştirecektir:

*   **Tanımlayıcı Çözünürlüğü:** `gerektirir`, `yasaklar`, `etkiler` ve `sonuç` bölümlerinde kullanılan tüm değişkenlerin `girdi` bölümünde tanımlanmış olması veya önceden tanımlanmış (built-in) bir fonksiyon/sabit olması zorunludur.
*   **Tip Uyumluluğu:**
    *   Karşılaştırma operatörleri (`==`, `!=`, `>`, `<`, `>=`, `<=`) yalnızca uyumlu tipler arasında kullanılabilir (örneğin, `sayi` ile `sayi`, `metin` ile `metin`).
    *   Aritmetik operatörler (`+`, `-`, `*`, `/`) yalnızca `sayi` tipleri üzerinde kullanılabilir.
    *   Fonksiyon çağrılarında (hem built-in hem de potansiyel olarak genişletilebilir) argüman tiplerinin beklenen parametre tipleriyle eşleştiği kontrol edilecektir.
*   **`mevcut` Anahtar Kelimesi Kullanımı:** `mevcut` anahtar kelimesi yalnızca `girdi` bölümünde tanımlanmış değişkenler için kullanılabilir.
*   **`hedef` Tekliği:** Her Kural dosyasında yalnızca bir `hedef` bildirimi bulunmalıdır.
*   **Bölüm Sırası (V0 için Basitlik):** Kural dosyasındaki anahtar kelime bölümlerinin belirli bir sırayı takip etmesi zorunluluğu getirilebilir (örneğin, `hedef`, `girdi`, `gerektirir`, `yasaklar`, `etkiler`, `sonuç`). Bu, v0 için ayrıştırıcıyı basitleştirecektir.
*   **`etkiler` ve `yasaklar` Çelişkisi (Basit Kontrol):** `etkiler` bölümündeki bir atamanın veya fonksiyon çağrısının, `yasaklar` bölümündeki bir koşulu doğrudan ihlal edip etmediğine dair basit kontroller yapılabilir. (Tam çelişki tespiti daha gelişmiş bir aşama olacaktır.)

Bu plan, Kural v0 prototipinin geliştirilmesi için sağlam bir temel oluşturmaktadır. Minimal ve test edilebilir bir yaklaşımla, dilin temel işlevselliği ve doğrulanabilirlik özellikleri Python üzerinde gösterilecektir.
