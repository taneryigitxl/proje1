# TORA yol haritası

Adres değişmez: `https://yigittaner.online/tora/`. Ana siteye dokunulmaz.

## Aşama 1 — görüntü ve arayüz temeli

Yapıldı:

- 48×64 katmanlı karakter ızgarası ve manifest
- idle, yürüme, koşu; dört yön
- Shift koşusu sunucuda hız çarpanı ile
- Türkçe arayüz, menü panelleri, sohbet sekmelerinin iskeleti
- Noto Sans ve Source Serif 4

Henüz yok: nihai anime çizimi, sınıf, gerçek envanter, savaş.

## Aşama 2 — sınıf ve stat

Dört sınıf, karakter oluştururken seçim, stat puanı, seviye, karakter paneline bağlama, PostgreSQL.

## Aşama 3 — envanter ve kuşama

Eşya tanımları, ızgara, tooltip, sürükle-bırak, silahın karakter katmanını değiştirmesi.

## Aşama 4 — savaş

Hedef, normal saldırı, yetenek, bekleme, mana, sunucu hasarı, ölüm, yeniden doğma, efekt ve yüzen sayı.

## Aşama 5 — canavarlar

Sunucu yapay zekâsı, saldırı, deneyim, ganimet, yeniden doğma.

## Aşama 6 — dünya sistemleri

Görev, dükkân, binek, grup, takas, depo, lonca, arkadaş, özel mesaj.

Her aşamada `npm test` ve `npm run build` temiz kalacak. Altın, eşya, stat, deneyim ve ganimet istemciden yazılmayacak.
