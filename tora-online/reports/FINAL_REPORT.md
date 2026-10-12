# TORA Online — UI / combat feedback polish

Tarih: 2026-10-12
Canlı adres: https://yigittaner.online/tora-online/

## BUFF VFX

`BuffVFXManager` eklendi. Savaşçı Savunması, oyuncu köküne bağlı yarı saydam çelik-mavi kalkan ve düşük yoğunluklu shimmer ile 6 saniye görünür. Öfke, aktif silahın emissive rengini kırmızı-turuncuya çevirir ve hafif kıvılcım parçacıkları üretir. Yenileme aynı nesneyi kullanır; görsel sayaçlar `player.buffs.guard` ve `player.buffs.rage` sürelerinden beslenir.

Buff bar artık ikon, radial kalan süre maskesi, saniye ve tooltip gösteriyor. Süre bitince ikon ve dünya efekti birlikte kapanıyor.

## WORLD INTERACTION

Sürekli büyük world-space kutular kaldırıldı. NPC, kapı ve sandıklar yakın mesafede küçük `E` etkileşim komutu gösteriyor; uzaklaşınca gizleniyor. NPC adı ayrı bir nameplate olarak kalıyor. Etiket konumları ekran sınırları içinde güncelleniyor ve kalıcı hareketli textbox kullanılmıyor.

## CHEST FIX

Animated chest GLB için `CLOSED → OPENING → OPEN → LOOTED` durum makinesi eklendi. `Chest_Open` bir kez oynuyor, `Chest_Opened` açık durumu koruyor. Ses yalnızca `CLOSED → OPENING` geçişinde tetikleniyor. Dolu çantada sandık LOOTED durumuna geçmiyor; tekrar etkileşimde yeniden açılmıyor. Sandık durumu yerel kayda yazılıyor.

## MINIMAP

Terrain, yol, su, yapılar ve statik parşömen katmanı korunarak dinamik katman ayrıldı. Oyuncu yön oku, normal mob, elite, boss, NPC/görev, portal ve sandık işaretleri farklı ikonlarla gösteriliyor. Sınırlı `+ / −` zoom ve ikon tooltipleri eklendi.

## PLAYER HUD

Sol üst profil kompakt portre, sınıf, seviye, HP, gecikmeli hasar katmanı, mana ve XP ile düzenlendi. Hasar red flash, iyileşme green/gold pulse kullanıyor. Profil altında karakter, envanter, yetenekler, görevler, arkadaşlar, lonca, grup, harita ve ayarlar için ikon kısayolları var. Arkadaş/lonca/grup için backend uydurulmadı; profesyonel boş durum panelleri gösteriliyor.

## SKILL BAR

Slot üstündeki 1–9 numaraları görsel olarak kaldırıldı; klavye kısayolları çalışıyor. Skill ikonları, radial cooldown, kalan saniye, mana maliyeti, hazır/aktif/yetersiz mana durumları ve detaylı tooltipler korunup iyileştirildi. Skill kısayolu paneli dokuz yeteneği listeliyor.

## INVENTORY / CHARACTER

Envanter iki kolonlu karakter + çanta düzenine taşındı. Render target tabanlı canlı karakter önizlemesi, mouse ile sınırlı döndürme, ekipman özeti ve desteklenmeyen slotlar için sade placeholderlar eklendi. Equip edilen silah/zırh world model ve önizlemede güncelleniyor. Item hover tooltipinde rarity, tür, bonus ve satış değeri bulunuyor. Karakter paneli aynı canlı önizlemeyi ve gruplu statları kullanıyor. Panel açıldığında diğer büyük panel kapanıyor.

## TEST

- `npm test`: 7/7 geçti.
- `npm run build`: geçti; production artifact yalnızca runtime ve referans varlıkları içeriyor.
- `npm run test:browser`: 24/24 geçti.
- Browser senaryoları: 1366×768 ve 1920×1080, üç kalite profili, hareket/kamera, inventory drag-drop, NPC/görev/mağaza, dokuz skill, buff VFX ve expiration, hedef/loot, ölüm/respawn, kayıt yükleme ve chest state machine.
- Son tarayıcı koşusunda 0 console error, 0 warning ve 0 başarısız asset isteği görüldü.
- Bu makinede 1920×1080 Low/Medium/High örnekleri yaklaşık 60 FPS verdi. Başka donanımlarda bağımsız ölçüm yapılmadı.

## KALAN EKSİKLER

- Özgün Doğu fantezisi karakter, yaratık ve mimari için ayrı yüksek detaylı 3B model seti üretilmedi; mevcut lisanslı stilize varlıklar geliştirildi.
- Uzak mesafeler için ayrı GLB LOD dosyaları yok; instancing, alpha yaprak kartları ve mesafe/hücre elemesi kullanılıyor.
- Arkadaş, lonca ve grup panelleri yalnızca frontend boş durumudur; multiplayer backend eklenmedi.
- Dokunmatik cihaz ve farklı zayıf GPU profilleriyle kabul testi yapılmadı.
