const encoder = new TextEncoder();

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env.STOREFRONT_ORIGIN);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    try {
      if (url.pathname === "/api/health" && request.method === "GET") return json({ ok: true, service: "lumera-commerce-api" }, 200, cors);
      if (url.pathname === "/api/bootstrap" && request.method === "GET") return bootstrap(env, cors);
      if (url.pathname === "/api/auth/login" && request.method === "POST") return login(request, env, cors);
      if (url.pathname === "/api/newsletter" && request.method === "POST") return newsletter(request, env, cors);
      if (url.pathname === "/api/orders" && request.method === "POST") return createOrder(request, env, cors);
      if (url.pathname === "/api/reviews" && request.method === "GET") return listPublicReviews(env, url.searchParams.get("product") || "", cors);
      if (url.pathname === "/api/reviews" && request.method === "POST") return createReview(request, env, cors);
      if (url.pathname === "/api/coupons/validate" && request.method === "POST") return validateCouponRequest(request, env, cors);
      if (url.pathname === "/api/payments/init" && request.method === "POST") return paymentInit(request, env, cors);
      if (url.pathname === "/api/payments/callback/iyzico") return iyzicoCallback(request, env, url);
      if (url.pathname === "/api/payments/webhook/paytr" && request.method === "POST") return paytrWebhook(request, env);

      const admin = await authorize(request, env);
      if (!admin) return json({ error: "Yönetici oturumu gerekli" }, 401, cors);
      if (url.pathname === "/api/settings" && request.method === "PUT") return saveSettings(request, env, admin, cors);
      if (url.pathname === "/api/overview" && request.method === "GET") return overview(env, cors);
      if (url.pathname === "/api/orders" && request.method === "GET") return listOrders(env, cors);
      if (url.pathname.startsWith("/api/orders/") && request.method === "GET") return orderDetail(env, decodeURIComponent(url.pathname.split("/").pop()), cors);
      if (url.pathname.startsWith("/api/orders/") && request.method === "PATCH") return updateOrder(request, env, admin, decodeURIComponent(url.pathname.split("/").pop()), cors);
      if (url.pathname === "/api/products/full" && request.method === "GET") return listFullProducts(env, cors);
      if (url.pathname.startsWith("/api/products/") && request.method === "PUT") return saveProduct(request, env, admin, decodeURIComponent(url.pathname.split("/").pop()), cors);
      if (url.pathname === "/api/customers" && request.method === "GET") return listCustomers(env, cors);
      if (url.pathname === "/api/newsletter" && request.method === "GET") return listSubscribers(env, cors);
      if (url.pathname === "/api/audit" && request.method === "GET") return listAudit(env, cors);
      if (url.pathname === "/api/coupons" && request.method === "GET") return listCoupons(env, cors);
      if (url.pathname.startsWith("/api/coupons/") && request.method === "PUT") return saveCoupon(request, env, admin, decodeURIComponent(url.pathname.split("/").pop()), cors);
      if (url.pathname.startsWith("/api/coupons/") && request.method === "DELETE") return deleteCoupon(env, admin, decodeURIComponent(url.pathname.split("/").pop()), cors);
      if (url.pathname === "/api/reviews/all" && request.method === "GET") return listAllReviews(env, cors);
      if (url.pathname.startsWith("/api/reviews/") && request.method === "PATCH") return moderateReview(request, env, admin, decodeURIComponent(url.pathname.split("/").pop()), cors);
      if (url.pathname === "/api/pos/credentials" && request.method === "GET") return posCredentialStatus(env, cors);
      if (url.pathname === "/api/pos/credentials" && request.method === "PUT") return savePosCredentials(request, env, admin, cors);
      return json({ error: "Endpoint bulunamadı" }, 404, cors);
    } catch (error) {
      console.error(error);
      return json({ error: "Sunucu işlemi tamamlanamadı" }, 500, cors);
    }
  }
};

function corsHeaders(origin, allowed) {
  const expected = allowed || "https://r0yc0ld.github.io";
  const accepted = origin === expected || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:");
  return { "Access-Control-Allow-Origin": accepted ? origin : expected, "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS", "Access-Control-Max-Age": "86400", "Vary": "Origin" };
}
function json(data, status = 200, headers = {}) { return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers } }); }
async function body(request) { const data = await request.json(); if (!data || typeof data !== "object") throw new Error("Invalid body"); return data; }
function safeJson(value, fallback) { try { return JSON.parse(value); } catch { return fallback; } }
function publicProduct(row) { return { id: row.id, name: row.name, brand: row.brand, category: row.category, sku: row.sku, price: row.price, oldPrice: row.old_price, stock: row.stock, rating: row.rating, badge: row.badge, tags: safeJson(row.tags, []), tone: row.tone, accent: row.accent, color: row.color, description: row.description, ingredients: row.ingredients, usage: row.usage, imageUrl: row.image_url || null, variants: safeJson(row.variants, []), criticalStock: row.critical_stock ?? 20, active: Boolean(row.active) }; }
function adminProduct(row) { return { ...publicProduct(row), cost: row.cost ?? null }; }
function storefrontUrl(env) { return (env.STOREFRONT_URL || "https://r0yc0ld.github.io/lumera-beauty-store/").replace(/\/?$/, "/"); }

