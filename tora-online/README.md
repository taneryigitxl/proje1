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
Sol tık: yürü / düşmana yaklaş ve saldır. WASD: kamera yönünde hareket. Shift: koş. Space: zıpla. 1–9: yetenek. Tab: hedef değiştir. I: envanter. C: karakter. Escape: paneli kapat / duraklat.
Sağ sürükle: yatay kamera döndürme. Tekerlek: zoom.
Ayame'den görevi al; beş yaratığı yen, üç dişi teslim et, Kül Muhafızı'na ilerle.

## Yayın
GitHub Pages workflow oyunu Vite ile hashli JS/CSS ve UI dokularına derler. Yayın paketi testleri, kaynak modülleri, node_modules ve önceki çıktı kopyalarını içermez. Depodaki diğer site sayfaları korunur.
`dist/` yalnızca üretim çıktısıdır. Asset URL'leri manifestte tanımlıdır.
Lisanslar: [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).
Görsel üretim istemleri: [assets/ui/art-prompts.json](assets/ui/art-prompts.json).
Test kanıtları ve öncesi/sonrası ekranları: [reports/](reports/).
