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

Beşinci bölüm 3B cehennem atmosferli bir boss arenasıdır. Mario 10 can slotuna sahiptir; Legendary yüzüğün her iki isabeti bir slotun yarısını götürür, son slotu Atlas tek başına kırabilir ancak bu bölüm çok daha uzun sürer. Mario 10 saniyede bir sıçrayıp yerde kalanlara iki slot hasar verir ve 15 saniyede bir iki süper asker çağırır. Süper askerler yaklaşınca animasyonlu yakın dövüş saldırısı yapar, üç slot can taşır ve Legendary yüzükle iki isabette yenilir.

Nita'nın anıt ritüeli dört saniye sürer ve tek başına hasar vermez. Ritüel tamamlanınca kazanılan yıldırım hakkı `Shift` ile kullanılır; Nita ellerini kaldırır, gökten inen alan saldırısı çevredeki düşmanları temizler ve menzildeyse bossun bir can slotunu götürür. Ritüel döngüsü her 10 saniyede bir yeniden açılır ve Atlas bu alandan hasar almaz.

Boss savaşında düşen takım arkadaşı oyunu bitirmez. Dokuz saniye sonra beliren revive kupasını hayatta kalan oyuncu alırsa takım arkadaşı iki canla geri döner. `Ctrl` + `ı` gizli test kısayolu mevcut bölümü doğrudan geçirir.

Test sırasında `Shift` + `ı`, Atlas ve Nita'nın altınlarını 99'a tamamlar ve marketi anında günceller.

## Çalıştırma

`index.html` dosyasını doğrudan açabilir veya VS Code Live Server gibi bir statik sunucuyla klasörü yayınlayabilirsin.

Ana dosyalar:

- `index.html`: oyun arayüzü ve pazar
- `styles.css`: HUD, dokunmatik kontroller ve pazar görünümü
- `script.js`: fizik, beş bölüm, düşmanlar, kameralar, altınlar, yetenekler ve çok oyunculu senkronizasyon
- `assets/`: karakter ve düşman görselleri
