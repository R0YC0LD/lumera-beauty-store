-- v3: detaylı ürün alanları + POS kimlik bilgileri + ödeme takibi
ALTER TABLE products ADD COLUMN image_url TEXT;
ALTER TABLE products ADD COLUMN cost INTEGER;
ALTER TABLE products ADD COLUMN variants TEXT NOT NULL DEFAULT '[]';
ALTER TABLE products ADD COLUMN critical_stock INTEGER NOT NULL DEFAULT 20;
ALTER TABLE orders ADD COLUMN payment_token TEXT;
ALTER TABLE orders ADD COLUMN paid_at TEXT;

CREATE TABLE IF NOT EXISTS pos_credentials (
  provider TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS orders_ptoken_idx ON orders(payment_token);
