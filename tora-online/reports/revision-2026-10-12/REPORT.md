# Tora Online — karakter, kontrol ve harita revizyonu

13 Ekim 2026. Mevcut Babylon.js/Vite projesi geliştirildi. Başlangıç kaynak sürümü: 97aa4dd. Yerel kaynak yedeği source-before.zip/source-before.patch olarak korundu; kaynak indirmeleri üretim paketine alınmadı.

## Değişiklikler

- Profil ardından üç yuvalı karakter seçimi/oluşturma, Warrior/Mage seçimi, 2–16 karakterlik benzersiz güvenli isim, değiştirilemeyen sınıf ve tam isimle silme. Dünya ayrı bir düğmeyle açılır.
- Mouse tıklama/basılı tutma ile hareket; ulaşılamayan hedef için erişilebilir yakın rota; düşman, NPC ve loota otomatik yaklaşma. WASD ve zıplama kaldırıldı. Space oyun state'i oluşturmaz. QWER dört hızlı eşya, F açık keseyi tamamen alır.
- QWER referansları envanteri taşımaz; gerçek sürükleme, slot değiştirme/temizleme, miktar, eşya bazlı cooldown, tükenme ve yeniden edinme desteği bulunur. Kısayollar metin alanında ve ölüm/panel kilidinde tüketim yapmaz.
- Ölüm ALIVE → DYING → AWAITING_RESPAWN_CHOICE → RESPAWNING akışında seçim bekler. Yerinde %10 can/%20 mana ve 3 saniye koruma; güvenli noktada tam can/mana. Saldırı korumayı bitirir. Input, hedef, loot, buff, projectile ve aggro temizlenir. Esc ekranı kapatmaz; ölüyken yenileme güvenli noktadan canlı yükler.
- Gerçek arazi/navigasyon katmanlı north-up minimap, bağımsız +/−/tekerlek zoom, NPC/görev, normal/elit/boss, loot, hedef, güvenli nokta, bölge/sandık ve parti altyapısı. M haritası bölge ve marker filtreleri, tooltip ve yaratık kümelendirmesi içerir. Keşfedilmeyen bölgenin arazi katmanı ilk ziyarette cache'lenir.
- Ortalanmış 140 ms loot açılışı, yaklaşık 0.95 saniyelik yüksek kontrastlı hareket işareti, sınıf renkleri ve atlasları, radial cooldown, I/C için tek izole önizleme. Bone attachment'lar ayrıca kopyalanarak gerçek kılıç/asa önizlemeye dahil edildi.
- Tek hedef skill-range torusu kaldırıldı; ground/AOE göstergeleri arazi yüksekliğine oturur ve geçersiz hedefte kırmızı olur. Şeffaf Fresnel kalkan, kaliteye bağlı rune/impact ve silaha bağlı sarı/turuncu/kırmızı flame particle'ları süre sonunda temizlenir. Mage asasında uç ve tutuş çevresinde alev vardır.

## Mimari ve kayıt

CLASS_DEFS, model/portre/socket/başlangıç ekipmanı/stat/skill/animasyon/efekt/ödül verilerinin ortak kaynağıdır. Warrior Güç; Mage Zeka üzerinden hasar kazanır. Uyumlu ekipman ve görev/dükkân silahları sınıfa göre seçilir. Mage dokuz yeteneği: Arkane Darbe, Ateş Küresi, Buz Mızrağı, Zincir Şimşek, Işınlanma, Buz Çemberi, Mana Kalkanı, Alev Gücü, Meteor. Projectile hasarı temas callback'inde verilir; zincir üç farklı hedefle sınırlıdır. Blink ara engel/suyu aşamaz; meteor uyarı, düşüş, temas, çatlak ve kontrollü kamera sarsıntısını kullanır.

Yeni ana modüller: characters/ClassDefs, CharacterStore, SaveService; combat/DeathFlow ve ProjectilePool; progression/QuickItems; ui/CharacterLobby, LobbyPreview, DeathScreen, QuickItemBar, WorldMap. Güncellenen dosyaların tam listesi [changed-files.txt](changed-files.txt) içindedir.