async function bootstrap(env, cors) {
  const [products, settings, reviewStats] = await Promise.all([
    env.DB.prepare("SELECT * FROM products WHERE active = 1 ORDER BY created_at ASC").all(),
    env.DB.prepare("SELECT value FROM store_settings WHERE key = ?").bind("store").first(),
    env.DB.prepare("SELECT product_id, COUNT(*) count, ROUND(AVG(rating),1) avg FROM reviews WHERE status='approved' GROUP BY product_id").all().catch(() => ({ results: [] }))
  ]);
  const stats = Object.fromEntries(reviewStats.results.map(r => [r.product_id, { count: r.count, avg: r.avg }]));
  return json({ products: products.results.map(publicProduct), settings: safeJson(settings?.value, {}), reviewStats: stats }, 200, cors);
}
async function login(request, env, cors) {
  const data = await body(request);
  const expectedUser = env.ADMIN_USERNAME || "admin";
  const expectedPassword = env.ADMIN_PASSWORD;
  if (!expectedPassword) return json({ error: "Yönetici şifresi sunucuda yapılandırılmamış" }, 503, cors);
  const validUser = await constantEqual(String(data.username || ""), expectedUser);
  const validPassword = await constantEqual(String(data.password || ""), expectedPassword);
  if (!validUser || !validPassword) return json({ error: "Kullanıcı adı veya şifre hatalı" }, 401, cors);
  const token = await signToken({ sub: expectedUser, exp: Date.now() + 12 * 60 * 60 * 1000 }, env.SESSION_SECRET);
  await audit(env, expectedUser, "admin.login", "session", null, { ip: request.headers.get("CF-Connecting-IP") || "unknown" });
  return json({ token, expiresIn: 43200 }, 200, cors);
}
async function authorize(request, env) {
  const raw = request.headers.get("Authorization") || "";
  if (!raw.startsWith("Bearer ") || !env.SESSION_SECRET) return null;
  const token = raw.slice(7), [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = await hmac(payload, env.SESSION_SECRET);
  if (!(await constantEqual(signature, expected))) return null;
  const data = safeJson(decodeBase64Url(payload), null);
  return data && data.exp > Date.now() ? data.sub : null;
}
async function signToken(data, secret) { if (!secret) throw new Error("SESSION_SECRET missing"); const payload = encodeBase64Url(JSON.stringify(data)); return `${payload}.${await hmac(payload, secret)}`; }
async function hmac(value, secret) { const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(value)); return encodeBase64Url(new Uint8Array(sig)); }
async function hmacRawB64(value, secret) { const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(value)); return toBase64(new Uint8Array(sig)); }
async function hmacHex(value, secret) { const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(value)); return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join(""); }
async function constantEqual(a, b) { const [ha, hb] = await Promise.all([crypto.subtle.digest("SHA-256", encoder.encode(a)), crypto.subtle.digest("SHA-256", encoder.encode(b))]); const aa = new Uint8Array(ha), bb = new Uint8Array(hb); let diff = 0; for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i]; return diff === 0; }
function toBase64(bytes) { let binary = ""; bytes.forEach(byte => binary += String.fromCharCode(byte)); return btoa(binary); }
function fromBase64(value) { const binary = atob(value); return Uint8Array.from(binary, c => c.charCodeAt(0)); }
function encodeBase64Url(value) { const bytes = typeof value === "string" ? encoder.encode(value) : value; return toBase64(bytes).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", ""); }
function decodeBase64Url(value) { return new TextDecoder().decode(fromBase64(value.replaceAll("-", "+").replaceAll("_", "/"))); }

// POS kimlik bilgileri D1'de AES-GCM ile şifreli tutulur; anahtar SESSION_SECRET'tan türetilir.
async function posAesKey(env) { const digest = await crypto.subtle.digest("SHA-256", encoder.encode(`${env.SESSION_SECRET}|pos-credentials`)); return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]); }
async function encryptCredentials(env, obj) { const iv = crypto.getRandomValues(new Uint8Array(12)); const key = await posAesKey(env); const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(JSON.stringify(obj))); return JSON.stringify({ iv: toBase64(iv), data: toBase64(new Uint8Array(data)) }); }
async function decryptCredentials(env, text) { try { const { iv, data } = JSON.parse(text); const key = await posAesKey(env); const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(iv) }, key, fromBase64(data)); return JSON.parse(new TextDecoder().decode(plain)); } catch { return null; } }
async function getCredentials(env, provider) { const row = await env.DB.prepare("SELECT data FROM pos_credentials WHERE provider = ?").bind(provider).first(); return row ? decryptCredentials(env, row.data) : null; }
const mask = value => value ? `••••${String(value).slice(-4)}` : null;

