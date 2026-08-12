# Nita Yollarda

Atlas ve Nita ile aynı cihazda veya oda koduyla çevrimiçi oynanan, on bölümlük 2D platform oyunu. Proje saf HTML, CSS ve JavaScript kullanır; derleme adımı yoktur.

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

Nita'nın anıt ritüeli dört saniye sürer ve tek başına hasar vermez. Ritüel tamamlanınca kazanılan yıldırım hakkı `Shift` ile kullanılır; Nita ellerini kaldırır, gökten inen geniş alan saldırısı çevredeki düşmanları temizler ve menzildeyse bossun bir can slotunu götürür. Ritüel döngüsü her 10 saniyede bir yeniden açılır, Atlas bu alandan hasar almaz ve Nita boss savaşında görünmez olduğu sürece hasar görmez.

Boss savaşında düşen takım arkadaşı oyunu bitirmez. Dokuz saniye sonra beliren revive kupasını hayatta kalan oyuncu alırsa takım arkadaşı iki canla geri döner. `Ctrl` + `ı` gizli test kısayolu mevcut bölümü doğrudan geçirir.

## Köy, demirci ve Öfke Zırhı

Beşinci bölüm boss'u yenildiğinde biri Atlas'a, biri Nita'ya ait toplam iki **Öfkenin Kalbi** düşer. HUD'daki **Köy** düğmesi Kızıl Ocak Köyü'nü açar; köyde şimdilik etkileşime açık tek NPC Demirci Varko'dur. Her kalp, ilgili kahraman için siyah ve kırmızı detaylı bir Öfke Zırhı üretir. Köy açıkken aynı düğme **Göreve Devam Et** olarak değişir.

Üretilen zırh **Envanter** sekmesinden ilgili karakter kartının üzerine sürüklenerek kuşanır; dokunmatik ekranda önce zırha, sonra karaktere dokunmak da yeterlidir. Zırh başı açık bırakıp gövdeyi ve uzuvları kaplar, maksimum canı 4'ten 6 slota çıkarır. Tek bilgisayar modunda iki karakterin envanteri birlikte yönetilir. Çevrimiçi oyunda her oyuncu yalnızca kendi karakterinin envanterini, üretimini ve kuşanmasını yönetebilir; durum oda sahibi üzerinden senkronize edilir.

Altıncı bölümden itibaren zırhlı gölgeler 24 can taşır. Bu düşmanlar beyaz, mavi, mor ve sarı/Legendary ellerle sırasıyla 8, 6, 4 ve 2 isabette yenilir. 6–9. bölümlerde giderek daralan zamanlamalara sahip kızıl mühür lazerleri, daha hızlı devriyeler ve yoğun kamera düzenleri bulunur. Bu bölümlerdeki parıltılı altınlar çift değerlidir; bütün Atlas altınları toplandığında sarı el yükseltmesinden sonra Kadim Tılsım da son boss öncesinde alınabilir.

Onuncu bölümdeki Ak Muhafız; beyaz kanatlı, uzun kılıçlı, kapüşonlu ve siyah yüzünde beyaz gözleri görünen son bosstur. Temas hasarı vermez. Kılıç saldırısından 1,35 saniye önce hedef alanı giderek daha parlak kırmızı yanar; vuruş alandaki oyunculardan iki can slotu götürür. 36 canlık boss, en güçlü Atlas ekipmanıyla kesintisiz isabet durumunda yaklaşık 66–69 saniyede yenilir.

Test sırasında `Shift` + `ı`, Atlas ve Nita'nın altınlarını 99'a tamamlar ve marketi anında günceller.

## Çalıştırma

`index.html` dosyasını doğrudan açabilir veya VS Code Live Server gibi bir statik sunucuyla klasörü yayınlayabilirsin.

Ana dosyalar:

- `index.html`: oyun arayüzü ve pazar
- `styles.css`: HUD, dokunmatik kontroller ve pazar görünümü
- `script.js`: fizik, on bölüm, iki boss, düşmanlar, kameralar, lazerler, altınlar, yetenekler ve çok oyunculu senkronizasyon
- `assets/`: karakter ve düşman görselleri
