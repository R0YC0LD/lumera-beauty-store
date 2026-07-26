# Lumrea

Lumrea — sade, zamansız ve asil bir giyim mağazası vitrini, yönetim paneli ve Firebase kullanmayan Cloudflare veri katmanı.

## Canlı yayın

- Mağaza: https://lumrea.com (GitHub Pages + özel alan adı)
- Eski adres: https://r0yc0ld.github.io/lumera-beauty-store/ (aynı depoya yönlenir)

Pages yayın kaynağı `main /(root)` dalıdır: kök dizindeki site her push'ta otomatik yayınlanır. Kaynak dosyalar `github-pages/` klasöründedir ve kök kopyayla birebir aynı tutulur.

## Öne çıkanlar

- Masaüstü ve mobil uyumlu, soft/blurlu soyut arka plan üzerinde cam efektiyle (glassmorphism) "yüzen" bir vitrin tasarımı
- Kadın / Erkek / Unisex / Çocuk kategorileri, Kombin dahil ürün kategorileri, arama, sıralama, ürün detayı ve favoriler
- Kalıcı sepet, teslimat formu, ödeme seçimi ve sipariş kaydı
- Kupon sistemi: yüzde / sabit tutar / ücretsiz kargo kuponları, minimum sepet, tarih ve kullanım limiti (sunucu tarafında doğrulanır)
- Ürün yorumları: müşteri gönderir, yönetici onaylar, vitrine canlı puan ve değerlendirme sayısı yansır
- Logoya beş hızlı tıklamayla açılan gizli yönetici girişi (`admin.html`)
- Tam çalışan yönetim modülleri: genel bakış (canlı ciro/sipariş), siparişler (durum + ödeme durumu + detay), ürünler, kategoriler, stok, müşteriler + bülten aboneleri (CSV dışa aktarma), kuponlar, yorum moderasyonu, içerik, SEO, yedekleme (JSON) ve denetim günlüğü
- Detaylı ürün kartı: görsel URL veya bilgisayardan yükleme, bedenler (ayrı stok), kritik stok eşiği, kart renkleri, rozet ve etiketler; ürünler panelden kalıcı olarak silinebilir
- Panelden düzenlenebilir kategoriler ve yasal/bilgi sayfaları (Hakkımızda, KVKK, iade, SSS, mesafeli satış sözleşmesi, vb.)
- Gerçek Sanal POS: iyzico / PayTR API bilgileri panelden girilir, AES-GCM ile şifrelenip D1'de saklanır; test modu kapatıldığında sistem kayıtlı anahtarlarla ödemeyi otomatik başlatır (iyzico Checkout Form yönlendirmesi / PayTR iFrame), banka onayı webhook-callback ile siparişi otomatik "Ödendi" yapar
- Havale/EFT ve kapıda ödeme, banka hesap bilgileri panelden yönetilir
- Ürün, stok, sipariş, müşteri, kupon, yorum, bülten, ayar ve denetim verileri için Cloudflare Workers + D1
- GitHub Pages yönlendirmeleri için aynı uygulamayı sunan `404.html`

## Yönetici girişi

Sol üstteki Lumrea logosuna (kuğu simgesi) 1,6 saniye içinde beş kez tıklayın, ya da doğrudan `admin.html` adresini açın.

- Kullanıcı adı: `admin`
- İlk şifre: `12345`

Canlı Worker bağlantısında parola yalnızca Cloudflare secret olarak tutulur ve ilk kurulumdan sonra güçlü bir parolayla değiştirilmelidir.

## Yerel geliştirme

`index.html` dosyasına çift tıklayın — site hemen örnek ürünlerle açılır (tek cihaz / tarayıcı hafızası modu). Bulut kurulumu tamamlanana kadar hiçbir derleme adımı gerekmez.

Ayrıntılı kurulum ve bulut (Cloudflare Workers + D1) adımları için [`KURULUM.md`](KURULUM.md) dosyasına bakın.

## Veri katmanı

`cloudflare-worker/` dizini ücretsiz Cloudflare Workers + D1 API'sini ve veritabanı şemasını içerir. Tutulan veriler ürünler, stok, siparişler + sipariş kalemleri, müşteriler, kuponlar, ürün yorumları, bülten abononeleri, mağaza/POS ayarları, düzenlenebilir sayfa içerikleri ve denetim kayıtlarıdır.

Canlı Worker adresi kurulduktan sonra `config.js` (ve `github-pages/config.js`) içindeki `apiBase` alanına yazılır. Bulut bağlanana kadar site yalnızca yerel tarayıcı hafızasında (localStorage) çalışır; ürünler, siparişler ve bülten kayıtları o tarayıcıda saklanır.

## Güvenlik

Kart verileri hiçbir zaman Lumrea sunucularına uğramaz; tahsilat sağlayıcının 3D Secure sayfasında tamamlanır. Panelden girilen POS API anahtarları tarayıcıya geri gönderilmez, `SESSION_SECRET`'tan türetilen anahtarla AES-GCM şifrelenerek D1'de saklanır ve yalnızca ödeme başlatılırken sunucuda çözülür. PayTR bildirimleri HMAC hash doğrulamasından geçer. Gerçek tahsilata geçmeden önce sağlayıcı hesabı, şirket evrakları ve gerçek kartla uçtan uca test gerekir; PayTR panelindeki Bildirim URL alanına Worker'ın `/api/payments/webhook/paytr` adresi yazılmalıdır.

## Kaynak yapısı

- `index.html`, `admin.html`, `config.js`, `assets/`: GitHub Pages'in kökten sunduğu tam mağaza + yönetim paneli uygulaması
- `github-pages/`: yukarıdakiyle birebir aynı tutulan yayın kopyası
- `cloudflare-worker/`: merkezi API ve D1 şeması
- `app/`, `db/`, `drizzle/`, `worker/`, `examples/`, `build/`, `.openai/`: ayrı bir Next.js/vinext tabanlı uygulama iskeleti (mağaza vitrinini etkilemez)
- `lumera-source.zip`: önceki kaynak arşivi
