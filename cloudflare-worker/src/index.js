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

      const admin = await authorize(request, env);
      if (!admin) return json({ error: "Yönetici oturumu gerekli" }, 401, cors);
      if (url.pathname === "/api/settings" && request.method === "PUT") return saveSettings(request, env, admin, cors);
      if (url.pathname === "/api/orders" && request.method === "GET") return listOrders(env, cors);
      if (url.pathname.startsWith("/api/orders/") && request.method === "PATCH") return updateOrder(request, env, admin, decodeURIComponent(url.pathname.split("/").pop()), cors);
      if (url.pathname.startsWith("/api/products/") && request.method === "PUT") return saveProduct(request, env, admin, decodeURIComponent(url.pathname.split("/").pop()), cors);
      return json({ error: "Endpoint bulunamadı" }, 404, cors);
    } catch (error) {
      console.error(error);
      return json({ error: "Sunucu işlemi tamamlanamadı" }, 500, cors);
    }
  }
};

function corsHeaders(origin, allowed) {
  const expected = allowed || "https://r0yc0ld.github.io";
  const accepted = origin === expected || origin.startsWith("http://localhost:");
  return { "Access-Control-Allow-Origin": accepted ? origin : expected, "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, OPTIONS", "Access-Control-Max-Age": "86400", "Vary": "Origin" };
}
function json(data, status = 200, headers = {}) { return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers } }); }
async function body(request) { const data = await request.json(); if (!data || typeof data !== "object") throw new Error("Invalid body"); return data; }
function publicProduct(row) { return { id: row.id, name: row.name, brand: row.brand, category: row.category, sku: row.sku, price: row.price, oldPrice: row.old_price, stock: row.stock, rating: row.rating, badge: row.badge, tags: safeJson(row.tags, []), tone: row.tone, accent: row.accent, color: row.color, description: row.description, ingredients: row.ingredients, usage: row.usage, active: Boolean(row.active) }; }
function safeJson(value, fallback) { try { return JSON.parse(value); } catch { return fallback; } }

