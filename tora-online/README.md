# Tora Online

Mevcut Babylon.js/Vite projesi üzerine geliştirilen izometrik yerel MMORPG temeli. Üç bölge, görev, NPC dükkânı, envanter, statlar ve ganimet sistemi korunur. Bu sürüm Warrior ve Mage sınıfları, üç karakter yuvası, karakter başına kayıt ve oyuncu seçimli yeniden doğma akışını ekler.

## Çalıştırma

`npm ci`, ardından `npm run dev`. Üretim için `npm run build`; `dist` elle düzenlenmez. Yayın paketinde kaynak, rapor ve node_modules bulunmaz. Eksik Chromium için `npx playwright install chromium`.

## Kontroller

Sol tık: koş, hedef seç ve saldır; düşmana, NPC ve keseye otomatik yaklaş. Sol tuşu basılı tut: imlece ilerle. 1–9: sınıf yetenekleri. Q–W–E–R: hızlı eşya yuvaları; envanterden sürükle, sağ tıkla temizle. F: açık keseyi tamamen al. I: envanter. C: karakter. M: filtrelenebilir dünya haritası. Esc: panel / menü. Tekerlek: kamera; minimap üzerindeyken yalnızca harita yakınlaşır. Klavye hareketi ve zıplama yoktur. Sağ tık kamerayı döndürmez. Metin yazarken savaş kısayolları çalışmaz.

## Karakterler ve kayıt

Profil → karakter seçimi/oluşturma → Dünyaya Gir. Her profilde üç yuva, 2–16 karakterlik benzersiz ad ve değiştirilemeyen sınıf bulunur. Silme işlemi adın aynen yazılmasını gerektirir. Veriler bu tarayıcıda saklanır; çevrimiçi hesap/sunucu senkronizasyonu değildir.

`CLASS_DEFS` model, portre, silah socket'i, animasyon, dokuz skill, stat formülü, başlangıç eşyası ve ödülleri tanımlar. Warrior Güç, Mage Zeka üzerinden hasar kazanır. Uyumsuz silah/zırh kuşanılması reddedilir.

`SaveService` sürümlü verileri `tora-character:<id>:<section>` anahtarlarına yazar. Envanter, stat, görev/XP, dünya, sandık ve QWER kayıtları ayrıdır; grafik/ses ortaktır. Eski tek karakter verileri ilk profil açılışında bir Warrior yuvasına taşınır. Orijinaller silinmez; başarısız taşıma tamamlandı işareti koymaz. Bozuk kayıt varsayılana döner.

## Ölüm

ALIVE → DYING → AWAITING_RESPAWN_CHOICE → RESPAWNING. Seçim yapılmadan yeniden doğulmaz. Yerinde diril: %10 can, %20 mana ve 3 saniye koruma; saldırı korumayı bitirir. Güvenli noktada diril: tam can/mana. Geçersiz ölüm konumu güvenli noktaya yönlendirilir. Ölüyken yenileme güvenli noktadan canlı yükler. Esc ölüm ekranını kapatmaz.

## Harita, eşyalar ve efektler

Minimap kuzey yukarı çalışır. Statik arazi/navigasyon katmanı bölge başına cache'lenir; oyuncu, yaratık, görev, loot, hedef ve parti altyapısı hareketli katmandadır. M haritasında bölge/marker filtreleri vardır. QWER eşyayı taşımaz; referans, kalan miktar ve eşya bazlı ortak cooldown tutar. Tükenen referans güvenli biçimde yeniden edinmeyi izler.

Mage mermileri sabit bir havuz kullanır; hasar temas anında verilir. Zincir en fazla üç farklı hedefe gider. Blink doğrusal engel kontrolünü geçmeden kullanılamaz. Meteor uyarı/düşüş/temas zinciri kullanır. Tek hedef skillinde büyük menzil torusu yoktur. Zemin göstergeleri arazi yüksekliğine oturur.

## Doğrulama

- `npm test`: kayıt izolasyonu, migration, isim/silme kuralları, QWER, ölüm/koruma, combat ve loot işlemleri.
- `npm run validate`: modüller, importlar ve manifest assetleri.
- `npm run test:browser`: iki sınıfta gerçek Chromium etkileşimleri.
- `node tests/class-acceptance.mjs`: uzaktaki loot, ekipman önizlemesi, efekt tekrarları, Mage zincir/slow/blink ve ölüm sırasında yenileme kontrolleri.
- `npm run test:browser -- --class=mage --headed`: tek sınıfı görünür tarayıcıda test et.
- `npm run test:soak`: her sınıfta ayrı 600 saniyelik oynanış/harita/önizleme kontrolü.

Asset kaynakları ve değişiklikleri [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) içinde belgelenir. Mage cübbesi/saç/asa, ayrı CC0 kadın kıyafeti üzerinde özgün geometridir; animasyonlar lisanslı UAL kliplerinden düzenlenmiş sınıf varyantlarıdır. Portre ve atlaslar özgün üretilmiş raster sanattır. Başka oyunların assetleri kullanılmaz.
