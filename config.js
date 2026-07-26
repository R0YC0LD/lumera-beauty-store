// LUMREA mağaza yapılandırması.
// Firebase (Firestore) etkinken tüm cihazlar anlık olarak otomatik senkronize
// olur — apiBase'e gerek yoktur. firebaseConfig'i boşaltırsanız site tek
// cihazda (tarayıcı hafızasında) çalışır.
window.LUMREA_CONFIG = {
  apiBase: "",                 // yalnızca Cloudflare Worker kurarsanız gerekir, örn: "https://lumrea-api.KULLANICIADI.workers.dev"
  storeUrl: "https://lumrea.com/",
  currency: "TRY",
  syncIntervalMs: 1000,        // Cloudflare Worker modunda cihazlar arası yenileme aralığı (ms)
  firebaseConfig: {
    apiKey: "AIzaSyAh-ppdkI-w1Hv4UVC6GRf6c41aoshpRsU",
    authDomain: "lumrea-8fa20.firebaseapp.com",
    projectId: "lumrea-8fa20",
    storageBucket: "lumrea-8fa20.firebasestorage.app",
    messagingSenderId: "840380265103",
    appId: "1:840380265103:web:a73a8963398af083d2f6fa",
    measurementId: "G-GBTENNGSLH"
  }
};
