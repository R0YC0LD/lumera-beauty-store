# Luméra Beauty Store

Luméra; sıcak mercan tonlarında özgün marka kimliği, ürün keşfi, arama, favori, sepet, sipariş akışı ve kapsamlı yönetim paneli bulunan kozmetik e-ticaret uygulamasıdır.

## Öne çıkanlar

- Masaüstü ve mobil uyumlu premium mağaza vitrini
- Arama, ürün detayı, favori, kalıcı sepet ve tek sayfa checkout akışı
- Ciro, sipariş, dönüşüm, stok ve bekleyen işler dashboard'u
- Katalog, müşteri, kampanya, banner, içerik, tedarikçi ve rapor modülleri
- iyzico / PayTR seçimi, 3D Secure, test modu, taksit ve alternatif ödeme ayarları
- Logoya beş hızlı tıklamayla açılan gizli yönetici girişi
- Ürün, stok, sipariş, müşteri, bülten, ayar ve denetim verileri için Cloudflare Workers + D1
- GitHub Pages üzerinde bağımsız ve yönlendirme sorunu yaşamayan tam mağaza uygulaması

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

İlk yönetici bilgileri proje sahibinin isteğiyle `admin / 12345` olarak tanımlanmıştır. Canlı Worker bağlantısında parola yalnızca Cloudflare secret olarak tutulur ve ilk kurulumdan sonra değiştirilmelidir.

Gerçek POS anahtarları kaynak koda, tarayıcı depolamasına, D1 veritabanına veya GitHub deposuna yazılmaz. `.env.example` yalnızca gerekli anahtar adlarını listeler. Canlı değerler şifreli ortam değişkenleri olarak tanımlanmalıdır. Gerçek tahsilat için sağlayıcı hesabı, şirket evrakları, webhook doğrulaması ve gerçek kartla uçtan uca test gerekir.

## Yayın

`github-pages/` dizini GitHub Pages uygulamasını içerir. `cloudflare-worker/` dizini Firebase kullanılmadan hazırlanan merkezi API ve D1 şemasını içerir. Worker yayınlandığında oluşan adres `github-pages/config.js` içindeki `apiBase` alanına eklenir.
