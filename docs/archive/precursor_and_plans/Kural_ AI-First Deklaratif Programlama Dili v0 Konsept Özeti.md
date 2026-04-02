# Kural: AI-First Deklaratif Programlama Dili v0 Konsept Özeti

## 1. Çözülen Problem: Karmaşık İş Akışları ve Karar Mekanizmalarının Yönetimi

Günümüz yazılım sistemlerinde iş akışları, erişim kontrolü ve karar alma süreçleri genellikle dağıtık, örtük ve farklı teknolojilere yayılmış durumdadır. Bu durum, sistemlerin anlaşılmasını, doğrulanmasını ve değiştirilmesini zorlaştırmaktadır. Özellikle kritik iş süreçlerinde hatalar, güvenlik açıkları ve uyumsuzluklar ortaya çıkabilmektedir. Kural, bu karmaşıklığı azaltarak, iş mantığını açık, denetlenebilir ve otomatik olarak doğrulanabilir bir biçimde ifade etmeyi amaçlar. Odak noktası, "ne yapılmalı" sorusuna net cevaplar veren, küçük ve özelleşmiş bir etki alanıdır: iş akışları, izinler ve kararlar.

## 2. Neden AI-First?

Kural'ın "AI-First" yaklaşımı, dilin tasarımından itibaren yapay zeka sistemleriyle entegrasyonu ve yapay zeka tarafından işlenmesini önceliklendirmesidir. Bu, sadece yapay zeka tarafından üretilen kod anlamına gelmez; aynı zamanda dilin kendisinin yapay zeka modelleri için optimize edilmiş bir yapıya sahip olması demektir. Faydaları şunlardır:

*   **Otomatik Üretim ve Dönüşüm:** Yapay zeka modelleri, doğal dil tanımlarından Kural kodunu otomatik olarak üretebilir veya mevcut Kural kodunu farklı formatlara dönüştürebilir.
*   **Doğrulama ve Optimizasyon:** Yapay zeka, Kural programlarının mantıksal tutarlılığını, güvenlik özelliklerini ve performansını analiz edebilir ve optimize edebilir.
*   **Anlam Çıkarma:** Yapay zeka, Kural programlarının davranışını ve etkilerini daha derinlemesine anlayarak, karmaşık sistemlerin açıklanabilirliğini artırabilir.
*   **Hata Azaltma:** Yapay zeka destekli analizler, insan hatalarını erken aşamada tespit ederek geliştirme sürecini hızlandırır ve hataları azaltır.

## 3. Neden Deklaratif?

Deklaratif programlama, bir sistemin **ne yapması gerektiğini** tanımlarken, **nasıl yapacağını** belirtmez. Kural'ın deklaratif doğası, özellikle iş akışları ve karar mekanizmaları gibi alanlarda önemli avantajlar sunar:

*   **Netlik ve Anlaşılabilirlik:** İş mantığı, adım adım talimatlar yerine hedefler ve kısıtlamalar üzerinden ifade edildiği için daha kolay anlaşılır ve okunur.
*   **Doğrulama Kolaylığı:** Deklaratif yapılar, statik analiz ve biçimsel doğrulama için daha elverişlidir. Bu, programların istenen davranışa uygunluğunu matematiksel olarak kanıtlama potansiyeli sunar.
*   **Değişime Direnç:** Temel iş mantığı değişmediği sürece, altta yatan yürütme mekanizmalarındaki değişiklikler programı etkilemez. Bu, sistemlerin daha esnek ve sürdürülebilir olmasını sağlar.
*   **Paralelleştirme Potansiyeli:** Yan etkilerden arınmış deklaratif ifadeler, doğal olarak paralelleştirilebilir ve dağıtık sistemlerde daha verimli çalışabilir.

## 4. İnsan Yüzeyi + AI Çekirdek Çift Katmanlı Mimari

Kural, iki ana katmandan oluşan bir mimariye sahiptir:

*   **İnsan-Okunabilir Yüzey Katmanı:** Bu katman, geliştiricilerin ve iş analistlerinin iş mantığını kolayca yazıp okuyabileceği, doğal dile yakın, yüksek seviyeli bir sözdizimi sunar. Amaç, dilin öğrenme eğrisini düşürmek ve iş alanındaki uzmanların doğrudan katkıda bulunmasını sağlamaktır. Bu katman, karmaşıklığı soyutlar ve sezgisel bir ifade biçimi sağlar.
*   **AI-Odaklı Çekirdek Temsil (AI-Core Representation):** Yüzey katmanında yazılan kod, bu katmanda makine tarafından kolayca işlenebilecek, yapılandırılmış ve kesin bir ara temsile dönüştürülür. Bu temsil, genellikle bir Soyut Sözdizimi Ağacı (AST) veya benzeri bir veri yapısıdır. Bu katmanın özellikleri şunlardır:
    *   **Kesinlik ve Belirsizlikten Arınma:** Her ifade, tek ve net bir anlama sahiptir, yapay zeka modellerinin yorumlama hatalarını en aza indirir.
    *   **Makine İşlenebilirliği:** Yapay zeka algoritmaları (doğrulama, optimizasyon, kod üretimi) için ideal bir giriş formatıdır.
    *   **Doğrulanabilirlik:** Biçimsel doğrulama araçlarının doğrudan uygulanabileceği bir yapı sağlar.

Bu çift katmanlı yaklaşım, hem insan odaklı geliştirme verimliliğini hem de yapay zeka destekli otomasyon ve doğrulama yeteneklerini bir araya getirerek, dilin uzun vadeli başarısı için kritik bir temel oluşturur. İnsanlar için okunabilirliği korurken, makineler için maksimum işlenebilirlik ve doğruluk sağlar.

## Kural v0 Çekirdek Anahtar Kelimeler

Kural v0 için belirlenen minimal anahtar kelime seti, iş akışları, izinler ve kararlar etki alanındaki temel kavramları ifade etmek üzere tasarlanmıştır. Bu kelimeler, deklaratif yapıyı destekler ve sistemin hedeflerini, kısıtlamalarını ve etkilerini açıkça belirtir.

*   **`hedef` (goal):** Bir işlemin veya akışın nihai amacını tanımlar. Ne başarılmak istendiğini belirtir.
*   **`girdi` (input):** Bir işlemin başlaması için gerekli olan verileri veya koşulları belirtir. Dışarıdan alınan bilgileri temsil eder.
*   **`gerektirir` (requires):** Bir işlemin yürütülmesi için karşılanması gereken ön koşulları veya izinleri tanımlar. Mantıksal kısıtlamaları ifade eder.
*   **`yasaklar` (forbid):** Bir işlemin belirli koşullar altında kesinlikle gerçekleşmemesi gerektiğini belirtir. Güvenlik veya iş kuralları ile ilgili olumsuz kısıtlamaları ifade eder.
*   **`etkiler` (effects):** Bir işlemin başarıyla tamamlanmasının ardından sistemde meydana gelen değişiklikleri veya sonuçları tanımlar. Yan etkileri veya durum değişikliklerini belirtir.
*   **`sonuç` (result):** Bir işlemin çıktısını veya nihai değerini tanımlar. Özellikle karar mekanizmalarında bir kararın sonucunu ifade eder.

Bu anahtar kelimeler, dilin deklaratif doğasını vurgulayarak, sistemin davranışını açık ve doğrulanabilir bir şekilde ifade etmeyi sağlar. Her bir anahtar kelime, belirli bir anlamsal rolü üstlenir ve bir Kural programının temel yapı taşlarını oluşturur.
