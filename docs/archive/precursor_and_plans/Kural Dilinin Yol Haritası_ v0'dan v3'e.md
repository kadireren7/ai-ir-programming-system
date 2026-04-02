# Kural Dilinin Yol Haritası: v0'dan v3'e

Bu yol haritası, Kural dilinin v0 prototipinden başlayarak, uzun vadeli hedeflere ulaşmak için planlanan aşamaları ve temel tasarım kararlarını özetlemektedir. Her aşama, dilin yeteneklerini, performansını ve ekosistemini geliştirmeye odaklanacaktır.

## v0: Python Prototipi (Mevcut Durum)

**Odak:** Konsept kanıtlama, temel dilbilgisi ve ayrıştırma.

**Hedefler:**
*   İnsan-okunabilir yüzey sözdizimini tanımlamak.
*   AI-odaklı çekirdek temsili (JSON AST) oluşturmak.
*   Temel ayrıştırıcı ve doğrulayıcıyı Python'da uygulamak.
*   Küçük, etki alanına özgü örneklerle dilin ifade gücünü göstermek (iş akışı, izinler, kararlar).

**Teknolojiler:**
*   **Ayrıştırıcı:** Elle yazılmış özyinelemeli inişli ayrıştırıcı (Python).
*   **AST:** Python sözlükleri ve listeleri (JSON uyumlu).
*   **Doğrulayıcı:** AST üzerinde basit anlamsal kontroller (Python).

**Ticari Değişimler ve Tasarım Kararları:**
*   **Hız yerine esneklik:** Python, hızlı prototipleme ve kavram kanıtlama için seçilmiştir. Performans bu aşamada ikincildir.
*   **Basitlik:** Dilbilgisi ve ayrıştırıcı, v0'ın minimal ve test edilebilir olma hedefine uygun olarak mümkün olduğunca basit tutulmuştur. Karmaşık dil özellikleri (örneğin, modüller, daha gelişmiş tip sistemleri) ertelenmiştir.
*   **Manuel AST oluşturma:** Ayrıştırıcı üreteçleri yerine elle yazılmış bir ayrıştırıcı, dilin iç işleyişini daha iyi anlamak ve hızlı iterasyon sağlamak için tercih edilmiştir.

## v1: Rust veya C++ ile Performans ve Sağlamlık

**Odak:** Performans, tip güvenliği, daha gelişmiş doğrulama ve genişletilebilirlik.

**Hedefler:**
*   Kural dilinin ayrıştırıcısını ve AST yapısını daha performanslı ve tip güvenli bir dilde yeniden yazmak.
*   Daha kapsamlı bir tip sistemi ve anlamsal doğrulama kuralları uygulamak.
*   Modülerlik ve eklenti mekanizmaları için temel altyapıyı oluşturmak.
*   Kural programlarının yürütülmesi için bir yorumlayıcı veya basit bir sanal makine (VM) prototipi geliştirmek.

**Teknolojiler:**
*   **Dil:** Rust veya C++. Rust, bellek güvenliği ve eşzamanlılık özellikleri nedeniyle tercih edilebilirken, C++ mevcut sistemlerle daha kolay entegrasyon sağlayabilir. İlk tercih Rust olacaktır.
*   **Ayrıştırıcı:** `Lark` (Python'dan Rust'a geçişte `LALRPOP` veya `Pest` gibi Rust tabanlı ayrıştırıcı üreteçleri düşünülebilir) veya elle yazılmış bir ayrıştırıcı.
*   **AST:** Daha güçlü tip sistemine sahip veri yapıları (örneğin, Rust'taki `enum` ve `struct`'lar).
*   **Yorumlayıcı/VM:** Kural AST'sini doğrudan yürüten veya basit bir ara koda derleyen bir bileşen.

**Ticari Değişimler ve Tasarım Kararları:**
*   **Performans ve güvenlik önceliği:** Python'daki esneklik, daha düşük seviyeli bir dildeki performans ve bellek güvenliği ile değiştirilir. Bu, geliştirme hızında bir miktar düşüşe neden olabilir ancak uzun vadeli istikrar ve ölçeklenebilirlik için gereklidir.
*   **Daha katı tip sistemi:** V0'daki esnek tip çıkarımı yerine, v1'de daha belirgin ve statik tip kontrolü, hataları derleme zamanında yakalamaya yardımcı olacaktır.
*   **Genişletilebilirlik:** Modüler bir tasarım, dilin gelecekteki etki alanlarına ve özelliklere kolayca uyum sağlamasına olanak tanır.

