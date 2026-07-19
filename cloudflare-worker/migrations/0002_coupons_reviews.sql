-- v2: kupon ve yorum tabloları + sipariş indirim alanları
ALTER TABLE orders ADD COLUMN discount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN coupon_code TEXT;

CREATE TABLE IF NOT EXISTS coupons (
  code TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'percent',
  value INTEGER NOT NULL DEFAULT 0,
  min_total INTEGER NOT NULL DEFAULT 0,
  starts_at TEXT,
  ends_at TEXT,
  usage_limit INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS reviews_product_idx ON reviews(product_id, status);
CREATE INDEX IF NOT EXISTS reviews_status_idx ON reviews(status, created_at DESC);
