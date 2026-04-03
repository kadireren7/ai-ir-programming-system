# Demo: TORQA → üretilen web uygulamasını localhost’ta çalıştırma

Amaç: IR veya `.tq` ile **üretilen Vite/React ağacını** (`generated/webapp`) kendi bilgisayarında tarayıcıda açmak. **Node.js** ve **npm** gerekir.

---

## Yol A — Web konsol (`torqa-console`)

1. Kurulum ve sunucu:
   ```bash
   pip install -e .
   torqa-console
   ```
   veya: `uvicorn website.server.app:app --reload --host 127.0.0.1 --port 8000`

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

Web konsolu **tarayıcı güvenliği** yüzünden bilgisayarındaki rastgele klasörü “açamaz”; bu yüzden **klasör + `.tq` + üretim** için **TORQA Desktop** (Electron) kullanılır.

**Çalıştırma (bir kez `npm install` `desktop/` içinde):**

```powershell
cd C:\Users\kadir\Desktop\Project-X
torqa-desktop
```

PATH’te yoksa: `python -m pip install -e .` sonrası `Scripts` yolunu kullanın veya `desktop` klasöründe `npm run dev`.

1. **Open folder** ile çalışma klasörünü seçin.

2. İsterseniz **Quick demo** ile örnek `.tq` yükleyin; **Validate** / **Build** çıktısı panelde görünür.

3. Üretim ağacı `torqa_generated_out/` (veya CLI ile belirttiğiniz çıktı) altına yazılır; web önizlemesi için terminalde:

4. Başarı sonrası **terminal komutları** (örnek):
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
| Windows’ta `torqa-console` tanınmıyor | `pip` uyarısı: `.exe` dosyaları `...\Python\...\Scripts` altında ama **PATH’te değil**. **Hızlı çözüm:** proje kökünde `python -m website.server` (aynı konsol). **Kalıcı:** PATH’e o `Scripts` klasörünü ekleyin veya tam yol: `& "C:\Users\<siz>\AppData\Local\Python\pythoncore-3.14-64\Scripts\torqa-console.exe"`. |
| `torqa` / `torqa-desktop` aynı sebep | `python -m torqa --help` veya `python -m src.cli.main --help` · site: `python -m website.server` · masaüstü: `cd desktop && npm run start` veya `torqa-desktop` (kurulum kökünden). |
| `npm` yok | [Node.js LTS](https://nodejs.org/) kurun. |
| ZIP’te `generated/webapp` yok | Daha zengin bir IR örneği kullanın (`valid_login_flow.json`). |
| Port meşgul | Vite başka port önerir; çıktıyı okuyun. |