SaveService sürümlü envelope'u tora-character:<id>:<section> altında tutar. Envanter, ekipman/altın, stat, görev/XP, bölge/konum, sandık ve QWER birbirinden ayrıdır. Grafik ve ses ortaktır. Eski v1 kayıtların bütün beş bölümü tek Warrior yuvasına taşınır; doğrulama bitmeden migration tamamlandı yazılmaz, orijinaller silinmez. Başarılı taşıma, quota nedeniyle başarısız taşıma, bozuk/uyumsuz kayıt, iki karakter izolasyonu ve isimle silme testleri geçti. Gerçek kullanıcı tarayıcı depolamasına testler sırasında erişilmedi; migration ilk profil açılışında çalışır.

## Sanat ve lisans

| Yeni dosya | İçerik | Boyut / geometri | Kaynak |
|---|---|---|---|
| female-mage.glb | Ayrı rigli kadın kıyafeti; özgün pileli cübbe, omuz örtüsü, saç, taç | 4.09 MB; 15,632 üçgen; 65 joint | Quaternius Female Peasant CC0 + özgün geometri |
| jade-staff.glb | Oyma gövde, bronz taç, kesilmiş yeşim | 25.8 KB; 852 üçgen | Özgün prosedürel, CC0 |
| mage-library.glb | 17 sınıf state eşleştirmesi | 9.31 MB; 17 klip | CC0 UAL 1/2 türevi |
| mage.webp / mage-skills-atlas.webp / mage-items-atlas.webp | Portre, dokuz skill, dört eşya | 512² / 768² / 512² WebP | OpenAI image generation; Sharp dönüşümü |

Mage, Ranger/Warrior gövdesinin yeniden boyanması değildir. Yüz, mevcut CC0 kadın kafa tabanını paylaşır. Animasyonlar UAL spell/run/hit/death kliplerinden düzenlenen varyantlardır; yeni motion-capture kaydı olarak sunulmaz. Asa hand_r socket'ini izler. Warrior iki elli tutuş/IK ve dokuz yeteneğini korur. Mage sesleri özgün Web Audio sentezidir. Kaynaklar ve lisanslar [THIRD_PARTY_LICENSES.md](../../THIRD_PARTY_LICENSES.md), üretilen raster dosya yolları ve tam promptlar [mage-art-prompts.json](../../assets/ui/mage-art-prompts.json) içindedir.

## Test kanıtları

Başlangıç: temiz npm ci, 11 unit ve 39 tarayıcı kontrolü. Yeni sürüm: 25/25 unit, validate (54 modül / 55 manifest referansı / 61.8 MB), başarılı üretim build'i. Üretim paketi 95 dosyadan oluşur; src, reports, tests ve node_modules içermez.

[Tarayıcı raporu](after/browser-summary.json): Warrior 16, Mage 17 senaryo grubu geçti. Gerçek klavye/mouse/sürükleme, bütün 1–9 skill'ler, iki çözünürlükte HUD, I/C renderer/buffer korunması, NPC/görev/mağaza, loot, bölge, ölüm/iki respawn, karakter değişimi/silme ve kayıt yükleme doğrulandı. [Ek kabul raporu](after/acceptance-summary.json): Warrior 8, Mage 11 kontrol geçti; uzaktaki keseye native click, yalnızca loot kapatan dış tık, sınıf ödülü, 20 panel çevrimi, 50 buff aç/kapat çevrimi, üç benzersiz zincir hedefi, slow bitişi, engel arkasına reddedilen blink ve ölümde reload doğrulandı.

| Sınıf | Low FPS | Medium FPS | High FPS | En yüksek p95 frame |
|---|---:|---:|---:|---:|
| warrior | 60.0 | 60.0 | 60.0 | 16.8 ms |
| mage | 60.0 | 60.0 | 60.0 | 16.7 ms |

1920×1080, yerel Edge 155.0.4283.45, headless ve donanım renderer'ı. Kısa rAF örnekleri bu oturumda yaklaşık 60 Hz ile sınırlıydı; aynı makinedeki önceki headed/background ölçümleriyle hızlanma oranı hesaplanmadı. I/C açık/kapalı örneklerinde ek FPS kaybı gözlenmedi. Yoğun orman soak logları yaklaşık 54–58 FPS idi. Bütün yoğun sahnelerde sabit 60 FPS hedefi doğrulanmış değildir.

[Soak raporu](after/soak-summary.json): her sınıfta ayrı 600 saniye mouse hareketi, minimap, panel ve combat/buff kullanımı.

