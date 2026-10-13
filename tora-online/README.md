# Tora Online

Mevcut Babylon.js/Vite projesi üzerine geliştirilen izometrik RPG. Üç bölge, Warrior ve Mage, görev, dükkân, envanter, savaş efektleri ve karakter seçim ekranı korunur. Sunucu yapılandırıldığında gerçek PostgreSQL/WebSocket çevrimiçi modu açılır; yapılandırma yoksa açıkça etiketlenmiş yerel tek oyunculu demo çalışır.

## Çalıştırma

`npm ci`, ardından `npm run dev`. Üretim için `npm run build`; `dist` elle düzenlenmez. Yayın paketinde kaynak, rapor ve node_modules bulunmaz. Eksik Chromium için `npx playwright install chromium`.

Gerçek çevrimiçi geliştirme için `npm run dev:online` kullan. Bu komut yerel PostgreSQL'i `.tora-db` içinde başlatır, migration uygular, Node game server'ı `localhost:8080` ve Vite istemcisini `http://localhost:5173/` üzerinde açar. İki ayrı tarayıcı profiliyle iki hesap oluşturulabilir. `.tora-db` Git'e girmez. Sunucu ayrı çalıştırılacaksa `DATABASE_URL` ve `ALLOWED_ORIGINS` tanımla, `npm run db:migrate` ve `npm run server` çalıştır; istemciyi `VITE_GAME_API_URL` ile derle veya başlat.

Çevrimiçi modda hesaplar bcrypt ile hashlenir, oturum yalnızca HttpOnly çerezde taşınır; karakter/progression localStorage'a yazılmaz. Login → sunucudaki üç karakter yuvası → WebSocket join akışı kullanılır. Node sunucusu 20 Hz hareket/yaratık simülasyonu yapar; istemci yalnız hareket, yetenek ve etkileşim isteği gönderir. Yakın varlık snapshot'ları 10 Hz gelir. Altın, XP, eşya ve görev güncellemeleri PostgreSQL işlemlerinde kaydedilir. Geçici kopmada istemci aynı çerezle yeniden bağlanır.

Çevrimiçi kontroller: WASD/oklar veya zemine tıklayarak hareket, yaratığa tıklayarak hedef/seviye 1 saldırı, 1–9 yetenekler, F ganimet/NPC/sandık, I çanta, Enter sohbet. Dükkân için Ayame'nin yanındayken **Dükkân** düğmesi kullanılır. Online çanta eşyaları tıklandığında kullanma/kuşanma isteği sunucuya gider. Online HUD mevcut Babylon sahnesi ve karakter/yaratık modellerini kullanır; yerel moddaki ayrıntılı panel/minimap özelliklerinin tamamı henüz çevrimiçi HUD'a taşınmadı.

## Sunucu dağıtımı

GitHub Pages yalnız statik istemciyi sunar; Node/WebSocket/PostgreSQL için HTTPS arkasında ayrı bir sunucu gerekir. Sunucuda `.env.example` değerlerini gerçek parola ve origin ile doldur, `docker compose --env-file .env -f compose.online.yml up -d --build` çalıştır. `game.yigittaner.online` gibi HTTPS bir adreste `/game` WebSocket upgrade ve diğer API yollarını `127.0.0.1:8080` adresine yönlendir. GitHub deposunda `TORA_GAME_API_URL` Actions değişkenini o HTTPS origin'e ayarla; Pages iş akışı önce mevcut tek oyunculu regresyonu çalıştırır, sonra çevrimiçi istemciyi yeniden derler. Değişken ayarlanmadan yayımlanan `/tora-online/` yolu yerel demo olarak kalır.

İlk sürüm tek Node sürecindeki mantıksal bölge odalarını kullanır. Guild/friend tabloları ileri aşama için vardır; parti/lonca akışı, özel sohbet, shard dağıtımı ve çevrimiçi HUD'ın bütün eski panel özellikleri henüz yoktur. Üretimde sunucuyu çoklu kopyaya çıkarmadan önce oda yönlendirmesi ve ortak state altyapısı gerekir.

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
- `npm run test:online`: gerçek geçici PostgreSQL, iki WebSocket istemcisi, auth/karakter, hareket, ortak yaratık HP, ödül/ganimet ve DB persistence.
- `npm run test:online:browser`: `dev:online` çalışırken iki bağımsız Edge profiliyle kayıt, karakter seçimi, görünürlük, hareket ve ortak yaratık HP.
- `npm run validate`: modüller, importlar ve manifest assetleri.
- `npm run test:browser`: iki sınıfta gerçek Chromium etkileşimleri.
- `node tests/class-acceptance.mjs`: uzaktaki loot, ekipman önizlemesi, efekt tekrarları, Mage zincir/slow/blink ve ölüm sırasında yenileme kontrolleri.
- `npm run test:browser -- --class=mage --headed`: tek sınıfı görünür tarayıcıda test et.
- `npm run test:soak`: her sınıfta ayrı 600 saniyelik oynanış/harita/önizleme kontrolü.

Asset kaynakları ve değişiklikleri [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) içinde belgelenir. Mage cübbesi/saç/asa, ayrı CC0 kadın kıyafeti üzerinde özgün geometridir; animasyonlar lisanslı UAL kliplerinden düzenlenmiş sınıf varyantlarıdır. Portre ve atlaslar özgün üretilmiş raster sanattır. Başka oyunların assetleri kullanılmaz.
