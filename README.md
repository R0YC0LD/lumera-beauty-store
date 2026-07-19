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
- Detaylı ürün kartı: görsel URL, varyantlar (boy/renk — ayrı fiyat ve stok), alış fiyatı ile otomatik kâr marjı, kritik stok eşiği, kart renkleri, rozet ve etiketler; ürünler panelden kalıcı olarak silinebilir
- Panelden düzenlenebilir cilt testi: sorular, cevaplar ve sonuçta önerilecek ürünler İçerik Yönetimi'nden yayınlanır
- Kurumsal vitrin: güvence/ödeme şeridi (SSL, 3D Secure, taksit rozetleri), Hakkımızda sayfası, KVKK onaylı bülten kaydı, yapılandırılmış veri (JSON-LD), favicon, sürümlü statik dosyalar ve 404 yönlendirme sayfası; sosyal medya bağlantıları SEO modülünden yönetilir
- Panelden yönetilebilir kategoriler (ad, slogan, renkler) ve ürünlerden otomatik türeyen marka duvarı
- Gerçek Sanal POS: iyzico / PayTR API bilgileri panelden girilir, AES-GCM ile şifrelenip D1'de saklanır; test modu kapatıldığında sistem kayıtlı anahtarlarla ödemeyi otomatik başlatır (iyzico Checkout Form yönlendirmesi / PayTR iFrame), banka onayı webhook-callback ile siparişi otomatik "Ödendi" yapar
- Havale/EFT hesap bilgileri (banka, IBAN, hesap sahibi) panelden yönetilir ve sipariş onayında müşteriye gösterilir
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

Kart verileri hiçbir zaman Luméra sunucularına uğramaz; tahsilat sağlayıcının 3D Secure sayfasında tamamlanır. Panelden girilen POS API anahtarları tarayıcıya geri gönderilmez, SESSION_SECRET'tan türetilen anahtarla AES-GCM şifrelenerek D1'de saklanır ve yalnızca ödeme başlatılırken sunucuda çözülür. PayTR bildirimleri HMAC hash doğrulamasından geçer. Gerçek tahsilata geçmeden önce sağlayıcı hesabı, şirket evrakları ve gerçek kartla uçtan uca test gerekir; PayTR panelindeki Bildirim URL alanına Worker'ın `/api/payments/webhook/paytr` adresi yazılmalıdır.

## Kaynak yapısı

- `github-pages/`: Tam GitHub Pages uygulaması
- `cloudflare-worker/`: Merkezi API ve D1 şeması
- `app/`: React/vinext Sites uygulaması
- `tests/`: Derleme ve yayın paketi kontrolleri
- `lumera-source.zip`: Önceki kaynak arşivi
