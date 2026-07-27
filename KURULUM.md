# LUMREA Giyim Mağazası — Kurulum Rehberi

## Site şu an nasıl çalışıyor?

Site **Firebase (Firestore + Cloud Functions + Storage + Authentication)** üzerinde
tam bulut modunda çalışıyor — aşağıdaki kurulum tamamlandı ve canlıda test edildi:

- ✅ Firestore veritabanı ve güvenlik kuralları
- ✅ Storage (ürün görseli yükleme) ve kuralları
- ✅ Authentication (Email/Password) ve yönetici hesabı
- ✅ Cloud Functions: sipariş durumu e-postaları, kampanya postası, sipariş sorgulama,
  Sanal POS altyapısı (`functions/` klasörü, `firebase deploy --only functions` ile
  deploy edildi)

Admin panelinden yapılan her değişiklik (ürün, stok, fiyat, sipariş durumu) **anlık
olarak** tüm cihazlara/telefonlara otomatik yansır (Firestore gerçek zamanlı
dinleyicileri sayesinde, yoklama/bekleme yok).

Bu bölümdeki adımlar zaten tamamlandı — yalnızca projeyi **yeniden kurmanız** gerekirse
(ör. başka bir Firebase projesine taşırsanız) referans olarak bırakıldı.

### 1. Firestore veritabanını oluşturun
Firebase Console → projeniz → **Firestore Database** → **Create database** →
**Production mode**.

### 2. Firestore güvenlik kurallarını yayınlayın
Depoda `firestore.rules` dosyası hazır. Firebase CLI ile:

```bash
firebase deploy --only firestore:rules,storage --project PROJE_ID
```

### 3. Storage kurallarını yayınlayın
`storage.rules` dosyası da yukarıdaki komutla birlikte yayınlanır.

### 4. Yönetici hesabı oluşturun
Firebase Console → **Authentication** → **Sign-in method** → **Email/Password**'ü
etkinleştirin → **Users** → **Add user** → e-posta ve güçlü bir şifre girin. Admin
panelinde **"Kullanıcı adı"** alanına bu e-postayı, **"Şifre"** alanına bu şifreyi
yazarsınız (Firebase e-posta formatı gerektirir).

### 5. Cloud Functions secret'larını ayarlayın ve deploy edin
```bash
firebase functions:secrets:set TITAN_EMAIL       # mail gönderimi için Titan e-posta adresiniz
firebase functions:secrets:set TITAN_PASSWORD    # Titan e-posta şifreniz
firebase functions:secrets:set POS_SECRET        # Sanal POS anahtarlarını şifrelemek için rastgele uzun bir metin
firebase deploy --only functions --project PROJE_ID
```

Not: İlk kurulumda "2nd Gen fonksiyonlar için biraz daha zaman gerekiyor" gibi bir hata
alırsanız birkaç dakika sonra aynı komutu tekrar çalıştırın (Google altyapısının
tamamlanmasını bekler). Ayrıca deploy'u yapan hesap/servis hesabının proje üzerinde
yeterli IAM rolüne (Owner veya en az Editor + gerekli servis hesabı yetkileri) sahip
olması gerekir.

## Admin paneline giriş

Yönetim paneli ayrı bir sayfadır: **`admin.html`**

1. Doğrudan `admin.html` dosyasını açın (siteyse `siteadresi/admin.html`),
2. veya mağazada **LUMREA logosuna arka arkaya 5 kez** tıklayın.

