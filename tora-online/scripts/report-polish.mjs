import fs from 'node:fs/promises';
const dir='reports/current-audit';
const before=JSON.parse(await fs.readFile(dir+'/performance-before-visual.json','utf8'));
const after=JSON.parse(await fs.readFile(dir+'/performance-after.json','utf8'));
const poses=JSON.parse(await fs.readFile(dir+'/weapon-poses.json','utf8'));
const number=n=>n.toFixed(1),mib=n=>number(n/1048576);
const table=before.map((a,i)=>{const b=after[i];return `| ${a.classId} | ${a.timings.worldMs} → ${b.timings.worldMs} ms | ${number(a.metrics.p95FrameMs)} → ${number(b.metrics.p95FrameMs)} ms | ${number(a.metrics.renderP95Ms)} → ${number(b.metrics.renderP95Ms)} ms | ${a.metrics.drawCalls} → ${b.metrics.drawCalls} | ${mib(a.metrics.heap.usedSize)} → ${mib(b.metrics.heap.usedSize)} MiB |`;}).join('\n');
const warrior=poses.find(p=>p.classId==='warrior');
const maxGrip=Math.max(...warrior.poses.map(p=>p.frameProbe.maxError));
const maxSolve=Math.max(...warrior.poses.map(p=>p.frameProbe.maxSolveMs));
const markdown=`15 Ekim 2026 · Tora Online · Uygulama ve doğrulama kaydı

Mevcut Babylon motoru, iki kadın sınıfı ve kayıt sistemi üzerinde çalışıldı. Proje yeniden oluşturulmadı.

**Değişiklikler**

- Grafik desteği başlangıçta kontrol ediliyor. Lobi önizlemesinde loading/error/ready, zaman aşımı, kaynak temizliği ve tekrar deneme var. Önizleme başarısızlığı dünyaya girişi kilitlemiyor. Önizleme WebGPU hatasının küresel fallback ile kendiliğinden dünya başlatması giderildi. I/C önizlemeleri de hata durumunda kaynakları bırakıp tekrar deneme gösteriyor; modeller bind pose görünmeden örnekleniyor.
- Hover, seçim ve sonraki saldırı hedefi ayrıldı. Başlamış vuruş kendi hedefini korurken sonraki vuruş yeni hedefe gidiyor. Otomatik saldırı sırasında 750 ms süreli tek son geçerli skill komutu saklanıyor; mana/cooldown commit sırasında bir kez tüketiliyor. Zemin tıklaması sabit casti iptal edip hareketi hemen işliyor. Güvenli yaklaşma, erişilemeyen/kaldırılmış/ölü hedef ve ortak engel kontrolü eklendi. Seçim sade hitbox kullanıyor; hover 20 Hz ile sınırlı, otomatik mesh picking kapalı.
- Warrior kapüşonunun gerçek skinned yüzeyi gizlendi. Mage'in eski geometrik saçları yerine iki sınıfa dokulu, head skin ile hareket eden CC0 saç eklendi. Yüzün yanlış kırpılan kol/omuz parçaları temizlendi. Asa ve kılıç pivotları bind el eksenlerinden hesaplanıyor. İki kolun analitik çözümü kemik uzunluklarını koruyor; glTF yansıma işareti ağır komboda korunuyor. Hareketli castte koşu alt gövdeye, cast üst gövdeye uygulanıyor.
- Zincir Şimşek gerçek üç ayrı hedef arasında 5 m sıçrıyor; her sıçramada hasar %25 düşüyor. Sunucu tarafında da aynı zincir/görüş kuralı var. Kılıç izi gerçek bıçak uçlarından üretiliyor; ışınlar, izler ve mermi referansları temizleniyor.
- HUD sıcak taş/deri renklerine uyarlandı; ekipman/durum simgeleri özgün SVG oldu. Minimap yapıların gerçek sınırlarını ve köy meydanını gösteriyor. Mage'in mevcut cübbesine özgün dokuma/işleme dokusu ve UV eklendi. [Üretilen doku](../../assets/textures/characters/mage-brocade.webp), [tam prompt ve built-in üretim kaydı](../../assets/textures/characters/generation.json). Lisanslar [THIRD_PARTY_LICENSES.md](../../THIRD_PARTY_LICENSES.md) içinde.
- Warrior animasyon paketleri 15,7 MB → 3,0 MB oldu; kullanılmayan klip/sampler verisi temizlendi. Bölge geçişinde NPC/sandık malzemeleri ve başarısız silah bağlamasından kalan kaynaklar temizleniyor. Tekrarlı bölge kontrolünde mesh/malzeme/doku 451/92/156 → 451/92/156 kaldı.

**Test kanıtları**

- Production build ve modül/asset doğrulama geçti: [build.txt](build.txt). Babylon'un yerel defer scriptleri için Vite bundle uyarıları var; build başarılı.
- 41/41 otomatik test geçti; gerçek PostgreSQL ve iki WebSocket istemcisi entegrasyonu dahil: [unit-tests.txt](unit-tests.txt).
- İki sınıfta gerçek klavye/mouse ile 1–9, AOE basılı tut/bırak, otomatik saldırıdan skill'e geçiş, hızlı hedef değiştirme, hareket/ölüm/target-loss iptali, iki dirilme seçeneği, merkezde loot/F, I/C ve bölge geçişi geçti: [browser.json](browser.json).
- Üst üste/ölü/engel arkası/erişilemeyen/kaldırılan hedef, throttled picking ve tekrar bölge kaynakları geçti: [selection.json](selection.json).
- WASD/Space hareket üretmiyor; sağ tuş kamerayı döndürmüyor; minimap zoom kamerayı etkilemiyor; UI dünyaya tıklamıyor; QWER dört atanmış eşyayı birer kez tüketiyor: [controls.json](controls.json).
- Mevcut UI regresyonu iki sınıfta 1366×768, 1920×1080 ve 2560×1440'da geçti; F sandık ve loot dahil: [ui-tests.txt](ui-tests.txt).
- 17 animasyon state'i sürekli örneklendi. Ölçülen en büyük sol avuç–kabza yardımcı nokta hatası ${maxGrip.toExponential(2)} dünya birimi, en yüksek gözlenen IK süresi ${number(maxSolve)} ms; kol kemik uzunlukları sabit: [weapon-poses.json](weapon-poses.json). Bu rig ölçümüdür; bütün kamera açıları için parmak/yüz clipping sanat onayını temsil etmez.
- [Warrior 20 sn kayıt](warrior-combat-20s.webm), [Mage 20 sn kayıt](mage-combat-20s.webm). Uzun test kayıtları: [Warrior](warrior-animations.webm), [Mage](mage-animations.webm). Normal senaryolarda konsol/asset hatası yok; hata testlerinde grafik/manifest hatası kasıtlı üretildi.

**Aynı ortamda önce/sonra**

Windows, Edge ${after[0].browser} headless, WebGL2, medium, 1366×768, DPR ölçeği 1, localhost/no-store, sınıf başına yeni context. İlk ölçüm giriş düzeltmesinden sonra, görsel/IK optimizasyonlarından önce alındı. Tek yükleme örneği ve 120 frame kullanıldı; heap CDP GC sonrasında ölçüldü.

| Sınıf | Dünya yükleme | Frame p95 | Render CPU p95 | Draw call/frame | JS heap |
|---|---:|---:|---:|---:|---:|
${table}

[Önce ham ölçüm](performance-before-visual.json) · [Sonra ham ölçüm](performance-after.json). Frame time aynı kaldı; yeni saç/doku verileri JS heap'i artırdı. Genel FPS artışı veya bütün sınıflarda yükleme hızlanması iddia edilmiyor. JS heap toplam süreç belleği veya GPU VRAM değildir.

**Kalan doğrulamalar**

WebGPU-only donanım, Safari/Firefox, 10 dakikalık soak, GPU VRAM ve canlı iki tarayıcılı çevrimiçi istemci testi çalıştırılmadı. Tarayıcı savaş/HUD kanıtları varsayılan yerel Game akışına aittir; ayrı OnlineGame istemcisinin bütün akışları uçtan uca doğrulanmış sayılmamalı. Ayak teması ve tüm açılarda yüz/saç/kıyafet clipping'i için video örneklerini aşan kapsamlı sanat incelemesi yapılmadı.
`;
await fs.writeFile(dir+'/REPORT.md',markdown);
console.log('Report written.');
