# LUMREA Giyim Mağazası — Kurulum Rehberi

## Site şu an nasıl çalışıyor?

`config.js` içinde bir Firebase projesi (`lumrea-8fa20`) tanımlı — bu yüzden site artık
**Firestore ile bulut modunda** çalışıyor: admin panelinden yapılan her değişiklik
(ürün, stok, fiyat, sipariş durumu) **anlık olarak** tüm cihazlara/telefonlara otomatik
yansır (Firestore gerçek zamanlı dinleyicileri sayesinde, yoklama/bekleme yok).

Firebase Console'da **tamamlamanız gereken tek seferlik kurulum adımları** aşağıda —
bunlar yapılmadan Firestore/Storage istekleri "izin reddedildi" hatası verir:

### 1. Firestore veritabanını oluşturun
Firebase Console → `lumrea-8fa20` projesi → **Firestore Database** → **Create database**
→ bir bölge seçip (örn. `eur3`) **Production mode** ile oluşturun.

### 2. Firestore güvenlik kurallarını yapıştırın
Firestore Database → **Rules** sekmesi → aşağıdakini yapıştırıp **Publish**'e basın:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /products/{id} {
      allow get, list: if true;
      allow create, delete: if request.auth != null;
      allow update: if request.auth != null
        || request.resource.data.diff(resource.data).affectedKeys().hasOnly(['sizes']);
    }
    match /settings/{id} {
      allow get, list: if true;
      allow write: if request.auth != null;
    }
    match /coupons/{code} {
      allow get: if true;
      allow list: if request.auth != null;
      allow create, delete: if request.auth != null;
      allow update: if request.auth != null
        || (request.resource.data.diff(resource.data).affectedKeys().hasOnly(['used_count'])
            && request.resource.data.used_count == resource.data.used_count + 1);
    }
    match /reviews/{id} {
      allow get, list: if true;
      allow create: if request.resource.data.status == "pending";
      allow update, delete: if request.auth != null;
    }
    match /subscribers/{id} {
      allow create: if true;
      allow get, list, update, delete: if request.auth != null;
    }
    match /orders/{id} {
      allow create: if true;
      allow get, list, update, delete: if request.auth != null;
    }
    match /audit/{id} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Bu kurallar: ürünler/ayarlar/onaylı yorumlar herkese açık okunur; sipariş oluşturma ve
bültene kayıt girişte oturum gerektirmez; stok düşümü ve kupon kullanım sayacı yalnızca
ilgili tek alanı değiştiren dar bir istisnayla girişsiz yapılabilir; geri kalan her şey
(ürün/ayar/kupon/yorum onayı/sipariş görüntüleme/denetim kaydı) yalnızca giriş yapmış
yönetici için açıktır.

### 3. Storage'ı açın (ürün görseli yükleme için)
Firebase Console → **Storage** → **Get started** → Production mode. Sonra **Rules**
sekmesine şunu yapıştırın:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /products/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 4. Yönetici hesabı oluşturun
Firebase Console → **Authentication** → **Get started** → **Sign-in method** →
**Email/Password**'ü etkinleştirin. Sonra **Users** sekmesi → **Add user** → kendi
e-posta adresinizi ve güçlü bir şifre girin. Admin panelinde **"Kullanıcı adı"** alanına
bu e-postayı, **"Şifre"** alanına bu şifreyi yazacaksınız (Firebase e-posta formatı
gerektirir — `admin`/`12345` yerel/bulutsuz moddayken hâlâ çalışır, ama Firebase
etkinken güvenlik için gerçek e-posta/şifreyle giriş yapmanız gerekir).

Bu 4 adım tamamlanınca site zaten canlı — ekstra deploy/derleme gerekmez, sadece sayfayı
yenileyin.

## Admin paneline giriş

Yönetim paneli ayrı bir sayfadır: **`admin.html`**

1. Doğrudan `admin.html` dosyasını açın (siteyse `siteadresi/admin.html`),
2. veya mağazada **LUMREA logosuna arka arkaya 5 kez** tıklayın.

Firebase kurulumu tamamlandıktan sonra: yukarıda oluşturduğunuz **e-posta ve şifre**
ile giriş yapın. Firebase kurulmadan önce (veya Firestore/Storage adımları eksikken):
kullanıcı adı `admin`, şifre `12345` ile yerel/tek cihaz modunda deneyebilirsiniz.

