# Kural: AI-First Deklaratif Programlama Dili v0 Prototip Teslimatları

Bu belge, AI-öncelikli deklaratif programlama dili Kural'ın v0 prototipinin tasarımına ilişkin tüm çıktıları bir araya getirmektedir. Amaç, dilin temel konseptlerini, mimarisini, örneklerini ve gelecekteki gelişim yol haritasını kapsamlı bir şekilde sunmaktır.

## 1. Dil Konsept Özeti

Kural dilinin temel felsefesini, çözdüğü problemleri, AI-öncelikli ve deklaratif yaklaşımlarının nedenlerini ve çift katmanlı mimarisini açıklayan özet belge.

[Kural Konsept Özeti](/home/ubuntu/kural_concept_summary.md)

## 2. v0 Dil Çekirdek Anahtar Kelimeleri

Kural v0 için belirlenen minimal anahtar kelime seti (`hedef`, `girdi`, `gerektirir`, `yasaklar`, `etkiler`, `sonuç`) ve bunların anlamsal rolleri, konsept özet belgesinde detaylandırılmıştır.

## 3. Basit İnsan-Okunabilir Yüzey Sözdizimi Örnekleri

Belirlenen etki alanları (para transferi, erişim kontrolü, onay akışı, şüpheli işlem incelemesi, giriş akışı) için Kural v0 yüzey sözdizimini gösteren 5 örnek dosya:

*   [Para Transferi Örneği](/home/ubuntu/kural_example_money_transfer.md)
*   [Erişim Kontrolü Örneği](/home/ubuntu/kural_example_access_control.md)
*   [Onay Akışı Örneği](/home/ubuntu/kural_example_approval_workflow.md)
*   [Şüpheli İşlem İncelemesi Örneği](/home/ubuntu/kural_example_suspicious_transaction.md)
*   [Giriş Akışı Örneği](/home/ubuntu/kural_example_login_flow.md)

## 4. Daha Sıkı AI-Çekirdek Temsili (JSON AST)

Yukarıdaki 5 örneğin makine odaklı, yapılandırılmış JSON tabanlı Soyut Sözdizimi Ağacı (AST) temsilleri:

*   [Para Transferi AST](/home/ubuntu/kural_ast_money_transfer.json)
*   [Erişim Kontrolü AST](/home/ubuntu/kural_ast_access_control.json)
*   [Onay Akışı AST](/home/ubuntu/kural_ast_approval_workflow.json)
*   [Şüpheli İşlem İncelemesi AST](/home/ubuntu/kural_ast_suspicious_transaction.json)
*   [Giriş Akışı AST](/home/ubuntu/kural_ast_login_flow.json)

## 5. Biçimsel Dilbilgisi Taslağı (EBNF)

Kural v0 yüzey dilinin sözdizimini tanımlayan biçimsel dilbilgisi taslağı:

[Kural v0 Dilbilgisi Taslağı](/home/ubuntu/kural_v0_grammar.ebnf)

## 6. Python Prototip Planı

Kural v0 prototipinin Python ile geliştirilmesi için ayrıştırıcı ve doğrulayıcı mimarileri, AST yapısı, hata işleme kuralları ve doğrulama kontrollerini detaylandıran plan:

[Kural Python Prototip Planı](/home/ubuntu/kural_python_prototype_plan.md)

## 7. Örnek Python Ayrıştırıcı Uygulaması

Kural v0 yüzey dilini okuyup ayrıştıran ve bir AST oluşturan, ayrıca temel doğrulama kontrollerini gerçekleştiren Python kodu:

[Kural Ayrıştırıcı ve Doğrulayıcı Kodu](/home/ubuntu/kural_parser.py)

## 8. Yol Haritası

Kural dilinin v0 prototipinden başlayarak, v1 (Rust/C++), v2 (yerel derleyici) ve v3 (kendi kendini barındırma) aşamalarını içeren uzun vadeli gelişim yol haritası:

[Kural Yol Haritası](/home/ubuntu/kural_roadmap.md)
