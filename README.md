# Nita Yollarda

Atlas ve Nita ile aynı cihazda veya oda koduyla çevrimiçi oynanan, beş bölümlük 2D platform oyunu. Proje saf HTML, CSS ve JavaScript kullanır; derleme adımı yoktur.

## Kontroller

- Atlas: `A` / `D` ile hareket, `W` ile zıplama, `S` ile güç ışını
- Nita: `←` / `→` ile hareket, `↑` ile zıplama, `↓` ile görünmezlik pelerini
- `R`: mevcut bölümü yeniden başlatır

Mobil yatay ekranda iki karakter için dokunmatik kontroller görünür.

## Oyun döngüsü

Her bölümde Atlas ve Nita kendi kapı renkleriyle eşleşen altınları toplar. Bölüm sonu pazarında:

- Atlas'ın güç yüzüğü beyaz, mavi, mor ve sarı/Legendary seviyelerinde sırasıyla 3, 4, 6 ve 12 hasar verir; görünür en yakın düşmanı otomatik hedefler.
- Nita'nın pelerini aynı seviyelerde 1, 2, 3 ve 5 saniye görünmezlik verir.

Yükseltmeler bölümleri kolaylaştırır; düşmanlar ve kameralar alternatif hareket rotalarıyla da aşılabilir.

Beşinci bölüm karanlık bir boss arenasıdır. Mario 10 can slotuna sahiptir; Legendary yüzüğün her iki isabeti bir slotun yarısını götürür, son slot ise yalnızca Nita'nın 20 saniyede bir açılan anıt ritüeliyle kırılabilir. Mario karakterleri dört isabette yener ve her iki isabetten sonra bir can orbu bırakır.

## Çalıştırma

`index.html` dosyasını doğrudan açabilir veya VS Code Live Server gibi bir statik sunucuyla klasörü yayınlayabilirsin.

Ana dosyalar:

- `index.html`: oyun arayüzü ve pazar
- `styles.css`: HUD, dokunmatik kontroller ve pazar görünümü
- `script.js`: fizik, beş bölüm, düşmanlar, kameralar, altınlar, yetenekler ve çok oyunculu senkronizasyon
- `assets/`: karakter ve düşman görselleri
