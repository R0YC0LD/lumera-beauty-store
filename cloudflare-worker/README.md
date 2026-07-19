# Lumrea Commerce API

GitHub Pages vitrini için Firebase kullanmadan hazırlanmış Cloudflare Workers + D1 veri katmanı.

Tutulan veriler: ürünler, stok, siparişler, müşteriler, bülten aboneleri, mağaza/POS ayarları ve denetim kayıtları.

POS gizli anahtarları D1'e yazılmaz. Cloudflare Worker secret olarak saklanır.

Kurulum özeti:

1. `wrangler.toml.example` dosyasını `wrangler.toml` olarak kopyalayın.
2. Ücretsiz D1 veritabanı oluşturup `database_id` alanını güncelleyin.
3. `schema.sql` şemasını uzak veritabanına uygulayın.
4. `ADMIN_PASSWORD`, `SESSION_SECRET` ve kullanılacak POS secret değerlerini Worker'a ekleyin.
5. Worker'ı yayınlayın ve oluşan adresi `github-pages/config.js` içindeki `apiBase` alanına yazın.

İlk yönetici bilgileri site sahibinin isteğiyle `admin / 12345` olarak ayarlanır; ilk canlı girişten sonra güçlü bir parolaya çevrilmesi önerilir.
