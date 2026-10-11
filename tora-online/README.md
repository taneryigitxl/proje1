# Tora Online — izometrik oyun dilimi

Babylon.js prototipinin mevcut modüler yapısı ve giriş ekranı korunarak geliştirilmiştir. Statik GitHub Pages yolu: /proje1/tora-online/.

## Çalıştırma

Bu klasörde npm ci ve npm run dev çalıştırın. npm run build yerel vendor, kaynaklar ve assetlerle dist/ üretir. npm test oynanış regresyonlarını, npm run validate modül ve GLB bütünlüğünü kontrol eder.

## Oyna

Mevcut demo girişi: admin / 2850. Sol tık: zemin hareketi veya düşmana yaklaş/saldır; WASD: kamera yönünde hareket; Shift: koşu; Space: zıplama; 1–9: yetenek; I: envanter; C: statlar; Escape: menü. Sağ sürükle: yatay kamera; tekerlek: sınırlı zoom.

Ayame’den görevi al, kuzey kapısından ormana geç, beş yaratığı yen, düşen sandıkları yakın mesafeden topla, üç Kadim Diş’i teslim et; harabe kapısından Kül Muhafızı’na ulaş. Kapı/NPC etiketi ilk tıkta yaklaştırır; yakında ikinci tık etkileşir. Grafik profilleri Escape menüsünden değişir.

WebGPU otomatik denenir; destek/hata halinde WebGL2 kullanılır. WebGL2’yi ayrıca ?renderer=webgl ile test edebilirsin. Kayıtlar cihazdaki tarayıcı localStorage’ında tutulur. Demo girişi gerçek sunucu doğrulaması yapmaz.

## İçerik

45° izometrik kamera, A* rota, rigli kadın/kılıç, üç düşman türü ve mini boss, üç ayrı yüklenen bölge, gerçek GLB çevre/çim/loot, PBR arazi, görev/XP/altın/dükkân/envanter/ekipman ve yerel kayıt.

Asset kaynakları: [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md). Ölçümler ve açık işler: [IMPLEMENTATION_REPORT.md](IMPLEMENTATION_REPORT.md). NetworkAdapter gelecekteki authoritative WebSocket sınırını tanımlar; mevcut sürüm yerel simülasyondur.