| Sınıf | Süre | GC sonrası heap | Mesh | Texture | Engine | Particle system |
|---|---:|---:|---:|---:|---:|---:|
| warrior | 601.1 sn | 111.0 → 123.0 MiB | 345 → 355 | 98 → 124 | 2 → 2 | 4 → 4 |
| mage | 600.8 sn | 110.9 → 122.0 MiB | 354 → 362 | 92 → 114 | 2 → 2 | 4 → 4 |

İlk dakika önizleme/asset cache'i ısındıktan sonra heap ve materyal/texture sayıları plato yaptı. Son örnekte iki engine, kapalı önizlemede sıfır listener, sıfır aktif projectile ve tek bölge cache'i vardı. Havuz üst sınırı 16 projectile; cache en fazla üç bölgedir. Bu 10 dakikalık gözlem, sınırsız süreli bellek garantisi değildir.

Ölçüm sürümleri açıkça ayrıldı: iki soak index-Wy7VShbi.js üzerinde tamamlandı. Son ekipman önizlemesi/kadraj, Mage elde alev ve sprite görünürlüğü düzeltmeleri ardından 33 kontrol index-BFupCNNh.js üzerinde tekrar geçti; en son flame yoğunluğu değişikliği index-eyr-5oGJ.js üzerinde ek 19 kontrolle doğrulandı. Son iki sınıflı kabul testi 20 panel ve 50 buff çevriminde mesh/texture/engine/particle sayılarının sabit kaldığını da doğrular.

Minimap için 200 zorlanmış güncelleme: warrior: ortalama 0.013 ms, p95 0.100 ms; DOM 691 → 691; mage: ortalama 0.012 ms, p95 0.100 ms; DOM 691 → 691. Statik geometri her frame üretilmez.

İki browser/soak raporunda console error, warning spam, başarısız asset isteği/404 ve render-loop hatası: 0. Build'deki iki UMD script bundling bildirimi mevcut yerel Babylon dağıtımına aittir; vendor dosyaları paketlenir ve tarayıcıda çalışır.

## Ekran görüntüleri

| Görünüm | Önce | Sonra |
|---|---|---|
| Dünya/HUD | [1080p](before/after-world-1080.png) | [Warrior](after/warrior-hud-1080.png), [Mage](after/mage-hud-1080.png) |
| Envanter | [I](before/after-inventory-1366.png) | [Warrior](after/warrior-equipment-preview.png), [Mage](after/mage-equipment-preview.png) |
| Minimap/harita | [Minimap](before/minimap.png) | [M haritası](after/mage-world-map.png) |
| Loot | [Kese](before/loot-window-1366.png) | [Ortalanmış](after/warrior-loot-centered.png) |
| Hareket işareti | [İşaret](before/move-marker-1366.png) | [Yeni](after/warrior-move-marker.png) |

- [Karakter seçimi](after/warrior-selection.png), [Warrior oluşturma](after/warrior-warrior-create.png), [Mage oluşturma](after/mage-mage-create.png).
- [Warrior dünyada](after/warrior-world.png), [Mage dünyada](after/mage-world.png), [QWER/skill bar](after/mage-quick-items.png).
- [Ölüm seçenekleri](after/warrior-death.png), [yerinde dirilme](after/warrior-local-respawn.png), [güvenli dirilme](after/warrior-safe-respawn.png).
- [Warrior 7 kalkan](after/warrior-shield-settled.png), [Warrior 8 alev](after/warrior-flame-settled.png), [saldırıda alev](after/warrior-flame-attack.png), [detay](after/warrior-flame-detail.png).
- Mage [arkane](after/mage-skill-1.png), [ateş](after/mage-skill-2.png), [buz](after/mage-skill-3.png), [zincir](after/mage-skill-4.png), [meteor](after/mage-skill-9.png), [geçersiz blink](after/mage-blink-invalid.png), [alev](after/mage-flame-detail.png).

## Sınırlar ve yayın

Sabit 60 FPS yoğun sahnelerin tamamında sağlanmış sayılmıyor. Mage animasyonları lisanslı kaynaklardan düzenlenmiştir; ayrı özgün mocap üretimi yapılmadı. Parti marker altyapısı hazırdır; bu revizyon canlı çok oyunculu parti servisi eklemez. Kayıtlar yerel tarayıcıdadır.

Yayın hedefi: https://yigittaner.online/tora-online/ . Yerel doğrulanan kaynak main'e gönderilir; Pages unit/build ve paketleme çalıştırır. Yerel testlerin tekrarına yönelik uzun CI browser adımı manual yayında atlanır.
