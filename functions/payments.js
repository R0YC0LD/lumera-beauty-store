const { hmacHex, hmacB64 } = require("./posCrypto");

const STORE_URL = "https://lumrea.com/";

async function iyzicoAuthHeader(creds, uriPath, requestBody) {
  const randomKey = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  const signature = hmacHex(randomKey + uriPath + requestBody, creds.secretKey);
  const authorization = `apiKey:${creds.apiKey}&randomKey:${randomKey}&signature:${signature}`;
  return `IYZWSv2 ${Buffer.from(authorization).toString("base64")}`;
}

async function iyzicoInit(creds, order, items, settings, callbackUrl, clientIp) {
  const base = creds.sandbox ? "https://sandbox-api.iyzipay.com" : "https://api.iyzipay.com";
  const uriPath = "/payment/iyzipos/checkoutform/initialize/auth/ecom";
  const price = Number(order.total).toFixed(1);
  const customer = order.customer || {};
  const gross = Math.max(1, Number(order.total) + Number(order.discount || 0));
  let allocated = 0;
  const basketItems = items.map((item, index) => {
    const share = index === items.length - 1
      ? Number((order.total - allocated).toFixed(2))
      : Number((item.unit_price * item.quantity * order.total / gross).toFixed(2));
    allocated = Number((allocated + share).toFixed(2));
    return { id: item.product_id || item.id || "urun", name: item.product_name || item.name, category1: "Giyim", itemType: "PHYSICAL", price: share.toFixed(2) };
  });
  const payload = JSON.stringify({
    locale: "tr", conversationId: order.id, price, paidPrice: price, currency: "TRY", basketId: order.order_no,
    paymentGroup: "PRODUCT", callbackUrl,
    enabledInstallments: Array.isArray(settings.installments) && settings.installments.length ? settings.installments : [1],
    buyer: { id: "guest", name: customer.firstName || "Misafir", surname: customer.lastName || "Müşteri", gsmNumber: customer.phone || "", email: customer.email || "", identityNumber: "11111111111", registrationAddress: order.shipping_address || "", ip: clientIp, city: customer.city || "İstanbul", country: "Turkey" },
    shippingAddress: { contactName: `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "Müşteri", city: customer.city || "İstanbul", country: "Turkey", address: order.shipping_address || "" },
    billingAddress: { contactName: `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "Müşteri", city: customer.city || "İstanbul", country: "Turkey", address: order.shipping_address || "" },
    basketItems
  });
  const header = await iyzicoAuthHeader(creds, uriPath, payload);
  const response = await fetch(base + uriPath, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": header }, body: payload });
  const result = await response.json().catch(() => ({}));
  if (result.status !== "success") return { error: result.errorMessage || "iyzico ödeme başlatılamadı" };
  return { token: result.token, paymentPageUrl: result.paymentPageUrl || null };
}

async function iyzicoRetrieve(creds, token, conversationId) {
  const base = creds.sandbox ? "https://sandbox-api.iyzipay.com" : "https://api.iyzipay.com";
  const uriPath = "/payment/iyzipos/checkoutform/auth/ecom/detail";
  const payload = JSON.stringify({ locale: "tr", conversationId, token });
  const header = await iyzicoAuthHeader(creds, uriPath, payload);
  const response = await fetch(base + uriPath, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": header }, body: payload });
  return response.json().catch(() => ({}));
}

async function paytrInit(creds, order, items, clientIp) {
  const merchantOid = String(order.order_no).replace(/[^A-Za-z0-9]/g, "");
  const amount = String(Math.round(order.total * 100));
  const customer = order.customer || {};
  const basket = Buffer.from(JSON.stringify(items.map(i => [i.product_name || i.name, String(i.unit_price ?? i.unitPrice ?? 0), i.quantity]))).toString("base64");
  const noInstallment = "0", maxInstallment = "0", currency = "TL", testMode = "0";
  const hashStr = creds.merchantId + clientIp + merchantOid + (customer.email || "") + amount + basket + noInstallment + maxInstallment + currency + testMode;
  const paytrToken = hmacB64(hashStr + creds.merchantSalt, creds.merchantKey);
  const form = new URLSearchParams({
    merchant_id: creds.merchantId, user_ip: clientIp, merchant_oid: merchantOid, email: customer.email || "",
    payment_amount: amount, paytr_token: paytrToken, user_basket: basket, debug_on: "0", no_installment: noInstallment,
    max_installment: maxInstallment, user_name: `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "Müşteri",
    user_address: order.shipping_address || "", user_phone: customer.phone || "", currency,
    merchant_ok_url: `${STORE_URL}?payment=success&order=${encodeURIComponent(order.order_no)}`,
    merchant_fail_url: `${STORE_URL}?payment=fail&order=${encodeURIComponent(order.order_no)}`,
    timeout_limit: "30", test_mode: testMode
  });
  const response = await fetch("https://www.paytr.com/odeme/api/get-token", { method: "POST", body: form });
  const result = await response.json().catch(() => ({}));
  if (result.status !== "success") return { error: result.reason || "PayTR ödeme başlatılamadı" };
  return { iframeUrl: `https://www.paytr.com/odeme/guvenli/${result.token}`, merchantOid };
}

module.exports = { iyzicoInit, iyzicoRetrieve, paytrInit };
