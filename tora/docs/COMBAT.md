# TORA savaş

Savaş henüz oynanabilir değil. Bu dosya bir sonraki aşamanın sınırı.

İstemci yalnızca niyet gönderir: hedef kimliği ve yetenek kimliği. Hasar, mana, bekleme süresi, mesafe ve hedefin hayatta olup olmadığı sunucuda hesaplanır.

Hasar parçaları ayrı duracak:

- temel hasar
- stat çarpanı
- silah hasarı
- yetenek katsayısı
- hedefin savunması
- kritik, direnç, buff ve debuff

Tek bir dev fonksiyonun içine gömülmeyecek. Kayan hasar yazısı, vuruş efekti ve ekran sarsıntısı sonucu gösterir; sonucu üretmez.

Animasyon önceliği: ölüm, isabet, kaçınma ve saldırı, yürüme ile ezilmemeli. Yürüme ve koşu birbirinin yerine geçer. Bu kilit `Avatar` hareket kliplerinde duruyor; saldırı klipleri sayfa gelince aynı katmana bağlanacak.
