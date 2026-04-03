# Demo: TORQA → üretilen web uygulamasını localhost’ta çalıştırma

Amaç: IR veya `.tq` ile **üretilen Vite/React ağacını** (`generated/webapp`) kendi bilgisayarında tarayıcıda açmak. **Node.js** ve **npm** gerekir.

---

## Yol A — Web konsol (`torqa-console`)

1. Kurulum ve sunucu:
   ```bash
   pip install -e .
   torqa-console
   ```
   veya: `uvicorn webui.app:app --reload --host 127.0.0.1 --port 8000`

2. Tarayıcıda `http://127.0.0.1:8000` açın.

3. Soldan **örnek seçin** (web uygulaması için `valid_login_flow.json` gibi çok yüzeyli bir örnek iyi sonuç verir) → **Load** → **Download ZIP**.

4. ZIP’i bir klasöre çıkarın (ör. `demo-out/`).

5. Terminal:
   ```bash
   cd demo-out/generated/webapp
   npm install
   npm run dev
   ```

6. Genelde **http://localhost:5173** adresinde Vite dev sunucusu açılır (port farklıysa terminal çıktısına bakın).

Konsolda ZIP indirdikten sonra sayfada **localhost komutları** kutusu da görünür (üretimde `generated/webapp` varsa).

---

## Yol B — Sadece terminal (`torqa project`)

```bash
pip install -e .
torqa project --root . --source examples/core/valid_login_flow.json --out demo_gen --engine-mode python_only
```

JSON çıktısında `local_webapp` alanında `npm` komutları da listelenir.

```bash
cd demo_gen/generated/webapp
npm install
npm run dev
```

`.tq` kaynağı için: `--source examples/torqa/auth_login.tq` (girdilerin registry ile uyumlu olduğundan emin olun).

---

## Yol C — Masaüstü (klasör seçimi burada)

Web konsolu **tarayıcı güvenliği** yüzünden bilgisayarındaki rastgele klasörü “açamaz”; bu yüzden **Cursor gibi klasör + üretim** için masaüstü kabuğu kullanılır.

**Çalıştırma (PATH sorunu varsa tam bunu yazın):**

```powershell
cd C:\Users\kadir\Desktop\Project-X
python -m desktop_legacy --tk
```

`torqa-desktop-legacy` PATH’teyse: `torqa-desktop-legacy --tk`

**pywebview** (gömülü pencere + web arayüzü): Linux/macOS’ta `pip install -e ".[desktop-webview]"` sonra `python -m desktop_legacy`. Windows’ta bu extra `pywebview` kurmaz (kaynak `pythonnet` derlemesini önlemek için); Windows’ta pratik çözüm **`python -m desktop_legacy --tk`**. Gömülü pencere şartsa: önce `pip install pythonnet --only-binary :all:` (teker yoksa bu adım da başarısız olabilir), sonra `pip install pywebview`.

1. Çalışma klasörü seçin.

2. IR üretin (AI veya JSON yapıştırma).

3. **«Üretim ağacı yaz (torqa project)»** — dosyalar `…/generated_out` altına yazılır.

4. Başarı penceresinde **Windows terminal komutları** gösterilir; aynı komutları kendiniz çalıştırın:
   ```cmd
   cd YOL\generated_out\generated\webapp
   npm install
   npm run dev
   ```

---

## Güvenlik

Web API sunucuda keyfi diske yazmaz; yalnızca ZIP döner. Ayrıntı: [`WEBUI_SECURITY.md`](WEBUI_SECURITY.md).

---

## Sorun giderme

| Sorun | Ne yapın |
|--------|-----------|
| Windows’ta `torqa-console` tanınmıyor | `pip` uyarısı: `.exe` dosyaları `...\Python\...\Scripts` altında ama **PATH’te değil**. **Hızlı çözüm:** proje kökünde `python -m webui` (aynı konsol). **Kalıcı:** PATH’e o `Scripts` klasörünü ekleyin veya tam yol: `& "C:\Users\<siz>\AppData\Local\Python\pythoncore-3.14-64\Scripts\torqa-console.exe"`. |
| `torqa` / `torqa-desktop` aynı sebep | `python -m torqa --help` veya `python -m src.cli.main --help` · masaüstü: `python -m desktop_legacy --tk` (kurulum kökünden). |
| `npm` yok | [Node.js LTS](https://nodejs.org/) kurun. |
| ZIP’te `generated/webapp` yok | Daha zengin bir IR örneği kullanın (`valid_login_flow.json`). |
| Port meşgul | Vite başka port önerir; çıktıyı okuyun. |