## v2: Yerel/İkili Derleyici ve Optimizasyon

**Odak:** Yüksek performanslı yürütme, optimizasyon ve sistem entegrasyonu.

**Hedefler:**
*   Kural programlarını doğrudan yerel makine koduna (native/binary) derleyen bir derleyici geliştirmek.
*   Derleme zamanı optimizasyonları uygulamak (örneğin, ölü kod eleme, sabit katlama).
*   Farklı platformlar için derleme desteği (Linux, Windows, macOS).
*   Harici sistemlerle (veritabanları, API'ler, işletim sistemi servisleri) entegrasyon için sağlam bir çalışma zamanı (runtime) ortamı sağlamak.

**Teknolojiler:**
*   **Derleyici Altyapısı:** LLVM gibi mevcut bir derleyici altyapısından yararlanmak, karmaşıklığı azaltabilir ve optimizasyon yeteneklerini artırabilir.
*   **Hedef Mimari:** x86-64, ARM.
*   **Çalışma Zamanı:** Gerekirse, Kural'a özgü bir çalışma zamanı kütüphanesi geliştirmek.

**Ticari Değişimler ve Tasarım Kararları:**
*   **Derleme karmaşıklığı:** Derleyici geliştirme, dil tasarımının en karmaşık aşamalarından biridir. Bu, önemli bir mühendislik yatırımı gerektirir.
*   **Performans ve kaynak kullanımı:** Yerel derleme, Kural programlarının mümkün olan en yüksek hızda ve en düşük kaynak tüketimiyle çalışmasını sağlar. Bu, özellikle kritik iş süreçleri için önemlidir.
*   **Platform bağımlılığı:** Yerel derleme, platforma özgü ikili dosyalar üretir, bu da dağıtım ve uyumluluk yönetimini artırır.

## v3: Kendi Kendini Barındırma (Self-Hosting) ve Ekosistem

**Odak:** Dilin olgunlaşması, kendi kendini geliştirebilme yeteneği ve geniş bir ekosistem oluşturma.

**Hedefler:**
*   Kural derleyicisini ve diğer araçlarını Kural dilinin kendisiyle yazmak (self-hosting).
*   Gelişmiş modül sistemi, kütüphane yönetimi ve paketleme araçları sağlamak.
*   Kural için entegre geliştirme ortamı (IDE) desteği ve hata ayıklama araçları geliştirmek.
*   Yapay zeka araçları için daha derin entegrasyonlar (örneğin, Kural kodunu otomatik olarak optimize eden veya yeni Kural kuralları öneren AI asistanları).

**Teknolojiler:**
*   **Kural:** Kendi derleyicisini yazmak için kullanılacak dil.
*   **Ekosistem Araçları:** Paket yöneticisi, test çerçeveleri, dokümantasyon üreteçleri.
*   **AI Entegrasyonları:** Makine öğrenimi çerçeveleri ve doğal dil işleme kütüphaneleri ile entegrasyon.

**Ticari Değişimler ve Tasarım Kararları:**
*   **Olgunluk ve güven:** Kendi kendini barındırma, dilin olgunluğunun ve güvenilirliğinin nihai bir göstergesidir. Bu, dilin kendi kendini geliştirebilmesini ve sürdürülebilirliğini sağlar.
*   **Geliştirici deneyimi:** Zengin bir ekosistem ve IDE desteği, geliştiricilerin Kural ile daha verimli çalışmasını sağlar.
*   **AI ile simbiyotik ilişki:** Kural'ın AI-first doğası, bu aşamada tam potansiyeline ulaşarak, AI'nın dilin gelişimine ve kullanımına aktif olarak katkıda bulunmasını sağlar.

Bu yol haritası, Kural'ın uzun vadeli vizyonunu gerçekleştirmek için aşamalı ve stratejik bir yaklaşım sunmaktadır. Her aşama, bir öncekinin üzerine inşa edilerek, dilin sağlam, performanslı ve AI ile derinlemesine entegre bir sistem haline gelmesini sağlayacaktır.
