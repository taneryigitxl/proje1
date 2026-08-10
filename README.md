# yigittaner.online

`yigittaner.online` için bağımsız, sade bir statik web sitesi.

## VS Code'da açma

1. VS Code'da **File > Open Folder** seçeneğini aç.
2. Bu `yigittaner-online` klasörünü seç.
3. `index.html`, `styles.css` ve `script.js` dosyalarını düzenle.
4. Önizleme için `index.html` dosyasını tarayıcıda açabilir veya VS Code'daki **Live Server** eklentisini kullanabilirsin.

## GitHub'a ilk gönderim

GitHub'da `yigittaner-online` adında boş ve **Public** bir repository oluştur. README, .gitignore veya lisans ekleme; bunlar klasörde hazır.

VS Code içinde **Source Control > Initialize Repository** seç. Değişiklikleri kaydet ve ilk commit'i oluştur. Sonra **Publish Branch** ile GitHub'daki yeni repository'ye gönder. Alternatif terminal komutları:

```powershell
git init
git add .
git commit -m "İlk site yapısı"
git branch -M main
git remote add origin https://github.com/GITHUB_KULLANICI_ADI/yigittaner-online.git
git push -u origin main
```

## GitHub Pages ayarı

Repository içinde **Settings > Pages** sayfasına git:

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/(root)`
- **Save**

Ardından **Custom domain** alanına `yigittaner.online` yaz ve kaydet. DNS doğrulandıktan sonra **Enforce HTTPS** seçeneğini aç.

## TurkTicaret DNS kayıtları

TurkTicaret müşteri panelinde alan adının **DNS Yönetimi / Gelişmiş DNS** ekranına git. Eski park/yönlendirme A veya CNAME kayıtları çakışıyorsa kaldır. Şu kayıtları oluştur:

| Tür | Ad / Host | Değer / Hedef | TTL |
|---|---|---|---|
| A | `@` (panel kabul etmezse boş) | `185.199.108.153` | 3600 / Varsayılan |
| A | `@` | `185.199.109.153` | 3600 / Varsayılan |
| A | `@` | `185.199.110.153` | 3600 / Varsayılan |
| A | `@` | `185.199.111.153` | 3600 / Varsayılan |
| CNAME | `www` | `GITHUB_KULLANICI_ADI.github.io` | 3600 / Varsayılan |

`GITHUB_KULLANICI_ADI` bölümünü gerçek GitHub kullanıcı adınla değiştir. CNAME hedefinde `https://`, yol veya repository adı bulunmamalı.

DNS yayılması çoğunlukla daha hızlı olsa da 24 saate kadar sürebilir. Windows PowerShell'de kontrol:

```powershell
Resolve-DnsName yigittaner.online -Type A
Resolve-DnsName www.yigittaner.online -Type CNAME
```

Beklenen sonuç: ilk sorguda GitHub'ın dört IP adresi; ikinci sorguda `GITHUB_KULLANICI_ADI.github.io`.

## Dosyalar

- `index.html`: Sayfa içeriği
- `styles.css`: Renkler ve görünüm
- `script.js`: Küçük etkileşimler
- `CNAME`: GitHub Pages özel alan adı
- `.nojekyll`: Dosyaların doğrudan statik olarak sunulmasını sağlar
