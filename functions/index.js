const { setGlobalOptions } = require("firebase-functions/v2");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

const { orderTemplates, campaignTemplate, esc } = require("./emailTemplates");
const { encryptCredentials, decryptCredentials, constantEqual } = require("./posCrypto");
const { iyzicoInit, iyzicoRetrieve, paytrInit } = require("./payments");

admin.initializeApp();
setGlobalOptions({ region: "us-central1", maxInstances: 10 });

const db = admin.firestore();

const TITAN_EMAIL = defineSecret("TITAN_EMAIL");
const TITAN_PASSWORD = defineSecret("TITAN_PASSWORD");
const POS_SECRET = defineSecret("POS_SECRET");

const STORE_URL = "https://lumrea.com/";
const IYZICO_CALLBACK_URL = "https://paymentcallbackiyzico-sehdfzkjxq-uc.a.run.app";

function mailer(email, password) {
  return nodemailer.createTransport({
    host: "smtpout.secureserver.net",
    port: 465,
    secure: true,
    auth: { user: email, pass: password }
  });
}

function cors(res, req) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  if (req.method === "OPTIONS") { res.status(204).send(""); return true; }
  return false;
}

async function requireAdmin(req) {
  const raw = req.get("Authorization") || "";
  if (!raw.startsWith("Bearer ")) return null;
  try { return (await admin.auth().verifyIdToken(raw.slice(7))).uid; } catch { return null; }
}

/* ================= sipariş durumu değişince otomatik mail ================= */
exports.onOrderStatusChange = onDocumentWritten(
  { document: "orders/{orderId}", secrets: [TITAN_EMAIL, TITAN_PASSWORD] },
  async event => {
    const before = event.data.before.exists ? event.data.before.data() : null;
    const after = event.data.after.exists ? event.data.after.data() : null;
    if (!after || !after.customer?.email) return;

    let key = null;
    if (!before) key = "new";
    else if (before.status !== after.status && ["preparing", "shipped", "complete", "cancelled"].includes(after.status)) key = after.status;
    else if (before.payment_status !== "paid" && after.payment_status === "paid") key = "paid";
    if (!key) return;

    const templates = orderTemplates({ ...after, id: event.params.orderId });
    const tpl = templates[key];
    if (!tpl) return;

    try {
      const transport = mailer(TITAN_EMAIL.value(), TITAN_PASSWORD.value());
      await transport.sendMail({ from: `"LUMREA" <${TITAN_EMAIL.value()}>`, to: after.customer.email, subject: tpl.subject, html: tpl.html });
      logger.info(`order email sent: ${key} -> ${after.customer.email}`);
    } catch (err) {
      logger.error("order email failed", err);
    }
  }
);

