# TORA eşyalar

Eşya henüz veritabanında tutulmuyor. İstemci eşya yaratamaz.

Tanımlar sürüm kontrolündeki veri dosyalarında duracak. Oyuncunun envanteri, kuşanması ve altını PostgreSQL'de duracak. Tanım ile sahip olma aynı tabloya doldurulmayacak.

Bir eşya tanımı: kimlik, ad, açıklama, ikon, tür, nadirlik, seviye şartı, sınıf şartı, stat bonusları, satış fiyatı, yığın, takas ve bağlanma.

Nadirlik etiketleri: Sıradan, Nadir, Seçkin, Destansı, Efsanevi.

Kuşanma yuvaları: silah, ikinci el, kask, zırh, eldiven, ayakkabı, kolye, küpe, yüzük, pelerin, binek, kostüm. Görüntü katmanları `docs/ART_PIPELINE.md` ile aynı sıradadır. Şu an her oyuncuda görünen kılıç, envanter eşyası değil; silah katmanının yer tutucusudur.

Envanter paneli 8×5 boş ızgaradır. Sürükle-bırak, tooltip ve sunucu doğrulamalı takma bir sonraki eşya aşamasında bağlanacak.
