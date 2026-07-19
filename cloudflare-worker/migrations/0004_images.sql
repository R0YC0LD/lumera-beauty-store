-- v4: ürün görselleri (D1 içinde saklanır, Worker üzerinden önbellekli servis edilir)
CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'image/webp',
  size INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
