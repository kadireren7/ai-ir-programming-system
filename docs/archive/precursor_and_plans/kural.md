```kural
hedef: KullaniciGirisAkisi

girdi:
  kullanici_adi: metin
  sifre: metin
  ip_adresi: metin
  son_giris_ip: metin
  hatali_giris_denemesi_sayisi: sayi

gerektirir:
  kullanici_adi mevcut
  sifre mevcut
  ip_adresi mevcut
  son_giris_ip mevcut
  kullanici_adi_dogru(kullanici_adi)
  sifre_dogru(kullanici_adi, sifre)
  hatali_giris_denemesi_sayisi < 5

yasaklar:
  kullanici_hesap_durumu(kullanici_adi) == "kilitli"
  ip_adresi_kara_liste(ip_adresi)
  (ip_adresi != son_giris_ip ve hatali_giris_denemesi_sayisi > 0)

etkiler:
  giris_basarili_kayit(kullanici_adi, ip_adresi)
  sifre_hatali_deneme_sayisi_sifirla(kullanici_adi)
  oturum_baslat(kullanici_adi)

sonuç: "Giriş Başarılı"
```
