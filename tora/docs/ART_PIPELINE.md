# TORA sanat hattı

Mevcut karakter PNG'leri yer tutucudur. Oyun mantığı bu dosyaları üreten script'e bağlı değildir. Nihai anime sayfaları aynı ızgaraya oturduğu sürece kod değişmez.

## Izgara

| Alan | Değer |
| --- | --- |
| Kare | 48 × 64 piksel |
| Yön satırları | aşağı, yukarı, sağ, sol |
| Satırdaki kare sayısı | 16 |
| Çapa | x 0.5, y 1 (ayaklar) |
| Dünya ölçeği | 0.5 (şu anki 16px köy ile orantı için) |
| Filtre | karakter katmanları linear, karolar nearest |

Klip yerleşimi:

- idle: sütun 0–3, 4 kare, döngü
- walk: sütun 4–9, 6 kare, döngü
- run: sütun 10–15, 6 kare, döngü

Saldırı, büyü, isabet, kaçınma, ölüm ve binek klipleri aynı satır düzeninde ayrı sayfalara eklenecek. Kod bu klipleri oynatmaya hazır olduğunda dosya adları `assets/manifest/avatar.json` içine yazılır.

Sol yön kendi satırındadır. Çalışma anında `flipX` kullanılmaz. Silah ve kalkan bu yüzden yöne göre ayrı çizilmelidir.

## Katman sırası

Arkadan öne:

1. gölge
2. binek
3. pelerin
4. beden
5. zırh
6. saç
7. ikinci el
8. silah
9. efekt

Şu an çizilen katmanlar beden, saç ve başlangıç kılıcıdır. Eksik doku sessizce atlanır.

## Dosya adları

```text
assets/characters/body/{female|male}.png
assets/characters/hair/{short|long|tied}.png
assets/characters/weapon/{id}.png
assets/characters/armor/{id}.png
assets/characters/cape/{id}.png
assets/effects/{id}.png
assets/monsters/{id}.png
assets/mounts/{id}.png
assets/tiles/{id}.png
assets/ui/{id}.png
assets/icons/{id}.png
assets/skills/{id}.png
assets/items/{id}.png
assets/npcs/{id}.png
```

Saç katmanı beyaz çizilir; renk Phaser tint ile gelir. Diğer katmanlar kendi renklerindedir.

## Köy karoları

Harita hâlâ 16px karo kullanır. Karakter kaynağı 48×64 olduğu için ekranda yaklaşık 24×32 dünya pikseli kaplar. Karolar 32px'e çıkınca `AVATAR_DISPLAY_SCALE` 1 yapılabilir. Çarpışma ayak kutusundan okunur, sprite boyutundan değil.
