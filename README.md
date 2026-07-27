# Lumrea

Lumrea — sade, zamansız ve asil bir giyim mağazası vitrini, yönetim paneli ve Firebase (Firestore + Cloud Functions) veri katmanı.

## Canlı yayın

- Mağaza: https://lumrea.com (GitHub Pages + özel alan adı)
- Eski adres: https://r0yc0ld.github.io/lumera-beauty-store/ (aynı depoya yönlenir)

Pages yayın kaynağı `main /(root)` dalıdır: kök dizindeki site her push'ta otomatik yayınlanır. Kaynak dosyalar `github-pages/` klasöründedir ve kök kopyayla birebir aynı tutulur.

## Öne çıkanlar

- Masaüstü ve mobil uyumlu, soft/blurlu soyut arka plan üzerinde cam efektiyle (glassmorphism) "yüzen" bir vitrin tasarımı; "Curated Clothing" imzalı editoryal marka kimliği
- Kadın / Erkek / Unisex / Çocuk kategorileri, Kombin dahil ürün kategorileri, arama, sıralama, ürün detayı ve favoriler
- Kalıcı sepet, teslimat formu, ödeme seçimi ve sipariş kaydı
- Kupon sistemi: yüzde / sabit tutar / ücretsiz kargo kuponları, minimum sepet, tarih ve kullanım limiti (sunucu tarafında doğrulanır)
- Ürün yorumları: müşteri gönderir, yönetici onaylar, vitrine canlı puan ve değerlendirme sayısı yansır
- Logoya beş hızlı tıklamayla açılan gizli yönetici girişi (`admin.html`)
- Tam çalışan yönetim modülleri: genel bakış (canlı ciro/sipariş), siparişler (durum + ödeme durumu + detay), ürünler, kategoriler, stok, müşteriler + bülten aboneleri (CSV dışa aktarma + kampanya postası), kuponlar, yorum moderasyonu, içerik, SEO, yedekleme (JSON) ve denetim günlüğü
- Detaylı ürün kartı: görsel URL veya bilgisayardan yükleme (Firebase Storage), bedenler (ayrı stok), kritik stok eşiği, kart renkleri, rozet ve etiketler; ürünler panelden kalıcı olarak silinebilir
- Panelden düzenlenebilir kategoriler ve yasal/bilgi sayfaları (Hakkımızda, KVKK, iade, SSS, mesafeli satış sözleşmesi, vb.)
- **Anlık senkronizasyon**: admin panelinden yapılan her değişiklik Firestore gerçek zamanlı dinleyicileriyle tüm cihazlara saniyeler içinde yansır
- **Otomatik sipariş e-postaları**: sipariş alındı/hazırlanıyor/kargoda/teslim edildi/iptal/ödendi durumlarında Titan üzerinden otomatik mail (Cloud Functions)
- **Müşteri sipariş sorgulama**: oturum gerektirmeden sipariş no + e-posta ile durum sorgulama
- Gerçek Sanal POS: iyzico / PayTR API bilgileri panelden girilir, AES-256 ile şifrelenip Firestore'da saklanır; test modu kapatıldığında sistem kayıtlı anahtarlarla ödemeyi otomatik başlatır (iyzico Checkout Form yönlendirmesi / PayTR iFrame), banka onayı webhook-callback ile siparişi otomatik "Ödendi" yapar
- Havale/EFT ve kapıda ödeme, banka hesap bilgileri panelden yönetilir
- GitHub Pages yönlendirmeleri için aynı uygulamayı sunan `404.html`

## Yönetici girişi

Sol üstteki Lumrea logosuna (kuğu simgesi) 1,6 saniye içinde beş kez tıklayın, ya da doğrudan `admin.html` adresini açın.

Firebase Authentication (Email/Password) ile giriş yapılır — Firebase Console → Authentication → Users altında oluşturulan hesapla.

## Yerel geliştirme

`index.html` dosyasına çift tıklayın — `config.js` içindeki `firebaseConfig` sayesinde site doğrudan Firestore'a bağlanır. Yerel/tarayıcı-hafızası modu için `firebaseConfig`'i boşaltmanız yeterli.

Ayrıntılı kurulum adımları için [`KURULUM.md`](KURULUM.md) dosyasına bakın.

## Veri katmanı

`assets/firebase.js` (Firestore/Auth/Storage köprüsü) ve `functions/` (Cloud Functions: sipariş e-postaları, kampanya postası, sipariş sorgulama, Sanal POS) Firebase tarafını oluşturur. Tutulan veriler ürünler, siparişler, müşteriler (siparişlerden derlenir), kuponlar, ürün yorumları, bülten aboneleri, mağaza/POS ayarları ve denetim kayıtlarıdır. Güvenlik kuralları `firestore.rules` / `storage.rules` dosyalarında.

`cloudflare-worker/` dizini artık kullanılmıyor; yalnızca ileride Firebase'den taşınmak istenirse referans olarak duruyor (`config.js` → `apiBase` boş oldukça devre dışı).

## Güvenlik

Kart verileri hiçbir zaman Lumrea sunucularına uğramaz; tahsilat sağlayıcının 3D Secure sayfasında tamamlanır. Panelden girilen POS API anahtarları tarayıcıya geri gönderilmez, Cloud Functions secret'ından (`POS_SECRET`) türetilen anahtarla AES-256 şifrelenerek Firestore'da saklanır ve yalnızca ödeme başlatılırken sunucuda çözülür. PayTR bildirimleri HMAC hash doğrulamasından geçer. Titan e-posta kimlik bilgileri de yalnızca Cloud Functions secret olarak tutulur, hiçbir zaman istemci koduna gömülmez. Gerçek tahsilata geçmeden önce sağlayıcı hesabı, şirket evrakları ve gerçek kartla uçtan uca test gerekir.

## Kaynak yapısı

- `index.html`, `admin.html`, `config.js`, `assets/`: GitHub Pages'in kökten sunduğu tam mağaza + yönetim paneli uygulaması
- `github-pages/`: yukarıdakiyle birebir aynı tutulan yayın kopyası
- `functions/`: Firebase Cloud Functions (mail, sipariş sorgulama, kampanya, Sanal POS)
- `firestore.rules`, `storage.rules`, `firebase.json`, `.firebaserc`: Firebase yapılandırması
- `cloudflare-worker/`: kullanılmayan eski API + D1 şeması (referans)
- `app/`, `db/`, `drizzle/`, `worker/`, `examples/`, `build/`, `.openai/`: ayrı bir Next.js/vinext tabanlı uygulama iskeleti (mağaza vitrinini etkilemez)
- `lumera-source.zip`: önceki kaynak arşivi
