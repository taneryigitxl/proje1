# Tora Online güncelleme raporu — 12 Ekim 2026

Kaynak değiştirildi ve üretim paketi yeniden derlendi. Oyun pencereli Edge tarayıcısında açıldı; ekran görüntüleri görsel olarak incelendi. Genişletilmiş testler görev, mağaza, savaş, dokuz yetenek, ekipman, kayıt, respawn ve üç bölge akışını kapsıyor.

## Uygulama

- I/C önizlemesi tek, izole WebGL canvas kullanıyor. Yüklü karakterin gerçek skin pozu bir kez kopyalanıyor; buff geometrisi hariç tutuluyor. Ana kamera/ışık/layer değişmiyor. Render yalnızca açılış, ekipman ve sınırlı yatay sürüklemede, en fazla 30 Hz. Kapalı panelde render ve preview pointer listener yok; piksel okuması yok. AABB ile kamera otomatik sığıyor; CSS ve canvas 3:4.
- Özgün GLB ganimet kesesi paylaşılan template/material ile oluşturuluyor. Uzak keseye tek tık otomatik yaklaşır/açar. Tek tık seçer; çift tık yığın toplar; E hepsini alır. Kısmi/dolu çanta, zaman aşımı, eski satır kimliği ve duplicate pickup durumları korumalı. Dışarı tıklama kapanışında dünya hareketi verilmez. Ölüm/bölge geçişi state temizler; görev eşyası alımı hemen güncellenir.
- Dünya etiketleri güncel render matrisinden, her frame subpixel translate3d ile yerleşiyor. Oyuncu adı, NPC, mob ve chat anchorları sabit boyutlu. E konuşma kutusu yalnızca menzilde. Hareket testi DOM hareketiyle projekte edilen anchor hareketini birlikte örnekliyor.
- Hareket rünü ve bordo hedef torusu zemine paralel; marker 620 ms ömürlü, tekrar kullanılıyor ve UI/başka etkileşimde temizleniyor. Seçili hedef halkası ölünce kayboluyor.
- Sol menü SVG ikonları büyütüldü, metal çerçeve state'leri korundu. Minimap ile görev paneli çakışması giderildi. Panel önizleme oranı 768p'de korunuyor. Köy taş döşemesinin kenarı yumuşatıldı; occlusion materyalleri bölge ömrü boyunca cache ediliyor.

Başlangıç kaynakta mevcut olan tek 5.4 m/s koşu hızı, Shift işlevsizliği, sabit kamera, playerRing yokluğu, mana rakamlarının yalnızca tooltipte olması ve 1–9 kısayolları korundu ve yeniden doğrulandı. Bunlar bu çalışmada sıfırdan eklenmiş özellikler olarak sayılmadı.

## Dosyalar

Kaynak: src/core/AssetManager.js, src/core/Game.js, src/entities/EntityManager.js, src/progression/GlbLoot.js, src/ui/CharacterPreview.js, src/ui/HUD.js, src/ui/WorldUI.js, src/world/MoveMarker.js, src/world/RegionWorld.js, styles.css.

Asset/build/dokümantasyon: assets/models/manifest.json, assets/models/props/loot-bag.glb, scripts/prepare-loot.mjs, scripts/report-audit.mjs, scripts/inspect-visual.mjs, README.md, THIRD_PARTY_LICENSES.md.

Testler: tests/loot.test.mjs, tests/browser-smoke.mjs. Birim testler gerçek inventory/loot transaction koduyla kısmi yığın, eski satır, reddedilen item ve lifecycle durumlarını kapsıyor.

## Asset ve kurulum

Kese modeli özgün proje üretimi, CC0-1.0: 5 mesh, 2 paylaşılan materyal, 3.440 üçgen, 416.336 byte. Üretim scripti repoda. Menü/rün/harita şekilleri de özgün; lisans kaydı [THIRD_PARTY_LICENSES.md](../THIRD_PARTY_LICENSES.md) içinde. Yeni üçüncü taraf sanat eklenmedi.

Başlangıç kaynak arşivi yerel reports/audit-2026-10-12/initial-source.zip dosyasında saklandı; arşiv depo/yayın paketine eklenmedi. npm ci temiz kurulum yaptı; ilk esbuild VirtualAlloc hatası GOMAXPROCS=2 ile tekrar çalıştırılarak çözüldü. Kilit dosyasının başlangıç ZIP'iyle SHA256 eşleşmesi doğrulandı. Eksik Playwright Chromium indirildi. dist build tarafından üretildi; kaynak, node_modules ve raporlar yayın paketinde bulunmuyor.