/* ================= admin: kampanya postası (bülten abonelerine) ================= */
exports.sendCampaign = onRequest({ secrets: [TITAN_EMAIL, TITAN_PASSWORD], invoker: "public" }, async (req, res) => {
  if (cors(res, req)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const uid = await requireAdmin(req);
  if (!uid) return res.status(401).json({ error: "Yönetici oturumu gerekli" });
  const subject = String(req.body?.subject || "").trim().slice(0, 150);
  const message = String(req.body?.message || "").trim().slice(0, 5000);
  if (!subject || !message) return res.status(400).json({ error: "Konu ve mesaj zorunlu" });
  try {
    const snap = await db.collection("subscribers").get();
    const emails = snap.docs.map(d => d.data().email).filter(Boolean);
    const html = campaignTemplate({ subject, message: `<p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6">${esc(message).replace(/\n/g, "<br>")}</p>` });
    const transport = mailer(TITAN_EMAIL.value(), TITAN_PASSWORD.value());
    let sent = 0;
    for (const email of emails) {
      try { await transport.sendMail({ from: `"LUMREA" <${TITAN_EMAIL.value()}>`, to: email, subject, html }); sent++; }
      catch (err) { logger.error(`campaign send failed for ${email}`, err); }
    }
    await db.collection("audit").add({ actor: uid, action: "campaign.sent", entity_type: "campaign", entity_id: "", created_at: new Date().toISOString() });
    res.json({ ok: true, sent, total: emails.length });
  } catch (err) {
    logger.error("sendCampaign failed", err);
    res.status(500).json({ error: "Kampanya gönderilemedi" });
  }
});

/* ================= müşteri: sipariş sorgulama (oturum gerektirmez) ================= */
exports.lookupOrder = onRequest({ invoker: "public" }, async (req, res) => {
  if (cors(res, req)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const orderNo = String(req.body?.orderNo || "").trim().toUpperCase();
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!orderNo || !email) return res.status(400).json({ error: "Sipariş numarası ve e-posta girin" });
  try {
    const snap = await db.collection("orders").where("order_no", "==", orderNo).limit(1).get();
    if (snap.empty) return res.status(404).json({ error: "Sipariş bulunamadı" });
    const order = snap.docs[0].data();
    if (String(order.customer?.email || "").trim().toLowerCase() !== email) return res.status(404).json({ error: "Sipariş bulunamadı" });
    res.json({
      order: {
        orderNo: order.order_no, status: order.status, paymentStatus: order.payment_status,
        total: order.total, discount: order.discount || 0, createdAt: order.created_at,
        items: order.items || []
      }
    });
  } catch (err) {
    logger.error("lookupOrder failed", err);
    res.status(500).json({ error: "Sipariş sorgulanamadı" });
  }
});

/* ================= Sanal POS: kimlik bilgileri (admin) ================= */
exports.posCredentials = onRequest({ secrets: [POS_SECRET], invoker: "public" }, async (req, res) => {
  if (cors(res, req)) return;
  const uid = await requireAdmin(req);
  if (!uid) return res.status(401).json({ error: "Yönetici oturumu gerekli" });
  const secret = POS_SECRET.value();
  if (req.method === "GET") {
    try {
      const snap = await db.collection("pos_credentials").get();
      const status = {};
      snap.forEach(doc => {
        const creds = decryptCredentials(secret, doc.data().data);
        if (!creds) { status[doc.id] = { configured: false }; return; }
        const hint = v => v ? `••••${String(v).slice(-4)}` : null;
        status[doc.id] = doc.id === "iyzico"
          ? { configured: true, hint: hint(creds.apiKey), sandbox: Boolean(creds.sandbox) }
          : { configured: true, hint: hint(creds.merchantId) };
      });
      return res.json({ pos: status });
    } catch (err) { logger.error("posCredentials GET failed", err); return res.status(500).json({ error: "Durum alınamadı" }); }
  }
  if (req.method === "PUT") {
    const data = req.body || {};
    const provider = String(data.provider || "");
    let clean = null;
    if (provider === "iyzico") {
      const apiKey = String(data.apiKey || "").trim(), secretKey = String(data.secretKey || "").trim();
      if (!apiKey || !secretKey) return res.status(400).json({ error: "iyzico API anahtarı ve gizli anahtar zorunlu" });
      clean = { apiKey, secretKey, sandbox: Boolean(data.sandbox) };
    } else if (provider === "paytr") {
      const merchantId = String(data.merchantId || "").trim(), merchantKey = String(data.merchantKey || "").trim(), merchantSalt = String(data.merchantSalt || "").trim();
      if (!merchantId || !merchantKey || !merchantSalt) return res.status(400).json({ error: "PayTR mağaza no, anahtar ve salt zorunlu" });
      clean = { merchantId, merchantKey, merchantSalt };
    } else return res.status(400).json({ error: "Geçersiz sağlayıcı" });
    try {
      await db.collection("pos_credentials").doc(provider).set({ data: encryptCredentials(secret, clean), updated_at: new Date().toISOString() });
      await db.collection("audit").add({ actor: uid, action: "pos.credentials.saved", entity_type: "pos", entity_id: provider, created_at: new Date().toISOString() });
      return res.json({ ok: true });
    } catch (err) { logger.error("posCredentials PUT failed", err); return res.status(500).json({ error: "Kaydedilemedi" }); }
  }
  res.status(405).json({ error: "Method not allowed" });
});

/* ================= Sanal POS: ödeme başlatma (müşteri) ================= */
exports.paymentInit = onRequest({ secrets: [POS_SECRET], invoker: "public" }, async (req, res) => {
  if (cors(res, req)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const orderId = String(req.body?.orderId || "");
  try {
    const orderRef = db.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) return res.status(404).json({ error: "Sipariş bulunamadı" });
    const order = { id: orderId, ...orderSnap.data() };
    if (order.payment_status === "paid") return res.status(409).json({ error: "Sipariş zaten ödendi" });

    const settingsSnap = await db.collection("settings").doc("store").get();
    const settings = settingsSnap.exists ? settingsSnap.data() : {};
    if (settings.testMode) return res.json({ mode: "test" });

    const provider = settings.provider === "paytr" ? "paytr" : "iyzico";
    const credSnap = await db.collection("pos_credentials").doc(provider).get();
    if (!credSnap.exists) return res.status(409).json({ error: "Ödeme sağlayıcısı henüz yapılandırılmadı. Yönetim panelinden Sanal POS bilgilerini girin.", mode: "unconfigured" });
    const creds = decryptCredentials(POS_SECRET.value(), credSnap.data().data);
    if (!creds) return res.status(409).json({ error: "Ödeme sağlayıcısı yapılandırması okunamadı", mode: "unconfigured" });

    const items = order.items || [];
    const clientIp = req.get("Fastly-Client-IP") || req.ip || "85.34.78.112";

    if (provider === "iyzico") {
      const callback = `${IYZICO_CALLBACK_URL}?order=${encodeURIComponent(orderId)}`;
      const result = await iyzicoInit(creds, order, items, settings, callback, clientIp);
      if (result.error) return res.status(502).json({ error: result.error });
      await orderRef.update({ payment_token: result.token, updated_at: new Date().toISOString() });
      return res.json({ mode: "live", provider, paymentPageUrl: result.paymentPageUrl, token: result.token });
    }
    const result = await paytrInit(creds, order, items, clientIp);
    if (result.error) return res.status(502).json({ error: result.error });
    await orderRef.update({ payment_token: result.merchantOid, updated_at: new Date().toISOString() });
    return res.json({ mode: "live", provider, iframeUrl: result.iframeUrl });
  } catch (err) {
    logger.error("paymentInit failed", err);
    res.status(502).json({ error: "Ödeme sağlayıcısına ulaşılamadı, lütfen tekrar deneyin" });
  }
});

/* ================= iyzico dönüş adresi ================= */
exports.paymentCallbackIyzico = onRequest({ secrets: [POS_SECRET], invoker: "public" }, async (req, res) => {
  const orderId = String(req.query.order || "");
  try {
    const orderRef = db.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();
    const token = String((req.body && req.body.token) || req.query.token || "");
    if (!orderSnap.exists || !token || orderSnap.data().payment_token !== token) {
      return res.redirect(302, `${STORE_URL}?payment=fail&order=${encodeURIComponent(orderSnap.exists ? orderSnap.data().order_no : "")}`);
    }
    const order = orderSnap.data();
    const credSnap = await db.collection("pos_credentials").doc("iyzico").get();
    const creds = credSnap.exists ? decryptCredentials(POS_SECRET.value(), credSnap.data().data) : null;
    if (!creds) return res.redirect(302, `${STORE_URL}?payment=fail&order=${encodeURIComponent(order.order_no)}`);
    const result = await iyzicoRetrieve(creds, token, orderId);
    const success = result.status === "success" && result.paymentStatus === "SUCCESS";
    if (success) await orderRef.update({ payment_status: "paid", updated_at: new Date().toISOString() });
    await db.collection("audit").add({ actor: "iyzico", action: success ? "payment.completed" : "payment.failed", entity_type: "order", entity_id: orderId, created_at: new Date().toISOString() });
    res.redirect(302, `${STORE_URL}?payment=${success ? "success" : "fail"}&order=${encodeURIComponent(order.order_no)}`);
  } catch (err) {
    logger.error("paymentCallbackIyzico failed", err);
    res.redirect(302, `${STORE_URL}?payment=fail`);
  }
});

/* ================= PayTR bildirimi ================= */
exports.paymentWebhookPaytr = onRequest({ secrets: [POS_SECRET], invoker: "public" }, async (req, res) => {
  try {
    const credSnap = await db.collection("pos_credentials").doc("paytr").get();
    if (!credSnap.exists) return res.send("OK");
    const creds = decryptCredentials(POS_SECRET.value(), credSnap.data().data);
    if (!creds) return res.send("OK");
    const { merchant_oid: merchantOid, status, total_amount: totalAmount, hash } = req.body || {};
    const { hmacB64 } = require("./posCrypto");
    const expected = hmacB64(String(merchantOid) + creds.merchantSalt + status + totalAmount, creds.merchantKey);
    if (!constantEqual(hash, expected)) return res.status(400).send("PAYTR notification failed: bad hash");
    const snap = await db.collection("orders").where("payment_token", "==", merchantOid).limit(1).get();
    if (!snap.empty) {
      const doc = snap.docs[0];
      if (status === "success") {
        await doc.ref.update({ payment_status: "paid", updated_at: new Date().toISOString() });
        await db.collection("audit").add({ actor: "paytr", action: "payment.completed", entity_type: "order", entity_id: doc.id, created_at: new Date().toISOString() });
      } else {
        await db.collection("audit").add({ actor: "paytr", action: "payment.failed", entity_type: "order", entity_id: doc.id, created_at: new Date().toISOString() });
      }
    }
    res.send("OK");
  } catch (err) {
    logger.error("paymentWebhookPaytr failed", err);
    res.send("OK");
  }
});
