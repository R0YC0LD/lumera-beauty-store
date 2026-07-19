# Luméra Beauty Store

Özgün Luméra kimliğiyle hazırlanmış tam kapsamlı kozmetik mağazası, sipariş akışı, yönetim paneli ve Firebase kullanmayan Cloudflare veri katmanı.

## Canlı yayın

- GitHub Pages: https://r0yc0ld.github.io/lumera-beauty-store/
- Tam uygulama önizlemesi: https://lumera-beauty-store.ongorulemeyengelecek.chatgpt.site

GitHub Pages yayını `github-pages/` klasörünü paketleyen GitHub Actions iş akışıyla otomatik güncellenir.

## Öne çıkanlar

- Masaüstü ve mobil uyumlu premium mağaza vitrini
- Arama, kategori filtreleri, sıralama, ürün detayı ve favoriler
- Kalıcı sepet, teslimat formu, ödeme seçimi ve sipariş kaydı
- Üç adımlı cilt analizi ve kişiselleştirilmiş ritüel önerisi
- Journal, bülten, kargo, iade, SSS, KVKK ve sözleşme içerikleri
- Kupon sistemi: yüzde / sabit tutar / ücretsiz kargo kuponları, minimum sepet, tarih ve kullanım limiti (sunucu tarafında doğrulanır)
- Ürün yorumları: müşteri gönderir, yönetici onaylar, vitrine canlı puan ve değerlendirme sayısı yansır
- Logoya beş hızlı tıklamayla açılan gizli yönetici girişi
- Tam çalışan yönetim modülleri: genel bakış (canlı ciro/sipariş), siparişler (durum + ödeme durumu + detay), ürünler, kategoriler, stok, müşteriler + bülten aboneleri (CSV dışa aktarma), kampanyalar (hızlı indirim ve kargo eşiği), kuponlar, yorum moderasyonu, markalar, içerik, SEO, sözleşme/sayfa editörü, yedekleme (JSON) ve denetim günlüğü
- iyzico / PayTR / özel banka seçimi, 3D Secure, taksit ve test/canlı mod ayarları
- Ürün, stok, sipariş, müşteri, kupon, yorum, bülten, ayar ve denetim verileri için Cloudflare Workers + D1
- GitHub Pages yönlendirmeleri için aynı uygulamayı sunan `404.html`

## Yönetici girişi

Sol üstteki Luméra logosuna 1,6 saniye içinde beş kez tıklayın.

- Kullanıcı adı: `admin`
- İlk şifre: `12345`

Canlı Worker bağlantısında parola yalnızca Cloudflare secret olarak tutulur ve ilk kurulumdan sonra güçlü bir parolayla değiştirilmelidir.

## Yerel geliştirme

```bash
npm ci
npm run dev
```

Üretim doğrulaması:

```bash
npm test
```

## Veri katmanı

`cloudflare-worker/` dizini ücretsiz Cloudflare Workers + D1 API'sini ve veritabanı şemasını içerir. Tutulan veriler ürünler, stok, siparişler + sipariş kalemleri, müşteriler, kuponlar, ürün yorumları, bülten aboneleri, mağaza/POS ayarları, düzenlenebilir sayfa içerikleri ve denetim kayıtlarıdır. Şema değişiklikleri `cloudflare-worker/migrations/` altında sürümlenir.

Canlı Worker adresi: https://lumera-commerce-api.lumera-beauty-store.workers.dev

Bu adres `github-pages/config.js` içindeki `apiBase` alanına bağlıdır. Ürünler, siparişler, müşteriler, bülten kayıtları ve yönetim ayarları merkezi D1 veritabanında tutulur. Bağlantı geçici olarak kesilirse sepet ve cihazdaki tercihler korunur.

## Güvenlik

Gerçek POS anahtarları kaynak koda, tarayıcı depolamasına, D1 veritabanına veya GitHub deposuna yazılmaz. Canlı değerler yalnızca Cloudflare Worker secret olarak tanımlanır. Gerçek tahsilat için sağlayıcı hesabı, şirket evrakları, webhook doğrulaması ve gerçek kartla uçtan uca test gerekir.

## Kaynak yapısı

- `github-pages/`: Tam GitHub Pages uygulaması
- `cloudflare-worker/`: Merkezi API ve D1 şeması
- `app/`: React/vinext Sites uygulaması
- `tests/`: Derleme ve yayın paketi kontrolleri
- `lumera-source.zip`: Önceki kaynak arşivi