## Test ve performans

Başlangıç: 7 birim testi; 34 browser kontrolü başarılı. Son sıra: npm test (11/11), npm run validate (43 modül, 50 asset), npm run build, npm run test:browser (39 kontrol), npm run test:soak (600 saniye, 40 kontrol). Runtime console error/warning, uncaught promise ve başarısız asset isteği: 0.

| 1920×1080 | Ölçülen FPS | P95 frame süresi |
|---|---:|---:|
| low | 200.0 | 5.1 ms |
| medium | 200.0 | 5.1 ms |
| high | 200.0 | 5.1 ms |

Medium önizleme kapalı/açık/yeniden kapalı: **200.0 / 200.0 / 200.0 FPS**. Ölçülen düşüş: **0.0%**. Bu değerler bu makinenin pencereli Edge oturumundan; başka donanımlara genellenmiş performans garantisi değildir. CI çözünürlük düşürmesi kullanılmadı.

600 saniyelik Sisli Orman oyun döngüsü savaş, 1–9 skill, WASD, zıplama, I aç/kapat ve ölüm/respawn içeriyor. Son örnek 604.2 saniye. GC sonrası JS heap: **179.4 → 202.2 MiB**. Mesh: **343 → 364**, texture: **219 → 266**, material: **103 → 124**. Renderer: **2 → 2**; render target: **0 → 0**; son preview listener: **0**. Loot ve occlusion cache'leri ilk keşifte büyüyor; sayıların sonraki örneklerdeki seyri ham raporda görülebilir. Bu test sabit bölgede uzun oynanışı ölçer; sınırsız bölge geçişi stres testi değildir.

Ham kanıt: [son browser testi](browser-results-final-smoke.json), [soak ve bellek örnekleri](browser-results-soak.json). Önizleme bounding box köşeleri, gerçek GPU readPixels sayacı ve 60 ardışık label/anchor örneği browser JSON'unda.

## Önce / sonra görseller

| Görünüm | Önce | Sonra |
|---|---|---|
| 1366×768 oynanış | [önce](audit-2026-10-12/before/gameplay-1366.png) | [sonra](gameplay-1366.png) |
| 1920×1080 oynanış | [önce](audit-2026-10-12/before/after-world-1080.png) | [sonra](after-world-1080.png) |
| I envanter | [önce](audit-2026-10-12/before/after-inventory-1366.png) | [sonra](after-inventory-1366.png) |
| C karakter | [önce](audit-2026-10-12/before/character-preview-1366.png) | [sonra](character-preview-1366.png) |
| Loot | [önce](audit-2026-10-12/before/loot-window-1366.png) | [sonra](loot-window-1366.png) |
| Hareket işareti | [önce](audit-2026-10-12/before/move-marker-1366.png) | [sonra](move-marker-1366.png) |

Ek görseller: [skill bar](skill-bar.png), [sol menü](left-menu.png), [minimap](minimap.png), [NPC](after-npc-1366.png), [label hareketi](labels-moving-1366.png), [occlusion](occlusion-fade.png), [uzun oynanış](soak-latest.png). Hareket işareti ekranı, gerçek tıklamayla oluşan 620 ms efektin ekran yakalama süresince dondurulmuş karesidir. Görev teslimi, skill timing, dolu çanta ve zorunlu açık-loot bölge geçişi kontrollerinde kontrollü fixture kullanımı testte açıkça belirtilmiştir.

## Kapsam ve kalan sınırlar

Ana mekanik, kamera, önizleme, loot, input ve label kabul kontrolleri çalıştırıldı. Önizleme cache'li sabit pozdur; animasyonlu ikinci rig döngüsü çalıştırmaz. Ekipman görünümü ana oyunda mevcut modelleri yansıtır; yeni zırh setleri eklenmedi. Genel çevre sanat paketi, mevcut portal yapısı ve mob modelleri topluca yenilenmedi. Su normal animasyonu, grass wind ve mevcut boss silahları korundu; bu unsurların fotogerçekçi sanat revizyonu bu teslimde yapılmadı. Ayak kayması için sayısal motion-capture analizi yapılmadı; koşu animasyonu/hız eşlemesi ve saldırı IK hataları oyun testinde kontrol edildi. Arkadaş/lonca/grup gerçek backend olmadan boş durumlarını koruyor.
