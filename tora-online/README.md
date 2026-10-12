# Tora Online
Tarayıcıda çalışan izometrik Doğu fantezisi RPG demosu. Üç bölge, dokuz yetenek, NPC görevleri, envanter, mağaza, loot ve bu tarayıcıda kalan kayıtlar içerir.

## Çalıştırma
Node.js 22 veya daha yeni bir sürüm:
```powershell
npm ci
npm run dev
npm test
npm run build
npm run test:browser
npm run test:soak
```
Windows tarayıcı testi varsayılan olarak kurulu Edge'i kullanır. Diğer sistemlerde önce `npx playwright install chromium` çalıştır. `SMOKE_CHANNEL` ile kurulu Chrome/Edge seçilebilir; sabit executable yolu yoktur.

## Oynama
Profil adını yazıp Diyara Gir'e bas. Şifre veya admin yetkisi yoktur. Kayıtlar bu tarayıcıya aittir.
Sol tık: koş, hedef seç ve saldır. Sol tuşu basılı tut: imlecin gösterdiği yöne koş. WASD: aynı koşu hızı. Space: kısa zıplama. 1–9: yeteneği hazırla, ardından hedefe veya zemine tıkla. Kendine uygulanan savunma ve öfke hemen çalışır. Esc: hazırlanan yeteneği iptal eder, panel yoksa oyunu duraklatır. Tab: hedef değiştir. I: envanter. C: karakter. E: açık ganimet kesesini tamamen alır.
Tekerlek: sınırlı yakınlaştırma. Kamera sabit izometrik açıda kalır.
Ayame'den görevi al; beş yaratığı yen, üç dişi teslim et, Kül Muhafızı'na ilerle.

## Yayın
GitHub Pages workflow oyunu Vite ile hashli JS/CSS ve UI dokularına derler. Yayın paketi testleri, kaynak modülleri, node_modules ve önceki çıktı kopyalarını içermez. Depodaki diğer site sayfaları korunur.
`dist/` yalnızca üretim çıktısıdır. Asset URL'leri manifestte tanımlıdır.
Lisanslar: [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).
Görsel üretim istemleri: [assets/ui/art-prompts.json](assets/ui/art-prompts.json).
Test kanıtları ve öncesi/sonrası ekranları: [reports/](reports/).
