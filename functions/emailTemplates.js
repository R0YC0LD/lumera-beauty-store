const BRAND = "#221610", ACCENT = "#c2622f", CREAM = "#f9f4ed";
const STORE_URL = "https://lumrea.com/";

function money(n) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(Number(n) || 0);
}

function shell(title, bodyHtml) {
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"></head>
  <body style="margin:0;padding:32px 16px;background:${CREAM};font-family:Georgia,'Times New Roman',serif;color:${BRAND}">
    <div style="max-width:520px;margin:0 auto;background:#fffdf9;border:1px solid #eadfd0;border-radius:14px;overflow:hidden">
      <div style="background:${BRAND};color:#f6ede2;padding:22px 28px;font-size:20px;letter-spacing:3px;font-weight:600">LUMREA</div>
      <div style="padding:28px">
        <h1 style="font-size:19px;margin:0 0 14px;font-weight:600">${title}</h1>
        ${bodyHtml}
      </div>
      <div style="padding:18px 28px;background:${CREAM};color:#94816f;font-size:11px;font-family:Arial,sans-serif">
        © ${new Date().getFullYear()} LUMREA Giyim — <a href="${STORE_URL}" style="color:${ACCENT}">lumrea.com</a>
      </div>
    </div>
  </body></html>`;
}

function itemsTable(items) {
  const rows = (items || []).map(i =>
    `<tr><td style="padding:6px 0;border-bottom:1px solid #eadfd0;font-family:Arial,sans-serif;font-size:13px">${esc(i.product_name || i.name || "")} <b>[${esc(i.size || "")}]</b> × ${i.quantity}</td>
     <td style="padding:6px 0;border-bottom:1px solid #eadfd0;text-align:right;font-family:Arial,sans-serif;font-size:13px">${money((i.unit_price ?? i.unitPrice ?? 0) * i.quantity)}</td></tr>`
  ).join("");
  return `<table style="width:100%;border-collapse:collapse;margin:14px 0">${rows}</table>`;
}
function esc(v) { return String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function p(text) { return `<p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;margin:0 0 12px">${text}</p>`; }

const STATUS_LABEL = { new: "Alındı", preparing: "Hazırlanıyor", shipped: "Kargoda", complete: "Teslim edildi", cancelled: "İptal edildi" };

function orderTemplates(order) {
  const name = esc(order.customer?.firstName || "Değerli müşterimiz");
  const orderNo = esc(order.order_no || "");
  const common = `${p(`Merhaba ${name},`)}${p(`Sipariş numaran: <b>${orderNo}</b>`)}`;
  return {
    new: {
      subject: `Siparişin alındı — ${orderNo}`,
      html: shell("Siparişin alındı ✓", `${common}${p("Siparişini aldık, en kısa sürede hazırlamaya başlıyoruz.")}${itemsTable(order.items)}${p(`<b>Toplam: ${money(order.total)}</b>`)}`)
    },
    preparing: {
      subject: `Siparişin hazırlanıyor — ${orderNo}`,
      html: shell("Siparişin hazırlanıyor", `${common}${p("Siparişin şu anda özenle hazırlanıyor, kargoya verildiğinde tekrar haber vereceğiz.")}`)
    },
    shipped: {
      subject: `Siparişin kargoda — ${orderNo}`,
      html: shell("Siparişin kargoda 🚚", `${common}${p("Siparişin kargoya teslim edildi, yakında sana ulaşacak.")}`)
    },
    complete: {
      subject: `Siparişin teslim edildi — ${orderNo}`,
      html: shell("Afiyetle kullan ✓", `${common}${p("Siparişinin teslim edildiğini görüyoruz. Bizi tercih ettiğin için teşekkür ederiz — deneyimini bir yorumla paylaşmak ister misin?")}<p style="text-align:center;margin:18px 0"><a href="${STORE_URL}" style="display:inline-block;background:${BRAND};color:#faf3e9;text-decoration:none;font-family:Arial,sans-serif;font-weight:700;font-size:13px;padding:12px 22px;border-radius:999px">Mağazaya dön →</a></p>`)
    },
    cancelled: {
      subject: `Siparişin iptal edildi — ${orderNo}`,
      html: shell("Siparişin iptal edildi", `${common}${p("Siparişin iptal edildi. Ödemen alınmışsa iadesi birkaç iş günü içinde hesabına yansıyacaktır. Sorularınız için bize ulaşabilirsiniz.")}`)
    },
    paid: {
      subject: `Ödemen alındı — ${orderNo}`,
      html: shell("Ödemen onaylandı ✓", `${common}${p("Ödemen başarıyla alındı, siparişin hazırlık sürecine geçiyor.")}${p(`<b>Toplam: ${money(order.total)}</b>`)}`)
    }
  };
}

function campaignTemplate({ subject, message }) {
  return shell(esc(subject), `${message}<p style="text-align:center;margin:22px 0"><a href="${STORE_URL}" style="display:inline-block;background:${BRAND};color:#faf3e9;text-decoration:none;font-family:Arial,sans-serif;font-weight:700;font-size:13px;padding:12px 22px;border-radius:999px">Mağazayı görüntüle →</a></p>`);
}

module.exports = { orderTemplates, campaignTemplate, STATUS_LABEL, esc, money };
