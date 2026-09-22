# Tora Online prototype

Tarayıcıda çalışan, üçüncü şahıs kameralı eski tarz Doğu fantezisi action-MMORPG vertical slice. WebGPU denenir; desteklenmezse WebGL2 kullanılır. Tüm çalışma zamanı ve varlıklar statik hosting için yereldir.

## İçerik

- Rigli kadın savaşçı, ele bağlanan büyük kılıç ve iki animasyon kütüphanesi.
- İki farklı rigli/animasyonlu düşman tipi.
- PBR zemin katmanları; GLB ağaç, kaya, bitki, köy, demirci, pazar, kamp, köprü ve harabe varlıkları.
- WASD, Shift koşu, Space zıplama, tıkla yürü/hedefle, sağ sürükle kamera ve tekerlek zoom.
- Dokuz yetenek, hedef/hasar/ölüm/respawn, görev, XP ve seviye döngüsü.
- Minimap, sohbet, hedef paneli, can/mana/XP ve Low/Medium/High kalite profilleri.
- Bağlama duyarlı özgün fare imleçleri.

## Çalıştırma

Depo kökünü bir statik sunucuyla servis edip `/tora-online/` yolunu açın. İsteğe bağlı Vite betikleri:

```text
npm install
npm run dev
```

`assets/models/manifest.json` içindeki karakter, silah, iki düşman, animasyon, çevre ve zemin girdileri zorunludur. Yükleme veya doğrulama başarısızsa oyun açık bir hata gösterir; procedural karakter/yaratık/çevre fallback'i yoktur.

Varlık kaynakları ve lisansları için `THIRD_PARTY_LICENSES.md` dosyasına bakın.

## Online sınırı

`src/network/NetworkAdapter.js` şimdilik yalnızca yerel simülasyon yapar. Girdi ve snapshot olayları gelecekteki authoritative WebSocket servisi için sınır oluşturur; sahte uzak oyuncu veya sunucu iddiası yoktur.