async function savePosCredentials(request, env, actor, cors) {
  const data = await body(request);
  const provider = String(data.provider || "");
  let clean = null;
  if (provider === "iyzico") {
    const apiKey = String(data.apiKey || "").trim(), secretKey = String(data.secretKey || "").trim();
    if (!apiKey || !secretKey) return json({ error: "iyzico API anahtarı ve gizli anahtar zorunlu" }, 400, cors);
    clean = { apiKey, secretKey, sandbox: Boolean(data.sandbox) };
  } else if (provider === "paytr") {
    const merchantId = String(data.merchantId || "").trim(), merchantKey = String(data.merchantKey || "").trim(), merchantSalt = String(data.merchantSalt || "").trim();
    if (!merchantId || !merchantKey || !merchantSalt) return json({ error: "PayTR mağaza no, anahtar ve salt zorunlu" }, 400, cors);
    clean = { merchantId, merchantKey, merchantSalt };
  } else return json({ error: "Geçersiz sağlayıcı" }, 400, cors);
  const encrypted = await encryptCredentials(env, clean);
  await env.DB.prepare("INSERT INTO pos_credentials(provider,data,updated_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(provider) DO UPDATE SET data=excluded.data,updated_at=CURRENT_TIMESTAMP").bind(provider, encrypted).run();
  await audit(env, actor, "pos.credentials.saved", "pos", provider, {});
  return json({ ok: true }, 200, cors);
}
async function posCredentialStatus(env, cors) {
  const rows = await env.DB.prepare("SELECT provider, data, updated_at FROM pos_credentials").all();
  const status = {};
  for (const row of rows.results) {
    const creds = await decryptCredentials(env, row.data);
    if (!creds) { status[row.provider] = { configured: false }; continue; }
    if (row.provider === "iyzico") status[row.provider] = { configured: true, hint: mask(creds.apiKey), sandbox: Boolean(creds.sandbox), updatedAt: row.updated_at };
    else if (row.provider === "paytr") status[row.provider] = { configured: true, hint: mask(creds.merchantId), updatedAt: row.updated_at };
  }
  return json({ pos: status }, 200, cors);
}