## Admin panelinde neler var? (14 modül)

- **Genel Bakış** — kritik stok (🔥), tükenen beden, sipariş/ciro, bekleyen yorum özetleri
- **Ürünler** — ekle/düzenle/sil; ada veya ürün koduyla (SKU) arama; **bilgisayardan görsel yükleme**
- **Stok / Bedenler** — tüm beden stoklarını tek tablodan hızlıca güncelleme
- **Siparişler** — arama, sipariş durumu + ödeme durumu yönetimi, kupon bilgisi
- **Kuponlar** — yüzde veya tutar indirimli kupon oluşturma, limit ve min. sepet koşulu
- **Yorumlar** — müşteri yorumlarını onaylama/reddetme/silme (onaylı yorumlar vitrine düşer)
- **Müşteriler** — sipariş kayıtlarından derlenen müşteri listesi, harcama toplamları
- **Kategoriler** — kategori ekle/sil/yeniden adlandır/sırala; vitrindeki filtre çipleri buradan beslenir
- **İçerik Yönetimi** — Hakkımızda, KVKK, mesafeli satış, iade, SSS dahil tüm sayfa metinlerini düzenleme
- **Bülten Aboneleri** — abone listesi ve CSV dışa aktarım
- **SEO ve Sosyal** — site başlığı/açıklaması, Instagram/TikTok/X/WhatsApp bağlantıları
- **Mağaza Ayarları** — duyuru, hero yazıları, kargo sınırı, ödeme yöntemleri, IBAN, şirket bilgileri
- **Yedekleme** — tüm veriyi tek JSON dosyası olarak indirme / geri yükleme
- **Denetim Kaydı** — bulutta kim ne zaman ne değiştirdi (bulut kurulunca aktif)

## Sanal POS (kartla ödeme) — otomatik aktifleşir

> **Not:** Firestore, tarayıcıdan doğrudan bağlanılan bir veritabanıdır; iyzico/PayTR
> gibi API anahtarlarını güvenle saklayıp banka webhook'unu karşılayacak bir **sunucu**
> değildir. Kartla ödeme için hâlâ `cloudflare-worker/` klasöründeki Cloudflare Worker'ı
> ayrıca kurmanız gerekir (aşağıdaki "Bulut kurulumu" bölümü) — Firestore bunun yerine
> geçmez, ürün/sipariş/stok senkronizasyonunu sağlar. Worker kurulu değilken Sanal POS
> formunu kaydetmeye çalışırsanız açıklayıcı bir hata görürsünüz, müşteri yine de
> Havale/EFT veya kapıda ödemeyle sipariş verebilir.

Kartla ödeme almak için bulut kurulumunun tamamlanmış olması gerekir. Sonrası çok basit:

1. **iyzico** (önerilen) veya **PayTR** ile ücretsiz üye işyeri başvurusu yapın:
   - iyzico: https://www.iyzico.com → başvuru onaylanınca panelden **Ayarlar → API Anahtarları**
   - PayTR: https://www.paytr.com → mağaza panelinden **Bilgi** sayfası
2. Admin panelinde **Sanal POS** modülünü açın, bilgileri yapıştırıp kaydedin.
3. Bu kadar — mağazadaki ödeme adımına **"Kredi / Banka kartı (3D Secure)"** seçeneği
   otomatik eklenir. Bilgiler buluta **AES-256 şifreli** kaydedilir, siteye giren kimse göremez.

Notlar:
- **Test modu** açıkken karttan tahsilat yapılmaz; sipariş "ödeme bekleniyor" olarak düşer.
  Gerçek satışa geçerken Sanal POS → Genel ayarlar'dan test modunu kapatın.
- PayTR kullanacaksanız PayTR paneline bildirim URL'si olarak şunu girin:
  `WORKER-ADRESINIZ/api/payments/webhook/paytr`
- Ödeme başarılı/başarısız dönüşü müşteriyi otomatik mağazaya geri getirir ve sipariş
  durumu panelde "Ödendi" olur.

## Cihazlar arası anlık eşitleme

Site açık olan her cihaz buluttaki veri sürümünü **saniyede bir** yoklar; admin panelinde
yapılan her değişiklik (ürün, stok, fiyat, ayar…) 1-2 saniye içinde tüm cihazlarda görünür.
5 dakikadan uzun süre dokunulmayan sekmeler kotayı korumak için otomatik yavaşlar,
kullanıcı sayfaya dönünce anında hızlanır. (`config.js` → `syncIntervalMs`)