async function bootstrap(env, cors) {
  const [products, settings] = await Promise.all([env.DB.prepare("SELECT * FROM products WHERE active = 1 ORDER BY created_at ASC").all(), env.DB.prepare("SELECT value FROM store_settings WHERE key = ?").bind("store").first()]);
  return json({ products: products.results.map(publicProduct), settings: safeJson(settings?.value, {}) }, 200, cors);
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
async function constantEqual(a, b) { const [ha, hb] = await Promise.all([crypto.subtle.digest("SHA-256", encoder.encode(a)), crypto.subtle.digest("SHA-256", encoder.encode(b))]); const aa = new Uint8Array(ha), bb = new Uint8Array(hb); let diff = 0; for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i]; return diff === 0; }
function encodeBase64Url(value) { const bytes = typeof value === "string" ? encoder.encode(value) : value; let binary = ""; bytes.forEach(byte => binary += String.fromCharCode(byte)); return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", ""); }
function decodeBase64Url(value) { const binary = atob(value.replaceAll("-", "+").replaceAll("_", "/")); return new TextDecoder().decode(Uint8Array.from(binary, c => c.charCodeAt(0))); }

async function newsletter(request, env, cors) {
  const data = await body(request); const email = String(data.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Geçerli bir e-posta adresi girin" }, 400, cors);
  await env.DB.prepare("INSERT INTO newsletter_subscribers(email,status,consent_at,source) VALUES(?, 'active', CURRENT_TIMESTAMP, 'storefront') ON CONFLICT(email) DO UPDATE SET status='active', consent_at=CURRENT_TIMESTAMP").bind(email).run();
  return json({ ok: true }, 201, cors);
}
async function createOrder(request, env, cors) {
  const data = await body(request); const customer = data.customer || {}; const items = Array.isArray(data.items) ? data.items : [];
  if (!data.id || !data.orderNo || !customer.email || !customer.address || !items.length) return json({ error: "Sipariş bilgileri eksik" }, 400, cors);
  const ids = [...new Set(items.map(item => String(item.id)))]; const marks = ids.map(() => "?").join(","); const productRows = await env.DB.prepare(`SELECT id,name,price,stock FROM products WHERE active=1 AND id IN (${marks})`).bind(...ids).all(); const products = new Map(productRows.results.map(p => [p.id, p]));
  let total = 0; const normalized = [];
  for (const item of items) { const p = products.get(String(item.id)); const quantity = Math.max(1, Math.min(20, Number(item.quantity) || 1)); if (!p || p.stock < quantity) return json({ error: "Sepetteki bir ürün stokta yok" }, 409, cors); total += p.price * quantity; normalized.push({ ...p, quantity }); }
  const customerId = `cus_${await shortHash(customer.email.toLowerCase())}`;
  const statements = [
    env.DB.prepare("INSERT INTO customers(id,email,first_name,last_name,phone,city,order_count,total_spent,marketing_consent) VALUES(?,?,?,?,?,?,1,?,?) ON CONFLICT(email) DO UPDATE SET first_name=excluded.first_name,last_name=excluded.last_name,phone=excluded.phone,city=excluded.city,order_count=order_count+1,total_spent=total_spent+excluded.total_spent,updated_at=CURRENT_TIMESTAMP").bind(customerId, customer.email.toLowerCase(), customer.firstName || "", customer.lastName || "", customer.phone || "", customer.city || "", total, customer.marketing ? 1 : 0),
    env.DB.prepare("INSERT INTO orders(id,order_no,customer_id,customer_json,total,status,payment_method,payment_status,shipping_address,consent_at) VALUES(?,?,?,?,?,'new',?,?,?,CURRENT_TIMESTAMP)").bind(data.id, data.orderNo, customerId, JSON.stringify(customer), total, data.payment || "card", data.payment === "card" ? "pending" : "awaiting", customer.address)
  ];
  normalized.forEach(item => { statements.push(env.DB.prepare("INSERT INTO order_items(order_id,product_id,product_name,unit_price,quantity) VALUES(?,?,?,?,?)").bind(data.id, item.id, item.name, item.price, item.quantity)); statements.push(env.DB.prepare("UPDATE products SET stock=stock-?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND stock>=?").bind(item.quantity, item.id, item.quantity)); });
  await env.DB.batch(statements); await audit(env, "storefront", "order.created", "order", data.id, { orderNo: data.orderNo, total });
  return json({ order: { id: data.id, orderNo: data.orderNo, total, status: "new", paymentStatus: data.payment === "card" ? "pending" : "awaiting" } }, 201, cors);
}
async function saveSettings(request, env, actor, cors) { const data = await body(request); const safe = { announcement:String(data.announcement||"").slice(0,240),heroEyebrow:String(data.heroEyebrow||"").slice(0,100),heroTitle:String(data.heroTitle||"").slice(0,150),heroCopy:String(data.heroCopy||"").slice(0,500),shippingThreshold:Math.max(0,Number(data.shippingThreshold)||0),loyaltyRate:Math.max(0,Number(data.loyaltyRate)||0),provider:["iyzico","paytr","custom"].includes(data.provider)?data.provider:"iyzico",threeDSecure:Boolean(data.threeDSecure),testMode:Boolean(data.testMode),bankTransfer:Boolean(data.bankTransfer),cashOnDelivery:Boolean(data.cashOnDelivery),installments:(Array.isArray(data.installments)?data.installments:[]).filter(n=>[2,3,6,9,12].includes(Number(n))),seoTitle:String(data.seoTitle||"").slice(0,80),seoDescription:String(data.seoDescription||"").slice(0,180)}; await env.DB.prepare("INSERT INTO store_settings(key,value,updated_at) VALUES('store',?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP").bind(JSON.stringify(safe)).run(); await audit(env, actor, "settings.updated", "settings", "store", {}); return json({ ok:true,settings:safe },200,cors); }
async function saveProduct(request, env, actor, id, cors) { const p=await body(request); if(!p.name||!p.brand||!p.sku)return json({error:"Ürün adı, marka ve SKU zorunlu"},400,cors); await env.DB.prepare("INSERT INTO products(id,name,brand,category,sku,price,old_price,stock,rating,badge,tags,tone,accent,color,description,ingredients,usage,active,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET name=excluded.name,brand=excluded.brand,category=excluded.category,sku=excluded.sku,price=excluded.price,old_price=excluded.old_price,stock=excluded.stock,rating=excluded.rating,badge=excluded.badge,tags=excluded.tags,tone=excluded.tone,accent=excluded.accent,color=excluded.color,description=excluded.description,ingredients=excluded.ingredients,usage=excluded.usage,active=excluded.active,updated_at=CURRENT_TIMESTAMP").bind(id,String(p.name),String(p.brand),String(p.category||""),String(p.sku),Math.max(0,Number(p.price)||0),p.oldPrice?Number(p.oldPrice):null,Math.max(0,Number(p.stock)||0),Number(p.rating)||5,p.badge||null,JSON.stringify(p.tags||[]),p.tone||"#ead7cf",p.accent||"#fff5ef",p.color||"#eaa084",p.description||"",p.ingredients||"",p.usage||"",p.active===false?0:1).run(); await audit(env,actor,"product.saved","product",id,{sku:p.sku}); return json({ok:true},200,cors); }
async function listOrders(env,cors){const rows=await env.DB.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 250").all();return json({orders:rows.results.map(o=>({...o,customer:safeJson(o.customer_json,{})}))},200,cors);}
async function updateOrder(request,env,actor,id,cors){const data=await body(request);if(!["new","preparing","shipped","complete","cancelled"].includes(data.status))return json({error:"Geçersiz durum"},400,cors);await env.DB.prepare("UPDATE orders SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(data.status,id).run();await audit(env,actor,"order.status","order",id,{status:data.status});return json({ok:true},200,cors);}
async function audit(env,actor,action,type,id,metadata){await env.DB.prepare("INSERT INTO audit_log(actor,action,entity_type,entity_id,metadata) VALUES(?,?,?,?,?)").bind(actor,action,type,id,JSON.stringify(metadata||{})).run();}
async function shortHash(value){const digest=await crypto.subtle.digest("SHA-256",encoder.encode(value));return [...new Uint8Array(digest)].slice(0,8).map(b=>b.toString(16).padStart(2,"0")).join("");}
