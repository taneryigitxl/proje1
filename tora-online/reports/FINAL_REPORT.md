# Tora Online — görsel yenileme ve yayın raporu
Tarih: 2026-10-12T05:57:59.096Z
Canlı adres: https://yigittaner.online/tora-online/

## Uygulananlar
- Giriş, HUD, dokuz yetenek, envanter, karakter, görev, hedef, harita, NPC, mağaza, sohbet ve pause ekranları bronz/çelik/koyu yeşim sanat diliyle yenilendi.
- Raster skill ve item atlasları, kadın savaşçı/Ayame/Muhafız portreleri bağlandı. Inline skill SVG'leri, eşya emojileri ve GM/harf portreleri kaldırıldı.
- Radial cooldown, ayrı klavye katmanı, mana/hedef/aktif saldırı durumları ve hasar/menzil içeren tooltip.
- Şifre kaldırıldı; açık yerel demo profil girişi. Mevcut kayıt anahtarları ve ilerleme korundu.
- Çift tıklama equip/unequip düzeltildi. Panel/sohbet açıkken hareket, dünya tıklaması ve skill girişi korunuyor. Dışarı eşya sürükleme onay/iptal akışı çalışıyor.
- Dokuz skill dokuz ayrı rig klibine bağlandı. Sol el CCD IK, avuç temas hedefi ve sınırlı yumuşak uzama var; son testte 0.02–5.08 cm temas sapması ölçüldü. Görünür silah kaldırma, paslı/demir malzeme değişimi ve zırh bileklik görünümü.
- Torus/küre/disk savaş efekt havuzları yerine alpha dokulu kılıç izi, kıvılcım, kırık zemin, rüzgâr, öfke ve infaz efektleri; kaliteye göre 4/8/16 kıvılcım, kısa hit-stop ve kontrollü sarsıntı.
- Üç bölgenin ışık paleti ve koruluk/taş/bitki kompozisyonları düzenlendi. Yol kenarı alpha geçişi, GPU çim rüzgârı, hareketli su normali, yumuşak kıyı ve kıyı taşları.
- Kameradan oyuncuya ışınla occlusion fade; yalnızca örtüşen instance geometri paylaşan klona çevriliyor. Diğer nesneler instancing kullanıyor.
- Boss çift kılıç, farklı malzeme, portre ve darbe dokusuyla ayrılıyor. Parşömen haritada kuzey yönü, oyuncu, düşman, NPC/görev ve kapı işaretleri.
- Gerçek lisanslı OGG/MP3/FLAC sesler: adım, savurma, darbe, skill, UI, müzik, rüzgâr ve su. Üç ayrı kalıcı volume kanalı; sentetik oscillator/noise kodu kaldırıldı.
- Vite JS/CSS/UI hashleri; manuel cache parametreleri kaldırıldı. Taşınabilir Playwright testi eklendi; 14 eski platforma bağlı tanılama yardımcısı kaldırıldı.
- GitHub Pages workflow sadece üretim paketini yayımlar; test/kaynak/node_modules kopyası içermez.

## Testler ve sınırlar
- `npm test`: 7/7 geçti.
- `npm run build`: geçti. Babylon'un iki yerel klasik vendor scripti bilinçli olarak ayrı kopyalanır; Vite bunları paketlemeye ilişkin iki bilgilendirme üretir.
- İlk uzun tarayıcı testi: 600 saniye sürekli klavye/fare oynanışı + 20 kontrol; 0 console error, 0 warning, 0 başarısız istek.
- İkinci 600 saniye testi: 22 kontrol geçti, 0 hata/uyarı/başarısız istek; avuç IK iyileştirmesinden önceki aşama.
- Son build regresyon testi: 21 kontrol geçti; görev teslimi, gerçek dışarı drag/drop ve son IK dahil. 0 error, 0 warning, 0 başarısız istek.
- 1366×768 ve 1920×1080, Low/Medium/High; hareket, mouse/WASD iptali, jump/land, kamera döndürme/zoom, equip/unequip, NPC/görev/mağaza, üç bölge, 1–9 skill, mana, hedef ölümü, full bag loot, ölüm/respawn ve kayıt yükleme.
- İlk 1080p anlık profil örnekleri: Low 59.95, Medium 60.00, High 59.99 FPS. Uzun örnekler 59.95–60.02 FPS. Bunlar bu test makinesinde Edge ölçümüdür; farklı orta/zayıf donanım için garanti değildir.
- Doğal oyun adımları gerçek klavye/fare ile; tam dolu çanta, görev teslimi ve skill zamanlamasını ayıran senaryolar açık kontrollü fixture kullanır. Bunlar doğal ilerlemeyle tamamlanmış görev diye sunulmaz.
- Son avuç IK ve respawn düzeltmelerinden sonra ayrıca tüm smoke senaryoları tekrar çalıştırıldı. Uzun test ve son regresyon farklı rapor dosyalarında korunur.