## KVKK / Çerez uyumu

- Siteye ilk girişte **çerez bildirimi** çıkar; tercih kaydedilir.
- KVKK Aydınlatma Metni, Gizlilik, Çerez Politikası, Mesafeli Satış Sözleşmesi ve
  Kullanım Koşulları hazır gelir; şirket adı/adresi Mağaza Ayarları'ndan otomatik dolar.
  Metinlerin tamamı İçerik Yönetimi modülünden düzenlenebilir.
- Bülten kaydı ve sipariş adımında KVKK onay kutuları bulunur.

## Stok göstergeleri (otomatik)

- Bir bedenin stoğu **0** olursa → vitrinde o bedenin üzeri **kırmızı çizgiyle** çizilir, satın alınamaz.
- Ürünün toplam stoğu **kritik sınırın** (varsayılan 5, üründe değiştirilebilir) altına inerse →
  vitrinde **🔥 "Son X ürün"** rozeti alevli animasyonla yanar.
- Tüm bedenler biterse → ürün soluklaşır ve "Tükendi" etiketi görünür.

---

# Bulut kurulumu (ücretsiz — Cloudflare)

Cloudflare'ın ücretsiz katmanı bu mağaza için 1-2 yıl rahatça yeter:
günde 100.000 istek + 5 GB veritabanı ücretsizdir, kredi kartı istemez.

## Sizden istenenler (bana iletmeniz gerekenler)

1. **Cloudflare hesabı açın**: https://dash.cloudflare.com/sign-up (e-posta + şifre, ücretsiz)
2. Bilgisayarınızda **Node.js kurulu olsun**: https://nodejs.org (LTS sürümü)
3. Bana "hazırım" deyin — aşağıdaki adımları birlikte çalıştıracağız.
   Adım 4'te oluşan **database_id** ve adım 8'de oluşan **Worker adresini** bana iletmeniz yeterli.

## Kurulum adımları (terminalden)

```bash
# 1) Wrangler'ı kurun (Cloudflare'ın komut aracı)
npm install -g wrangler

# 2) Cloudflare hesabınızla giriş yapın (tarayıcı açılır, onaylayın)
wrangler login

# 3) cloudflare-worker klasörüne geçin
cd "C:\Users\ongor\OneDrive\Desktop\Giyim Mağazası\cloudflare-worker"

# 4) Ücretsiz D1 veritabanı oluşturun — çıktıdaki database_id değerini kopyalayın
wrangler d1 create lumrea-db

# 5) wrangler.toml.example dosyasını wrangler.toml adıyla kopyalayıp
#    içindeki database_id alanına 4. adımdaki değeri yapıştırın

# 6) Veritabanı tablolarını kurun
wrangler d1 execute lumrea-db --remote --file=schema.sql

# 7) Yönetici şifresi ve oturum anahtarı ekleyin (sorulduğunda yazın)
wrangler secret put ADMIN_PASSWORD
wrangler secret put SESSION_SECRET   # uzun rastgele bir metin girin

# 8) Yayınlayın — çıktıda https://lumrea-api.XXXX.workers.dev gibi bir adres verir
wrangler deploy
```

## Son adım

8. adımda çıkan adresi ana klasördeki `config.js` dosyasına yazın:

```js
apiBase: "https://lumrea-api.XXXX.workers.dev",
```

Bu kadar. Artık siteyi hangi cihazda açarsanız açın, ürün/stok/sipariş
değişiklikleri birkaç saniye içinde her yerde görünür
(yenileme sıklığı `config.js` içindeki `syncIntervalMs` ile ayarlanır).

## Siteyi internete açmak (ücretsiz)

İki kolay seçenek — ikisi de ücretsiz:

- **Cloudflare Pages**: dash.cloudflare.com → Workers & Pages → Create → Pages →
  "Upload assets" → bu klasörü sürükleyin (cloudflare-worker klasörü hariç).
- **GitHub Pages**: klasörü bir GitHub deposuna yükleyin → Settings → Pages → main branch.

Not: İlk ürünler siteye "örnek ürün" olarak gelir; bulut kurulduktan sonra
admin panelinden kendi ürünlerinizi ekleyince örnekler yerini onlara bırakır.
(Bulut aktifken vitrin yalnızca buluttaki ürünleri gösterir.)
