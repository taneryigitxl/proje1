# Tora Online — yayın raporu

Tarih: 12 Ekim 2026. Yayın yolu: https://taneryigitxl.github.io/proje1/tora-online/

## Uygulananlar

Mevcut Babylon prototipi uzak dalından yalnızca tora-online/ altında geri alındı ve geliştirildi. Giriş ekranı korundu. Diğer site projeleri değiştirilmedi.

| Alan | Dosyalar ve sonuç |
|---|---|
| Kamera | camera/IsometricCamera.js, CameraControls.js, core/Config.js: sabit 45°, yumuşak takip, sınırlı zoom ve yatay RMB dönüş; zıplama kamerayı sarsmaz |
| Hareket | world/Pathfinding.js, Navigation.js, player/PlayerController.js: A*, engel çevresinden rota, ulaşılmaz hedef reddi/zaman aşımı, kamera yönlü normalize WASD, koşu/zıplama, manuel hareket rota iptali |
| Karakter | core/AssetManager.js, PlayerAnimator.js, WeaponSheath.js: lisanslı gerçek rigli baş, aynı skeletal tracklerle senkronizasyon, UAL klipleri ve 130 ms geçişler, gerçek ele bağlı GLB kılıç |
| Savaş | PlayerCombat.js, combat/DamageSystem.js ve CombatSystem.js: vuruş anında hasar, iki darbeli combo, ağır darbe, yaklaş/saldır, zeminle iptal, kilitli animasyonu hasar kesmez, ölü hedef temizliği, 1–9 mana/cooldown/etki |
| Düşmanlar | entities/Mob.js, EntityManager.js, manifest.json: Kül İblisi, Kafatası Orku, Harabe Ruhu; Kül Muhafızı 340 HP/seviye 5, animasyonlu AI ve respawn |
| Dünya | world/RegionWorld.js, GlbGrass.js: Ayaz Köyü, Sisli Orman, Kadim Harabe; tek aktif bölge, GLB instancing/çim thin instances, PBR arazi/taş döşeme, gerçek GLB evler/bitkiler/köprü/props, dere, gölge ve uzaklık culling |
| Oyun döngüsü | progression/InventorySystem.js, ProgressionSystem.js, GlbLoot.js: NPC görev zinciri, XP/seviye/altın, fiyatlı dükkân, eşyalar ve stat veren ekipman, yakın mesafeli gerçek GLB loot, tarayıcı yerel kaydı |
| Arayüz | ui/WorldUI.js, HUD.js, styles.css: bölge minimap, dünya etkileşim etiketleri, NPC dükkân/görev penceresi, koyu metal/altın HUD; UI tıkları karakteri yürütmez |
| Çalışma zamanı | core/Engine.js, main.js: WebGPU, WebGL2 destek/sürücü hatası yedeği, DPR sınırı, yerel vendor/assetler; NetworkAdapter yerel simülasyon sınırı |
| Teslim | scripts/build.mjs, validate.mjs, prepare-head.mjs, tests/gameplay.test.mjs, README ve lisans kaydı |

## Assetler ve lisans

Quaternius CC0: mevcut kadın ranger, Standard Base Characters rigli başı, iki UAL animasyon kütüphanesi, kadın NPC, üç Ultimate Monsters türü, Nature/Village/Fantasy Props MegaKit. Boss ork modelini paylaşır. Poly Haven CC0: çimen/toprak/kaya/taş döşeme albedo-normal-roughness. Babylon.js Apache-2.0. Tam kaynaklar THIRD_PARTY_LICENSES.md içinde. Son karakter, mob, ev, bitki, kaya, silah ve loot için procedural primitive model kullanılmaz; terrain, su ve savaş efektleri kodla oluşturulan yüzey/efektlerdir.

60 yerel asset dosyası yaklaşık 50.3 MiB. Manifest 49 referans/47.4 MiB doğrular (paylaşılan boss URL referansı tekrar sayılır). Yeni yüz ve arazi textureları en fazla 1K; mevcut set 1K/2K optimize GLB/texturelardan oluşur. Çalışma zamanı CDN bağımlılığı yoktur.

## Test ve ölçüm