## Assetler
- UI: 768×768 skill atlası, 1024×512 item atlası, üç 512×512 portre, küçültülmüş parşömen WebP.
- VFX: altı 256×256 alpha WebP.
- Çevre: dört optimize GLB. Pine 9,029; ortak ağaç 20,201; kayalar 5,094 ve 2,741 vertex. Yaprak/iğne kartları asıl lisanslı diffuse ve alpha dokularından hazırlanmıştır; dal/gövde geometrisi korunur.
- Ses: dokuz OGG efekt, bir MP3 müzik, iki küçük FLAC ortam kaydı.
- Su: 128×128 tile normal PNG.
- Eski assetler depoda korunur; manifestte kullanılmayan model ve ham atlaslar üretim paketine alınmaz.
- Üretim paketi yaklaşık 59.4 MiB; avatar/animasyon kütüphaneleri önceki sürümden devam eder.
- Lisanslar: [THIRD_PARTY_LICENSES.md](../THIRD_PARTY_LICENSES.md). Üretim istemleri: [art-prompts.json](../assets/ui/art-prompts.json).

## Değiştirilen dosyalar
- `index.html`, `menu.js`, `styles.css`, `README.md`, lisans/manifest/package dosyaları.
- `src/ui/{Art,SkillBar,HUD,TargetFrame,WorldUI}.js`.
- `src/player/{PlayerAnimator,PlayerController,TwoHandIK}.js`.
- `src/combat/{CombatSystem,CombatVFX}.js`, `src/audio/AmbientAudio.js`.
- `src/world/{RegionWorld,GlbGrass,GrassWind}.js`.
- `src/core/{AssetManager,Game}.js`, input/inventory/entity dosyaları; diğer modüllerde yalnızca eski import sürüm parametreleri temizlendi.
- `scripts/build.mjs`, asset hazırlama/sunucu betikleri, `tests/browser-smoke.mjs`.
- Kök `.github/workflows/pages.yml`, `scripts/package-pages.mjs`, `.gitignore`.

## Önce / sonra
- [Önce: giriş](before-login.jpg), [Önce: envanter](before-inventory.jpg).
- [Sonra: giriş 1366](after-login-1366.png), [Envanter](after-inventory-1366.png), [NPC](after-npc-1366.png), [Harabe](after-ruins-1366.png), [1080p](after-world-1080.png), [Orman gerçek CUA](after-forest-cua.png).
- [Uzun test ham sonuç](browser-results-core.json), [Son regresyon ham sonuç](browser-results-final-smoke.json).

## Hâlâ eksik / tamamlanmadı
- Portre kalitesine uygun, özel Doğu fantezisi kadın/yaratık 3D model seti ve özel iki elli motion-capture klipleri üretilmedi; mevcut lisanslı stilize rigler geliştirilerek kullanılıyor. Ani animasyon geçişlerinde avuç IK'sı birkaç cm toleransa sahiptir.
- Doğu mimarisine özel yeni bina seti yok; mevcut lisanslı yapılar yeniden yerleştirildi.
- Ayrı uzak GLB LOD seti henüz yok; instancing, alpha yaprak kartları, hücre/mesafe elemesi var.
- Bağımsız zayıf cihaz ve orta seviye farklı GPU ölçümü yapılmadı. Dokunmatik oynanış kabul testi yapılmadı.

## Yazılım GPU yayın sunucusu düzeltmesi
CI'de zıplama sabit milisaniye yerine gerçek airborne/grounded geçişini bekler. Çok yavaş karede bütün zıplamanın tek karede tüketilmemesi için simülasyon catch-up 250 ms ile sınırlandı. CI, tam 1366/1920 CSS arayüzünü 1/4 canvas çözünürlüğü ve tek gölge güncellemesiyle kontrol eder; FPS ölçümü için bu mod kullanılmaz. Yerel test normal render çözünürlüğünde tekrar çalıştırılır.