async function newsletter(request, env, cors) {
  const data = await body(request); const email = String(data.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Geçerli bir e-posta adresi girin" }, 400, cors);
  await env.DB.prepare("INSERT INTO newsletter_subscribers(email,status,consent_at,source) VALUES(?, 'active', CURRENT_TIMESTAMP, 'storefront') ON CONFLICT(email) DO UPDATE SET status='active', consent_at=CURRENT_TIMESTAMP").bind(email).run();
  return json({ ok: true }, 201, cors);
}

async function findCoupon(env, code, total) {
  const row = await env.DB.prepare("SELECT * FROM coupons WHERE code = ? AND active = 1").bind(code).first();
  if (!row) return { error: "Kupon bulunamadı" };
  const now = new Date().toISOString();
  if (row.starts_at && row.starts_at > now) return { error: "Kupon henüz başlamadı" };
  if (row.ends_at && row.ends_at < now) return { error: "Kuponun süresi doldu" };
  if (row.usage_limit && row.used_count >= row.usage_limit) return { error: "Kupon kullanım limiti doldu" };
  if (total < row.min_total) return { error: `Bu kupon için minimum sepet tutarı ${row.min_total} TL` };
  let discount = 0, freeShipping = false;
  if (row.type === "percent") discount = Math.floor(total * row.value / 100);
  else if (row.type === "fixed") discount = Math.min(row.value, total);
  else if (row.type === "shipping") freeShipping = true;
  return { coupon: { code: row.code, type: row.type, value: row.value, discount, freeShipping } };
}
async function validateCouponRequest(request, env, cors) {
  const data = await body(request);
  const code = String(data.code || "").trim().toUpperCase();
  const total = Math.max(0, Number(data.total) || 0);
  if (!code) return json({ error: "Kupon kodu girin" }, 400, cors);
  const result = await findCoupon(env, code, total);
  if (result.error) return json({ error: result.error }, 404, cors);
  return json(result, 200, cors);
}

async function createOrder(request, env, cors) {
  const data = await body(request); const customer = data.customer || {}; const items = Array.isArray(data.items) ? data.items : [];
  if (!data.id || !data.orderNo || !customer.email || !customer.address || !items.length) return json({ error: "Sipariş bilgileri eksik" }, 400, cors);
  const ids = [...new Set(items.map(item => String(item.id)))]; const marks = ids.map(() => "?").join(","); const productRows = await env.DB.prepare(`SELECT id,name,price,stock,variants FROM products WHERE active=1 AND id IN (${marks})`).bind(...ids).all(); const products = new Map(productRows.results.map(p => [p.id, { ...p, variantList: safeJson(p.variants, []) }]));
  let gross = 0; const normalized = []; const variantUpdates = new Map();
  for (const item of items) {
    const p = products.get(String(item.id)); const quantity = Math.max(1, Math.min(20, Number(item.quantity) || 1));
    if (!p || p.stock < quantity) return json({ error: "Sepetteki bir ürün stokta yok" }, 409, cors);
    let unitPrice = p.price, label = p.name;
    if (item.variant) {
      const variant = p.variantList.find(v => v.name === String(item.variant));
      if (!variant) return json({ error: "Seçilen varyant bulunamadı" }, 409, cors);
      if (Number(variant.stock) < quantity) return json({ error: `${p.name} — ${variant.name} varyantı stokta yok` }, 409, cors);
      unitPrice = Math.max(0, Number(variant.price) || p.price); label = `${p.name} — ${variant.name}`;
      variant.stock = Number(variant.stock) - quantity; variantUpdates.set(p.id, p.variantList);
    }
    gross += unitPrice * quantity; normalized.push({ id: p.id, label, unitPrice, quantity });
  }
  let discount = 0, couponCode = null;
  if (data.coupon) {
    const result = await findCoupon(env, String(data.coupon).trim().toUpperCase(), gross);
    if (result.coupon) { discount = result.coupon.discount; couponCode = result.coupon.code; }
  }
  const total = Math.max(0, gross - discount);
  const customerId = `cus_${await shortHash(customer.email.toLowerCase())}`;
  const statements = [
    env.DB.prepare("INSERT INTO customers(id,email,first_name,last_name,phone,city,order_count,total_spent,marketing_consent) VALUES(?,?,?,?,?,?,1,?,?) ON CONFLICT(email) DO UPDATE SET first_name=excluded.first_name,last_name=excluded.last_name,phone=excluded.phone,city=excluded.city,order_count=order_count+1,total_spent=total_spent+excluded.total_spent,updated_at=CURRENT_TIMESTAMP").bind(customerId, customer.email.toLowerCase(), customer.firstName || "", customer.lastName || "", customer.phone || "", customer.city || "", total, customer.marketing ? 1 : 0),
    env.DB.prepare("INSERT INTO orders(id,order_no,customer_id,customer_json,total,discount,coupon_code,status,payment_method,payment_status,shipping_address,consent_at) VALUES(?,?,?,?,?,?,?,'new',?,?,?,CURRENT_TIMESTAMP)").bind(data.id, data.orderNo, customerId, JSON.stringify(customer), total, discount, couponCode, data.payment || "card", data.payment === "card" ? "pending" : "awaiting", customer.address)
  ];
  normalized.forEach(item => { statements.push(env.DB.prepare("INSERT INTO order_items(order_id,product_id,product_name,unit_price,quantity) VALUES(?,?,?,?,?)").bind(data.id, item.id, item.label, item.unitPrice, item.quantity)); statements.push(env.DB.prepare("UPDATE products SET stock=stock-?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND stock>=?").bind(item.quantity, item.id, item.quantity)); });
  variantUpdates.forEach((variants, id) => statements.push(env.DB.prepare("UPDATE products SET variants=? WHERE id=?").bind(JSON.stringify(variants), id)));
  if (couponCode) statements.push(env.DB.prepare("UPDATE coupons SET used_count=used_count+1 WHERE code=?").bind(couponCode));
  await env.DB.batch(statements); await audit(env, "storefront", "order.created", "order", data.id, { orderNo: data.orderNo, total, discount, coupon: couponCode });
  return json({ order: { id: data.id, orderNo: data.orderNo, total, discount, coupon: couponCode, status: "new", paymentStatus: data.payment === "card" ? "pending" : "awaiting" } }, 201, cors);
}

// ---- Ödeme başlatma: panelde kayıtlı sağlayıcı bilgileri otomatik kullanılır ----
async function paymentInit(request, env, cors) {
  const data = await body(request);
  const order = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(String(data.orderId || "")).first();
  if (!order) return json({ error: "Sipariş bulunamadı" }, 404, cors);
  if (order.payment_status === "paid") return json({ error: "Sipariş zaten ödendi" }, 409, cors);
  const settingsRow = await env.DB.prepare("SELECT value FROM store_settings WHERE key='store'").first();
  const settings = safeJson(settingsRow?.value, {});
  if (settings.testMode) return json({ mode: "test" }, 200, cors);
  const provider = settings.provider === "paytr" ? "paytr" : "iyzico";
  const creds = await getCredentials(env, provider);
  if (!creds) return json({ error: "Ödeme sağlayıcısı henüz yapılandırılmadı. Yönetici panelinden Sanal POS bilgilerini girin.", mode: "unconfigured" }, 409, cors);
  const customer = safeJson(order.customer_json, {});
  const items = (await env.DB.prepare("SELECT product_id,product_name,unit_price,quantity FROM order_items WHERE order_id = ?").bind(order.id).all()).results;
  const clientIp = request.headers.get("CF-Connecting-IP") || "85.34.78.112";
  try {
    if (provider === "iyzico") {
      const result = await iyzicoInit(env, creds, order, customer, items, settings, request);
      if (result.error) return json({ error: result.error }, 502, cors);
      await env.DB.prepare("UPDATE orders SET payment_token=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(result.token, order.id).run();
      await audit(env, "storefront", "payment.initialized", "order", order.id, { provider });
      return json({ mode: "live", provider, paymentPageUrl: result.paymentPageUrl, token: result.token }, 200, cors);
    }
    const result = await paytrInit(env, creds, order, customer, items, clientIp);
    if (result.error) return json({ error: result.error }, 502, cors);
    await env.DB.prepare("UPDATE orders SET payment_token=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(result.merchantOid, order.id).run();
    await audit(env, "storefront", "payment.initialized", "order", order.id, { provider });
    return json({ mode: "live", provider, iframeUrl: result.iframeUrl }, 200, cors);
  } catch (error) {
    console.error("payment init", error);
    return json({ error: "Ödeme sağlayıcısına ulaşılamadı, lütfen tekrar deneyin" }, 502, cors);
  }
}

async function iyzicoAuthHeader(creds, uriPath, requestBody) {
  const randomKey = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  const signature = await hmacHex(randomKey + uriPath + requestBody, creds.secretKey);
  const authorization = `apiKey:${creds.apiKey}&randomKey:${randomKey}&signature:${signature}`;
  return { header: `IYZWSv2 ${toBase64(encoder.encode(authorization))}`, randomKey };
}
async function iyzicoInit(env, creds, order, customer, items, settings, request) {
  const base = creds.sandbox ? "https://sandbox-api.iyzipay.com" : "https://api.iyzipay.com";
  const uriPath = "/payment/iyzipos/checkoutform/initialize/auth/ecom";
  const price = Number(order.total).toFixed(1);
  const callback = `${new URL(request.url).origin}/api/payments/callback/iyzico?order=${encodeURIComponent(order.id)}`;
  // Sepet kalemleri iyzico'da toplam fiyata eşit olmalı: indirim orantılı dağıtılır, yuvarlama farkı son kaleme eklenir.
  const gross = Math.max(1, order.total + order.discount);
  let allocated = 0;
  const basketItems = items.map((item, index) => {
    let share = index === items.length - 1 ? Number((order.total - allocated).toFixed(2)) : Number((item.unit_price * item.quantity * order.total / gross).toFixed(2));
    allocated = Number((allocated + share).toFixed(2));
    return { id: item.product_id, name: item.product_name, category1: "Kozmetik", itemType: "PHYSICAL", price: share.toFixed(2) };
  });
  const payload = JSON.stringify({
    locale: "tr", conversationId: order.id, price, paidPrice: price, currency: "TRY", basketId: order.order_no,
    paymentGroup: "PRODUCT", callbackUrl: callback,
    enabledInstallments: Array.isArray(settings.installments) && settings.installments.length ? settings.installments : [1],
    buyer: { id: order.customer_id || "guest", name: customer.firstName || "Misafir", surname: customer.lastName || "Müşteri", gsmNumber: customer.phone || "", email: customer.email || "", identityNumber: customer.identityNumber || "11111111111", registrationAddress: order.shipping_address, ip: request.headers.get("CF-Connecting-IP") || "85.34.78.112", city: customer.city || "İstanbul", country: "Turkey" },
    shippingAddress: { contactName: `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "Müşteri", city: customer.city || "İstanbul", country: "Turkey", address: order.shipping_address },
    billingAddress: { contactName: `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "Müşteri", city: customer.city || "İstanbul", country: "Turkey", address: order.shipping_address },
    basketItems
  });
  const { header } = await iyzicoAuthHeader(creds, uriPath, payload);
  const response = await fetch(base + uriPath, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": header }, body: payload });
  const result = await response.json().catch(() => ({}));
  if (result.status !== "success") return { error: result.errorMessage || "iyzico ödeme başlatılamadı" };
  return { token: result.token, paymentPageUrl: result.paymentPageUrl || null };
}
async function iyzicoRetrieve(creds, token, conversationId) {
  const base = creds.sandbox ? "https://sandbox-api.iyzipay.com" : "https://api.iyzipay.com";
  const uriPath = "/payment/iyzipos/checkoutform/auth/ecom/detail";
  const payload = JSON.stringify({ locale: "tr", conversationId, token });
  const { header } = await iyzicoAuthHeader(creds, uriPath, payload);
  const response = await fetch(base + uriPath, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": header }, body: payload });
  return response.json().catch(() => ({}));
}
async function iyzicoCallback(request, env, url) {
  const orderId = url.searchParams.get("order") || "";
  const store = storefrontUrl(env);
  let token = "";
  try { const form = await request.formData(); token = String(form.get("token") || ""); } catch { token = url.searchParams.get("token") || ""; }
  const order = await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first();
  if (!order || !token || order.payment_token !== token) return Response.redirect(`${store}?payment=fail&order=${encodeURIComponent(order?.order_no || "")}`, 302);
  const creds = await getCredentials(env, "iyzico");
  if (!creds) return Response.redirect(`${store}?payment=fail&order=${encodeURIComponent(order.order_no)}`, 302);
  const result = await iyzicoRetrieve(creds, token, order.id);
  const success = result.status === "success" && result.paymentStatus === "SUCCESS";
  if (success) { await env.DB.prepare("UPDATE orders SET payment_status='paid',paid_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(order.id).run(); await audit(env, "iyzico", "payment.completed", "order", order.id, { orderNo: order.order_no }); }
  else await audit(env, "iyzico", "payment.failed", "order", order.id, { orderNo: order.order_no, detail: result.errorMessage || result.paymentStatus || "unknown" });
  return Response.redirect(`${store}?payment=${success ? "success" : "fail"}&order=${encodeURIComponent(order.order_no)}`, 302);
}

async function paytrInit(env, creds, order, customer, items, clientIp) {
  const merchantOid = order.order_no.replace(/[^A-Za-z0-9]/g, "");
  const amount = String(Math.round(order.total * 100));
  const basket = toBase64(encoder.encode(JSON.stringify(items.map(item => [item.product_name, String(item.unit_price), item.quantity]))));
  const noInstallment = "0", maxInstallment = "0", currency = "TL", testMode = "0";
  const hashStr = creds.merchantId + clientIp + merchantOid + (customer.email || "") + amount + basket + noInstallment + maxInstallment + currency + testMode;
  const paytrToken = await hmacRawB64(hashStr + creds.merchantSalt, creds.merchantKey);
  const store = storefrontUrl(env);
  const form = new URLSearchParams({
    merchant_id: creds.merchantId, user_ip: clientIp, merchant_oid: merchantOid, email: customer.email || "",
    payment_amount: amount, paytr_token: paytrToken, user_basket: basket, debug_on: "0", no_installment: noInstallment,
    max_installment: maxInstallment, user_name: `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "Müşteri",
    user_address: order.shipping_address, user_phone: customer.phone || "", currency,
    merchant_ok_url: `${store}?payment=success&order=${encodeURIComponent(order.order_no)}`,
    merchant_fail_url: `${store}?payment=fail&order=${encodeURIComponent(order.order_no)}`,
    timeout_limit: "30", test_mode: testMode
  });
  const response = await fetch("https://www.paytr.com/odeme/api/get-token", { method: "POST", body: form });
  const result = await response.json().catch(() => ({}));
  if (result.status !== "success") return { error: result.reason || "PayTR ödeme başlatılamadı" };
  return { iframeUrl: `https://www.paytr.com/odeme/guvenli/${result.token}`, merchantOid };
}
async function paytrWebhook(request, env) {
  const creds = await getCredentials(env, "paytr");
  if (!creds) return new Response("OK");
  const form = await request.formData();
  const merchantOid = String(form.get("merchant_oid") || ""), status = String(form.get("status") || ""), totalAmount = String(form.get("total_amount") || ""), hash = String(form.get("hash") || "");
  const expected = await hmacRawB64(merchantOid + creds.merchantSalt + status + totalAmount, creds.merchantKey);
  if (!(await constantEqual(hash, expected))) return new Response("PAYTR notification failed: bad hash", { status: 400 });
  const order = await env.DB.prepare("SELECT * FROM orders WHERE payment_token = ?").bind(merchantOid).first();
  if (order) {
    if (status === "success") { await env.DB.prepare("UPDATE orders SET payment_status='paid',paid_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(order.id).run(); await audit(env, "paytr", "payment.completed", "order", order.id, { orderNo: order.order_no }); }
    else await audit(env, "paytr", "payment.failed", "order", order.id, { orderNo: order.order_no });
  }
  return new Response("OK");
}

async function createReview(request, env, cors) {
  const data = await body(request);
  const productId = String(data.productId || "").trim();
  const name = String(data.name || "").trim().slice(0, 60);
  const rating = Math.max(1, Math.min(5, Math.round(Number(data.rating) || 0)));
  const comment = String(data.comment || "").trim().slice(0, 800);
  if (!productId || !name || !comment || !Number(data.rating)) return json({ error: "İsim, puan ve yorum zorunlu" }, 400, cors);
  const product = await env.DB.prepare("SELECT id FROM products WHERE id = ? AND active = 1").bind(productId).first();
  if (!product) return json({ error: "Ürün bulunamadı" }, 404, cors);
  const id = `rev_${crypto.randomUUID().slice(0, 12)}`;
  await env.DB.prepare("INSERT INTO reviews(id,product_id,name,rating,comment,status) VALUES(?,?,?,?,?,'pending')").bind(id, productId, name, rating, comment).run();
  await audit(env, "storefront", "review.created", "review", id, { productId, rating });
  return json({ ok: true, id, status: "pending" }, 201, cors);
}
async function listPublicReviews(env, productId, cors) {
  if (!productId) return json({ error: "Ürün belirtin" }, 400, cors);
  const rows = await env.DB.prepare("SELECT id,name,rating,comment,created_at FROM reviews WHERE product_id = ? AND status='approved' ORDER BY created_at DESC LIMIT 50").bind(productId).all();
  return json({ reviews: rows.results }, 200, cors);
}

async function saveSettings(request, env, actor, cors) {
  const data = await body(request);
  const pages = {};
  if (data.pages && typeof data.pages === "object") {
    for (const [key, page] of Object.entries(data.pages)) {
      if (!/^[a-z0-9-]{1,40}$/.test(key) || !page || typeof page !== "object") continue;
      pages[key] = { title: String(page.title || "").slice(0, 120), body: String(page.body || "").slice(0, 8000) };
    }
  }
  const categories = (Array.isArray(data.categories) ? data.categories : []).slice(0, 12).map(c => ({ name: String(c.name || "").slice(0, 40), copy: String(c.copy || "").slice(0, 60), tone: /^#[0-9a-fA-F]{6}$/.test(c.tone) ? c.tone : "#ead7cf", accent: /^#[0-9a-fA-F]{6}$/.test(c.accent) ? c.accent : "#fff5ef" })).filter(c => c.name);
  const safe = { announcement:String(data.announcement||"").slice(0,240),heroEyebrow:String(data.heroEyebrow||"").slice(0,100),heroTitle:String(data.heroTitle||"").slice(0,150),heroCopy:String(data.heroCopy||"").slice(0,500),shippingThreshold:Math.max(0,Number(data.shippingThreshold)||0),loyaltyRate:Math.max(0,Number(data.loyaltyRate)||0),provider:["iyzico","paytr","custom"].includes(data.provider)?data.provider:"iyzico",threeDSecure:Boolean(data.threeDSecure),testMode:Boolean(data.testMode),bankTransfer:Boolean(data.bankTransfer),cashOnDelivery:Boolean(data.cashOnDelivery),installments:(Array.isArray(data.installments)?data.installments:[]).filter(n=>[2,3,6,9,12].includes(Number(n))).map(Number),supportEmail:String(data.supportEmail||"").slice(0,120),supportPhone:String(data.supportPhone||"").slice(0,40),bankName:String(data.bankName||"").slice(0,80),iban:String(data.iban||"").slice(0,40),accountHolder:String(data.accountHolder||"").slice(0,80),seoTitle:String(data.seoTitle||"").slice(0,80),seoDescription:String(data.seoDescription||"").slice(0,180),pages,categories };
  await env.DB.prepare("INSERT INTO store_settings(key,value,updated_at) VALUES('store',?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP").bind(JSON.stringify(safe)).run();
  await audit(env, actor, "settings.updated", "settings", "store", {});
  return json({ ok:true, settings: safe }, 200, cors);
}
function sanitizeVariants(input){ return (Array.isArray(input)?input:[]).slice(0,20).map(v=>({name:String(v.name||"").slice(0,40),price:Math.max(0,Number(v.price)||0),stock:Math.max(0,Number(v.stock)||0)})).filter(v=>v.name); }
async function saveProduct(request, env, actor, id, cors) { const p=await body(request); if(!p.name||!p.brand||!p.sku)return json({error:"Ürün adı, marka ve SKU zorunlu"},400,cors); await env.DB.prepare("INSERT INTO products(id,name,brand,category,sku,price,old_price,stock,rating,badge,tags,tone,accent,color,description,ingredients,usage,image_url,cost,variants,critical_stock,active,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET name=excluded.name,brand=excluded.brand,category=excluded.category,sku=excluded.sku,price=excluded.price,old_price=excluded.old_price,stock=excluded.stock,rating=excluded.rating,badge=excluded.badge,tags=excluded.tags,tone=excluded.tone,accent=excluded.accent,color=excluded.color,description=excluded.description,ingredients=excluded.ingredients,usage=excluded.usage,image_url=excluded.image_url,cost=excluded.cost,variants=excluded.variants,critical_stock=excluded.critical_stock,active=excluded.active,updated_at=CURRENT_TIMESTAMP").bind(id,String(p.name),String(p.brand),String(p.category||""),String(p.sku),Math.max(0,Number(p.price)||0),p.oldPrice?Number(p.oldPrice):null,Math.max(0,Number(p.stock)||0),Number(p.rating)||5,p.badge||null,JSON.stringify(p.tags||[]),p.tone||"#ead7cf",p.accent||"#fff5ef",p.color||"#eaa084",p.description||"",p.ingredients||"",p.usage||"",p.imageUrl?String(p.imageUrl).slice(0,500):null,p.cost!=null&&p.cost!==""?Math.max(0,Number(p.cost)||0):null,JSON.stringify(sanitizeVariants(p.variants)),Math.max(0,Number(p.criticalStock)||20),p.active===false?0:1).run(); await audit(env,actor,"product.saved","product",id,{sku:p.sku}); return json({ok:true},200,cors); }
async function listFullProducts(env,cors){const rows=await env.DB.prepare("SELECT * FROM products ORDER BY created_at ASC").all();return json({products:rows.results.map(adminProduct)},200,cors);}
async function listOrders(env,cors){const rows=await env.DB.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 250").all();return json({orders:rows.results.map(o=>({...o,customer:safeJson(o.customer_json,{})}))},200,cors);}
async function orderDetail(env,id,cors){const order=await env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(id).first();if(!order)return json({error:"Sipariş bulunamadı"},404,cors);const items=await env.DB.prepare("SELECT product_id,product_name,unit_price,quantity FROM order_items WHERE order_id = ?").bind(id).all();return json({order:{...order,customer:safeJson(order.customer_json,{}),items:items.results}},200,cors);}
async function updateOrder(request,env,actor,id,cors){const data=await body(request);const updates=[],binds=[];if(data.status){if(!["new","preparing","shipped","complete","cancelled"].includes(data.status))return json({error:"Geçersiz durum"},400,cors);updates.push("status=?");binds.push(data.status);}if(data.paymentStatus){if(!["pending","awaiting","paid","refunded"].includes(data.paymentStatus))return json({error:"Geçersiz ödeme durumu"},400,cors);updates.push("payment_status=?");binds.push(data.paymentStatus);}if(!updates.length)return json({error:"Güncellenecek alan yok"},400,cors);await env.DB.prepare(`UPDATE orders SET ${updates.join(",")},updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(...binds,id).run();await audit(env,actor,"order.updated","order",id,data);return json({ok:true},200,cors);}
async function listCustomers(env,cors){const rows=await env.DB.prepare("SELECT * FROM customers ORDER BY updated_at DESC LIMIT 500").all();return json({customers:rows.results},200,cors);}
async function listSubscribers(env,cors){const rows=await env.DB.prepare("SELECT email,status,consent_at,source FROM newsletter_subscribers ORDER BY consent_at DESC LIMIT 1000").all();return json({subscribers:rows.results},200,cors);}
async function listAudit(env,cors){const rows=await env.DB.prepare("SELECT actor,action,entity_type,entity_id,metadata,created_at FROM audit_log ORDER BY created_at DESC, id DESC LIMIT 120").all();return json({audit:rows.results.map(r=>({...r,metadata:safeJson(r.metadata,{})}))},200,cors);}
async function listCoupons(env,cors){const rows=await env.DB.prepare("SELECT * FROM coupons ORDER BY created_at DESC LIMIT 200").all();return json({coupons:rows.results},200,cors);}
async function saveCoupon(request,env,actor,code,cors){const data=await body(request);const clean=String(code||"").trim().toUpperCase();if(!/^[A-Z0-9-]{3,24}$/.test(clean))return json({error:"Kupon kodu 3-24 harf/rakam olmalı"},400,cors);const type=["percent","fixed","shipping"].includes(data.type)?data.type:"percent";const value=Math.max(0,Math.min(type==="percent"?90:100000,Number(data.value)||0));if(type!=="shipping"&&value<=0)return json({error:"Kupon değeri girin"},400,cors);await env.DB.prepare("INSERT INTO coupons(code,type,value,min_total,starts_at,ends_at,usage_limit,active) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(code) DO UPDATE SET type=excluded.type,value=excluded.value,min_total=excluded.min_total,starts_at=excluded.starts_at,ends_at=excluded.ends_at,usage_limit=excluded.usage_limit,active=excluded.active").bind(clean,type,value,Math.max(0,Number(data.minTotal)||0),data.startsAt||null,data.endsAt||null,data.usageLimit?Math.max(1,Number(data.usageLimit)):null,data.active===false?0:1).run();await audit(env,actor,"coupon.saved","coupon",clean,{type,value});return json({ok:true},200,cors);}
async function deleteCoupon(env,actor,code,cors){await env.DB.prepare("DELETE FROM coupons WHERE code = ?").bind(String(code).toUpperCase()).run();await audit(env,actor,"coupon.deleted","coupon",code,{});return json({ok:true},200,cors);}
async function listAllReviews(env,cors){const rows=await env.DB.prepare("SELECT r.*, p.name product_name FROM reviews r LEFT JOIN products p ON p.id = r.product_id ORDER BY r.created_at DESC LIMIT 300").all();return json({reviews:rows.results},200,cors);}
async function moderateReview(request,env,actor,id,cors){const data=await body(request);if(!["approved","rejected","pending"].includes(data.status))return json({error:"Geçersiz durum"},400,cors);await env.DB.prepare("UPDATE reviews SET status=? WHERE id=?").bind(data.status,id).run();await audit(env,actor,"review.moderated","review",id,{status:data.status});return json({ok:true},200,cors);}
async function overview(env,cors){
  const [orders,revenue,statuses,customers,subscribers,pendingReviews,lowStock,recent,profit]=await Promise.all([
    env.DB.prepare("SELECT COUNT(*) c FROM orders").first(),
    env.DB.prepare("SELECT COALESCE(SUM(total),0) s FROM orders WHERE status != 'cancelled'").first(),
    env.DB.prepare("SELECT status, COUNT(*) c FROM orders GROUP BY status").all(),
    env.DB.prepare("SELECT COUNT(*) c FROM customers").first(),
    env.DB.prepare("SELECT COUNT(*) c FROM newsletter_subscribers WHERE status='active'").first(),
    env.DB.prepare("SELECT COUNT(*) c FROM reviews WHERE status='pending'").first(),
    env.DB.prepare("SELECT id,name,sku,stock,critical_stock FROM products WHERE active=1 AND stock < critical_stock ORDER BY stock ASC LIMIT 10").all(),
    env.DB.prepare("SELECT order_no,total,status,payment_status,created_at,customer_json FROM orders ORDER BY created_at DESC LIMIT 8").all(),
    env.DB.prepare("SELECT COALESCE(SUM((i.unit_price - COALESCE(p.cost,0)) * i.quantity),0) s FROM order_items i JOIN orders o ON o.id=i.order_id LEFT JOIN products p ON p.id=i.product_id WHERE o.status != 'cancelled' AND p.cost IS NOT NULL").first()
  ]);
  return json({ overview:{ orders:orders.c, revenue:revenue.s, estimatedProfit:profit.s, statuses:Object.fromEntries(statuses.results.map(r=>[r.status,r.c])), customers:customers.c, subscribers:subscribers.c, pendingReviews:pendingReviews.c, lowStock:lowStock.results, recentOrders:recent.results.map(o=>({...o,customer:safeJson(o.customer_json,{})})) } },200,cors);
}
async function audit(env,actor,action,type,id,metadata){await env.DB.prepare("INSERT INTO audit_log(actor,action,entity_type,entity_id,metadata) VALUES(?,?,?,?,?)").bind(actor,action,type,id,JSON.stringify(metadata||{})).run();}
async function shortHash(value){const digest=await crypto.subtle.digest("SHA-256",encoder.encode(value));return [...new Uint8Array(digest)].slice(0,8).map(b=>b.toString(16).padStart(2,"0")).join("");}
