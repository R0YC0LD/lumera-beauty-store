const crypto = require("node:crypto");

function deriveKey(secret) {
  return crypto.createHash("sha256").update(`${secret}|pos-credentials`).digest();
}

function encryptCredentials(secret, obj) {
  const iv = crypto.randomBytes(12);
  const key = deriveKey(secret);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(obj), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({ iv: iv.toString("base64"), data: Buffer.concat([enc, tag]).toString("base64") });
}

function decryptCredentials(secret, text) {
  try {
    const { iv, data } = JSON.parse(text);
    const key = deriveKey(secret);
    const raw = Buffer.from(data, "base64");
    const tag = raw.subarray(raw.length - 16);
    const enc = raw.subarray(0, raw.length - 16);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return JSON.parse(dec.toString("utf8"));
  } catch {
    return null;
  }
}

function hmacHex(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}
function hmacB64(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64");
}
function constantEqual(a, b) {
  const ba = Buffer.from(String(a)), bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

module.exports = { encryptCredentials, decryptCredentials, hmacHex, hmacB64, constantEqual };
