PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS store_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  category TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  price INTEGER NOT NULL,
  old_price INTEGER,
  stock INTEGER NOT NULL DEFAULT 0,
  rating REAL NOT NULL DEFAULT 5,
  badge TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  tone TEXT NOT NULL DEFAULT '#ead7cf',
  accent TEXT NOT NULL DEFAULT '#fff5ef',
  color TEXT NOT NULL DEFAULT '#eaa084',
  description TEXT NOT NULL DEFAULT '',
  ingredients TEXT NOT NULL DEFAULT '',
  usage TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  cost INTEGER,
  variants TEXT NOT NULL DEFAULT '[]',
  critical_stock INTEGER NOT NULL DEFAULT 20,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  order_count INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  marketing_consent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_no TEXT NOT NULL UNIQUE,
  customer_id TEXT,
  customer_json TEXT NOT NULL,
  total INTEGER NOT NULL,
  discount INTEGER NOT NULL DEFAULT 0,
  coupon_code TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  shipping_address TEXT NOT NULL,
  payment_token TEXT,
  paid_at TEXT,
  consent_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  unit_price INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  email TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'active',
  consent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source TEXT NOT NULL DEFAULT 'storefront'
);

CREATE TABLE IF NOT EXISTS pos_credentials (
  provider TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS products_category_idx ON products(category, active);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_created_idx ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS reviews_product_idx ON reviews(product_id, status);
CREATE INDEX IF NOT EXISTS reviews_status_idx ON reviews(status, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_ptoken_idx ON orders(payment_token);

INSERT OR IGNORE INTO store_settings(key,value) VALUES
('store','{"announcement":"₺1.000 ve üzeri alışverişlerde kargo bizden · 14.00''e kadar aynı gün gönderim","heroEyebrow":"YENİ NESİL GÜZELLİK SEÇKİSİ","heroTitle":"Işığını bul.|Ritüelini yarat.","heroCopy":"Cildini dinleyen, dünyaya nazik ve sonuçlarıyla güçlü seçkiler.","shippingThreshold":1000,"loyaltyRate":5,"provider":"iyzico","threeDSecure":true,"testMode":true,"bankTransfer":true,"cashOnDelivery":false,"installments":[2,3,6,9],"seoTitle":"Luméra — Işığını Bul","seoDescription":"Seçilmiş güzellik ritüelleri ve güvenli alışveriş deneyimi."}');

INSERT OR IGNORE INTO products(id,name,brand,category,sku,price,old_price,stock,rating,badge,tags,tone,accent,color,description,ingredients,usage) VALUES
('p1','Barrier Cloud Nem Kremi','Aster Lab','Cilt Bakımı','AST-BC-50',649,799,46,4.9,'Çok Satan','["bestseller","sale"]','#f1dfd6','#fff5ef','#eaa084','Seramid desteğiyle cilt bariyerini konforla buluşturan yoğun nem kremi.','Seramid NP, skualan, panthenol','Sabah ve akşam temiz cilde uygulayın.'),
('p2','Dew Drop Peptit Serum','Noa Rituals','Cilt Bakımı','NOA-DD-30',729,NULL,28,4.8,'Yeni','["new"]','#e3dcef','#f8f4ff','#c2b3df','Dolgun ve canlı görünüm için çoklu peptit serumu.','Peptit kompleksi, hyalüronik asit','Nemli cilde 2–3 damla uygulayın.'),
('p3','Velvet Tint 04 — Guava','Mori','Makyaj','MOR-VT-04',419,499,71,4.7,'%16','["sale"]','#ead3d7','#ffeef0','#ef6f79','Kadifemsi renk bırakan katmanlanabilir likit tint.','Jojoba esteri, E vitamini','Aplikatörle uygulayın.'),
('p4','Solar Veil SPF 50+','Serein','Güneş','SER-SV-50',589,NULL,19,4.9,'Editörün Seçimi','["bestseller"]','#f6e4b8','#fff6dc','#f0cb69','Beyaz iz bırakmayan geniş spektrumlu güneş koruyucu.','Yeni nesil UV filtreleri, niasinamid','Güneşe çıkmadan önce uygulayın.'),
('p5','Neroli Skin Parfüm','Maison Lune','Parfüm','MLU-NS-50',1190,NULL,15,4.8,'İmza Koku','["new"]','#ead9d1','#fff1ea','#c88e76','Neroli ve temiz misk notalı modern imza koku.','Neroli, beyaz çay, temiz misk','Nabız noktalarına uygulayın.'),
('p6','Silk Reset Saç Maskesi','Onda','Saç Bakımı','OND-SR-200',539,620,37,4.6,'Fırsat','["sale"]','#dce5da','#f2f7ef','#93a58d','Yıpranmış saçlara parlaklık kazandıran bakım maskesi.','Pirinç proteini, amino asit','5 dakika bekletip durulayın.'),
('p7','Soft Melt Temizleme Balmı','Aster Lab','Cilt Bakımı','AST-SM-90',489,NULL,52,4.9,'Çok Satan','["bestseller"]','#eee8df','#fffaf3','#dcc2a5','Makyaj ve SPF kalıntılarını nazikçe çözen balm.','Yulaf yağı, bisabolol','Kuru cilde masaj yapıp durulayın.'),
('p8','Moon Milk Vücut Losyonu','Noa Rituals','Vücut','NOA-MM-250',445,NULL,33,4.7,'Yeni','["new"]','#dce7ef','#eef8ff','#9ebfd4','Hızla emilen rahatlatıcı vücut losyonu.','Shea yağı, süt proteini','Duş sonrası uygulayın.');
