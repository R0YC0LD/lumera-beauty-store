# Luméra Beauty Store

Luméra; sıcak mercan tonlarında özgün marka kimliği, ürün keşfi, arama, favori, sepet, checkout demosu ve kapsamlı yönetim paneli bulunan kozmetik e-ticaret deneyimidir.

## Öne çıkanlar

- Masaüstü ve mobil uyumlu premium mağaza vitrini
- Arama, ürün detayı, favori, kalıcı sepet ve tek sayfa checkout akışı
- Ciro, sipariş, dönüşüm, stok ve bekleyen işler dashboard'u
- Katalog, müşteri, kampanya, banner, içerik, tedarikçi ve rapor modülleri
- iyzico / PayTR seçimi, 3D Secure, test modu, taksit ve alternatif ödeme ayarları
- D1 üzerinde kalıcı mağaza ayarları ve denetim kaydı
- GitHub Pages için bağımsız statik demo

## Yerel geliştirme

```bash
npm ci
npm run dev
```

Üretim doğrulaması:

```bash
npm run build
```

## Güvenlik

Gerçek POS anahtarları kaynak koda, tarayıcı depolamasına veya GitHub deposuna yazılmaz. `.env.example` yalnızca gerekli anahtar adlarını listeler. Canlı değerler şifreli barındırma ortam değişkenleri olarak tanımlanmalıdır. Gerçek tahsilat için sağlayıcı hesabı, şirket evrakları, webhook doğrulaması ve gerçek kartla uçtan uca test gerekir.

## Yayın

`.github/workflows/pages.yml`, statik mağaza ve yönetim demosunu GitHub Pages'e yayınlar. Tam sunucu/D1 sürümü Sites üzerinden dağıtılır.
