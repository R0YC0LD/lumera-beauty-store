// LUMREA mağaza yapılandırması.
// Cloudflare Worker yayınlandıktan sonra çıkan adresi apiBase alanına yazın.
// apiBase boşken site tek cihazda (tarayıcı hafızasında) çalışır; doldurulunca
// tüm cihazlar aynı bulut veritabanını kullanır ve otomatik eşitlenir.
window.LUMREA_CONFIG = {
  apiBase: "",                 // örn: "https://lumrea-api.KULLANICIADI.workers.dev"
  storeUrl: "",                // örn: "https://kullaniciadi.github.io/lumrea/" (ops.)
  currency: "TRY",
  syncIntervalMs: 1000         // cihazlar arası otomatik yenileme aralığı (ms)
};