**Giriş bilgisi:** yukarıda oluşturduğunuz Firebase e-postası ve şifresi.
(Firebase kurulmadan önceki hâl için: `admin` / `12345` ile yerel/tek cihaz modu hâlâ
çalışır, ama bu site artık Firebase'e bağlı.)

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
- **Bülten Aboneleri** — abone listesi, CSV dışa aktarım ve **kampanya postası gönderme**
- **SEO ve Sosyal** — site başlığı/açıklaması, Instagram/TikTok/X/WhatsApp bağlantıları
- **Mağaza Ayarları** — duyuru, hero yazıları, kargo sınırı, ödeme yöntemleri, IBAN, şirket bilgileri
- **Yedekleme** — tüm veriyi tek JSON dosyası olarak indirme / geri yükleme
- **Denetim Kaydı** — kim ne zaman ne değiştirdi

## Otomatik sipariş e-postaları (Titan üzerinden — aktif)

`lumreainfo@lumrea.com` adresinden otomatik gönderilir, uçtan uca test edildi:

| Durum | E-posta |
|---|---|
| Sipariş oluşturulduğunda | "Siparişin alındı" |
| Admin panelden "Hazırlanıyor" yapıldığında | "Siparişin hazırlanıyor" |
| Admin panelden "Kargoda" yapıldığında | "Siparişin kargoda" |
| Admin panelden "Tamamlandı" yapıldığında | "Teslim edildi" + değerlendirme daveti |
| Admin panelden "İptal" yapıldığında | "Siparişin iptal edildi" |
| Ödeme durumu "Ödendi" yapıldığında | "Ödemen alındı" |

Şablonlar `functions/emailTemplates.js` içinde; metni/rengi değiştirmek isterseniz
oradan düzenleyip yeniden deploy edin. Kampanya (indirim/duyuru) postası için admin
panelinde **Bülten Aboneleri** sekmesindeki formu kullanın — tüm abonelere aynı anda gider.

## Müşteri sipariş sorgulama

Mağaza alt bilgisinde **"Sipariş sorgula"** bağlantısı var: müşteri sipariş numarası +
e-posta girer, güncel durumu (Alındı / Hazırlanıyor / Kargoda / Teslim edildi vb.) ve
ödeme durumunu görür. Oturum gerektirmez, `functions/index.js` içindeki `lookupOrder`
fonksiyonu üzerinden çalışır.

## Sanal POS (kartla ödeme)

Altyapı hazır ve deploy edilmiş durumda (`functions/index.js` — `paymentInit`,
`paymentCallbackIyzico`, `paymentWebhookPaytr`). Aktifleştirmek için:

1. **iyzico** (önerilen) veya **PayTR** ile ücretsiz üye işyeri başvurusu yapın:
   - iyzico: https://www.iyzico.com → başvuru onaylanınca panelden **Ayarlar → API Anahtarları**
   - PayTR: https://www.paytr.com → mağaza panelinden **Bilgi** sayfası
2. Admin panelinde **Sanal POS** modülünü açın, bilgileri yapıştırıp kaydedin.
3. Bu kadar — mağazadaki ödeme adımına **"Kredi / Banka kartı (3D Secure)"** seçeneği
   otomatik eklenir. Bilgiler Cloud Functions secret'ından türetilen anahtarla
   **AES-256 şifreli** Firestore'da saklanır, tarayıcıya asla geri gönderilmez.

Notlar:
- **Test modu** açıkken karttan tahsilat yapılmaz; sipariş "ödeme bekleniyor" olarak düşer.
  Gerçek satışa geçerken Sanal POS → Genel ayarlar'dan test modunu kapatın.
- PayTR kullanacaksanız PayTR paneline bildirim URL'si olarak şunu girin:
  `https://paymentwebhookpaytr-sehdfzkjxq-uc.a.run.app`
- Ödeme başarılı/başarısız dönüşü müşteriyi otomatik mağazaya geri getirir ve sipariş
  durumu panelde "Ödendi" olur.

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

## Alternatif: Cloudflare Worker (kullanılmıyor, yedek seçenek)

Bu proje artık Firebase üzerinde çalıştığı için aşağıdaki Cloudflare Worker kurulumuna
**gerek yoktur** — yalnızca ileride Firebase'den taşınmak isterseniz referans olarak
`cloudflare-worker/` klasöründe duruyor. `config.js` içindeki `apiBase` boş oldukça bu
yol devre dışıdır.
