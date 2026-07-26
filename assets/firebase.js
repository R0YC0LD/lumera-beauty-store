/* LUMREA — Firebase (Firestore + Auth + Storage) köprüsü.
   CONFIG.firebaseConfig doluysa yüklenir ve window.LumreaCloud'u sağlar.
   Alan adı sözleşmesi (assets/admin.js'in beklediği bulut şekliyle uyumlu):
   ürünler ve ayarlar camelCase; siparişler/kuponlar/yorumlar/aboneler/denetim
   D1 şemasıyla aynı snake_case alanları kullanır (order_no, min_total, ...). */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, addDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  getStorage, ref, uploadString, getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js";

const cfg = window.LUMREA_CONFIG || {};
if (cfg.firebaseConfig && cfg.firebaseConfig.apiKey) {
  const app = initializeApp(cfg.firebaseConfig);
  const db = getFirestore(app);
  const auth = getAuth(app);
  const storage = getStorage(app);

  const col = name => collection(db, name);
  const productsCol = col("products"), ordersCol = col("orders"), couponsCol = col("coupons"),
        reviewsCol = col("reviews"), subscribersCol = col("subscribers"), auditCol = col("audit");
  const settingsRef = doc(db, "settings", "store");

  const strip = o => { const { id, ...rest } = o; return rest; };
  const rows = snap => snap.docs.map(d => ({ id: d.id, ...d.data() }));

  async function logAudit(action, entity_type, entity_id) {
    try {
      await addDoc(auditCol, {
        actor: auth.currentUser?.email || "admin",
        action, entity_type, entity_id: entity_id || "",
        created_at: new Date().toISOString()
      });
    } catch { /* denetim kaydı başarısızsa sessizce geç */ }
  }

  window.LumreaCloud = {
    ready: true,

    onAuth(cb) { return onAuthStateChanged(auth, cb); },
    currentUser() { return auth.currentUser; },
    async login(email, password) {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return cred.user.getIdToken();
    },
    async logout() { await signOut(auth); },

    subscribeProducts(cb) { return onSnapshot(productsCol, snap => cb(rows(snap)), () => cb(null)); },
    async getProducts() { return rows(await getDocs(productsCol)); },
    async saveProduct(product) {
      await setDoc(doc(db, "products", product.id), strip(product));
      await logAudit("product.save", "product", product.id);
    },
    async deleteProduct(id) {
      await deleteDoc(doc(db, "products", id));
      await logAudit("product.delete", "product", id);
    },

    subscribeOrders(cb) {
      return onSnapshot(query(ordersCol, orderBy("created_at", "desc")), snap => cb(rows(snap)), () => cb(null));
    },
    async getOrders() { return rows(await getDocs(query(ordersCol, orderBy("created_at", "desc")))); },
    async createOrder(order) {
      const cloudOrder = {
        order_no: order.orderNo, customer: order.customer, items: order.items,
        total: order.total, discount: order.discount || 0,
        coupon_code: order.coupon || null, status: order.status || "new",
        payment_method: order.payment, payment_status: order.paymentStatus || "awaiting",
        created_at: order.createdAt || new Date().toISOString()
      };
      await setDoc(doc(db, "orders", order.id), cloudOrder);
      if (order.coupon) {
        try {
          const cSnap = await getDoc(doc(db, "coupons", order.coupon));
          if (cSnap.exists()) await updateDoc(doc(db, "coupons", order.coupon), { used_count: (cSnap.data().used_count || 0) + 1 });
        } catch { /* kupon sayaç güncellemesi başarısız olursa sipariş yine de oluşur */ }
      }
      for (const line of order.items) {
        try {
          const pSnap = await getDoc(doc(db, "products", line.id));
          if (!pSnap.exists()) continue;
          const p = pSnap.data();
          const sizes = (p.sizes || []).map(s => s.name === line.size ? { ...s, stock: Math.max(0, (Number(s.stock) || 0) - line.quantity) } : s);
          await updateDoc(doc(db, "products", line.id), { sizes });
        } catch { /* stok güncellemesi başarısız olursa sipariş yine de oluşur */ }
      }
      await logAudit("order.create", "order", order.id);
      return cloudOrder;
    },
    async updateOrder(id, patch) {
      const cloudPatch = {};
      if (patch.status) cloudPatch.status = patch.status;
      if (patch.paymentStatus) cloudPatch.payment_status = patch.paymentStatus;
      await updateDoc(doc(db, "orders", id), cloudPatch);
      await logAudit("order.update", "order", id);
    },

    async getCoupons() { return rows(await getDocs(couponsCol)).map(c => ({ ...c, code: c.id })); },
    async validateCoupon(code, total) {
      const s = await getDoc(doc(db, "coupons", code));
      if (!s.exists() || s.data().active === false) return { error: "Kupon bulunamadı" };
      const c = s.data();
      if (c.usage_limit && (c.used_count || 0) >= c.usage_limit) return { error: "Kupon kullanım limiti doldu" };
      if (total < (c.min_total || 0)) return { error: `Bu kupon için minimum sepet tutarı gerekli` };
      return { coupon: { code, type: c.type, value: c.value, minTotal: c.min_total || 0 } };
    },
    async saveCoupon(coupon) {
      const prev = await getDoc(doc(db, "coupons", coupon.code));
      await setDoc(doc(db, "coupons", coupon.code), {
        type: coupon.type, value: coupon.value,
        min_total: coupon.minTotal || 0, usage_limit: coupon.usageLimit || null,
        used_count: prev.exists() ? (prev.data().used_count || 0) : 0,
        active: coupon.active !== false
      });
      await logAudit("coupon.save", "coupon", coupon.code);
    },
    async deleteCoupon(code) {
      await deleteDoc(doc(db, "coupons", code));
      await logAudit("coupon.delete", "coupon", code);
    },

    async getReviews(productId) {
      const q = productId
        ? query(reviewsCol, where("product_id", "==", productId), where("status", "==", "approved"))
        : reviewsCol;
      return rows(await getDocs(q));
    },
    async addReview(review) {
      let productName = "";
      try { const p = await getDoc(doc(db, "products", review.productId)); if (p.exists()) productName = p.data().name || ""; } catch {}
      await addDoc(reviewsCol, {
        product_id: review.productId, product_name: productName,
        name: review.name, rating: review.rating, comment: review.comment,
        status: "pending", created_at: new Date().toISOString()
      });
    },
    async updateReview(id, patch) {
      await updateDoc(doc(db, "reviews", id), patch);
      await logAudit("review.update", "review", id);
    },
    async deleteReview(id) {
      await deleteDoc(doc(db, "reviews", id));
      await logAudit("review.delete", "review", id);
    },

    async getSubscribers() { return rows(await getDocs(subscribersCol)); },
    async addSubscriber(email) {
      const id = email.replace(/[^a-z0-9@.]/gi, "_");
      await setDoc(doc(db, "subscribers", id), { email, created_at: new Date().toISOString() }, { merge: true });
    },

    async getSettings() { const s = await getDoc(settingsRef); return s.exists() ? s.data() : {}; },
    async saveSettings(settings) {
      await setDoc(settingsRef, settings);
      await logAudit("settings.save", "settings", "store");
    },

    async getAudit() { return rows(await getDocs(query(auditCol, orderBy("created_at", "desc")))); },

    async uploadImage(dataUrl) {
      const path = `products/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
      const sref = ref(storage, path);
      await uploadString(sref, dataUrl, "data_url");
      return getDownloadURL(sref);
    }
  };

  window.dispatchEvent(new Event("lumrea-cloud-ready"));
}