- npm test: 7/7 geçti. Engel çevresinden yol, ulaşılamayan hedef, altın düşümü/kayıt, görev/boss kalıcılığı, saldırı kilidi/ölüm, dolu çantada teslim, vuruş zamanlaması ve iptal.
- npm run build ve validate: 33 modül, 49 varlık referansı, GLB başlık/JSON ve import yolları doğrulandı. npm audit: 0 açık.
- Edge üzerinde gerçek giriş, loading, Shift/WASD, zemin tıklaması, portal geçişi, hedefleme, saldırı/ölüm/XP, yenileme/kayıt, NPC ve satın alma oynandı. Can iksiri alımı 70 → 58 altın; NPC açıkken hareket girdisi kapalı.
- WebGPU 1920×1080 render, Medium, AMD RDNA 2; son orman ölçümü 8 saniye / 40 örnek: ortalama **191.5 FPS**, min **137.2**, max **202.3**. Önceki 1080p orman ölçümü 156.9 ortalama. Bunlar ön plandaki durağan sahne ölçümleridir; tüm donanımlar veya sürekli yoğun savaş için 60 FPS garantisi değildir.
- WebGL2 ayrıca gerçek tarayıcıda açıldı: yerel ilk oyun yüklemesi 1.84 sn; WebGPU son yerel yükleme 1.43 sn. Bu localhost ölçümleri internet/CDN indirme süresi değildir.
- Aynı konumda kalite profilleri: Low 458, High 3764 görünür çim instance; gölgeler 512/1024/2048, çim culling uzaklığı 15/23/30 m. DPR tavanı 1/1/1.25.
- Tekrar geçişlerde kaynak sayıları sabit: köy 4 skeleton /114 grup/568 mesh, orman 8/154/504, harabe 6/126/424. Önbellekli localhost geçişleri 0.15–0.23 sn; köy ilk hazırlığı 0.84 sn.
- Son WebGPU oturumunda uncaught/console hata görülmedi. Üretim URL/asset ve görsel kontrol sonucu yayın sonrası ayrıca kaydedilecek.

## Henüz bitmeyen işler

1. Sanat kalitesi: mevcut ücretsiz lisanslı set stilize düşük poligon. Talepteki üst düzey Doğu dark-fantasy sanat kalitesinin tümünü karşılayan özel karakter, özgün mini boss ve bütünlük içinde authored bölge seti henüz yok. Bu yayın oynanabilir test sürümüdür; nihai görsel kabul tamamlandı denmiyor.
2. İki elli tutuşun bütün kliplerde sol el IK ile kilitlenmesi ve kılıç-vücut temasının her açı/klipte sanat kontrolü tamamlanmadı. Savaş zamanlamaları ayarlı klip anlarıdır; ayrı authored animasyon event trackleri yok.
3. Ekipman statları ve kayıt çalışır; farklı kılıç/zırh için görünür GLB değişimi henüz yok. NPC/loot/model atlasındaki ikonlar için tam tutarlı özel çizim seti eksik.
4. Geometri azaltmalı gerçek mesh LOD, KTX2/Basis texture dönüştürme, Draco/Meshopt akış çözümü tamamlanmadı. Bu sürüm statik GLB instancing, thin instances, mesafe/frustum culling ve bölge disposal kullanıyor. Yaklaşık 50 MiB asset paketi zayıf bağlantıda ilk indirmeyi uzatabilir.
5. Çim rüzgârı, dalgalı su, kıyı/çiçek detayları, gelişmiş materyal katman karışımı ve el yapımı çevre kompozisyonu için ilave görsel çalışma gerekiyor. Çarpışma binalar/kayalar çevresinde yaklaşık engel hacimleriyle yapılır; iç mekân/mesh navigation yok.
6. Mobil dokunmatik kontrol ve daha düşük donanımlarda uzun savaş/frametime ölçümleri henüz yapılmadı. İlk üç saldırı oynanarak doğrulandı; dokuz yeteneğin bütün hedef/ölüm/çarpışma kombinasyonları için kapsamlı oyun testi tamamlanmadı.

Gerçek multiplayer, lonca, pazar ve kapsamlı backend talep gereği bu aşamanın dışındadır. Demo auth/chat/loot/savaş yereldir; üretim MMO sunucusu değildir.
