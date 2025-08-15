PRAGMA foreign_keys = ON;

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  google_id TEXT UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','admin')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_users_updated_at
AFTER UPDATE ON users
FOR EACH ROW BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- DEALS
CREATE TABLE IF NOT EXISTS deals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  teaser TEXT,
  description_md TEXT,
  fine_print_md TEXT,
  category TEXT NOT NULL CHECK(category IN ('hotel','restaurant','experience')),
  subcategory TEXT,
  tags TEXT,
  image_url TEXT,
  city TEXT,
  location_text TEXT,
  lat REAL,
  lng REAL,
  publish_at DATETIME,
  start_at DATETIME,
  end_at DATETIME,
  is_active INTEGER NOT NULL DEFAULT 1,
  featured_rank INTEGER,
  list_price_cents INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS trg_deals_updated_at
AFTER UPDATE ON deals
FOR EACH ROW BEGIN
  UPDATE deals SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE INDEX IF NOT EXISTS idx_deals_category ON deals(category);
CREATE INDEX IF NOT EXISTS idx_deals_featured_rank ON deals(featured_rank);

-- DEAL OPTIONS
CREATE TABLE IF NOT EXISTS deal_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  price_cents INTEGER NOT NULL,
  original_price_cents INTEGER,
  total_stock INTEGER,
  sold_count INTEGER NOT NULL DEFAULT 0,
  per_user_limit INTEGER NOT NULL DEFAULT 2,
  min_qty INTEGER NOT NULL DEFAULT 1,
  max_qty INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(deal_id, name)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_deal_options_sku ON deal_options(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deal_options_deal_id ON deal_options(deal_id);

CREATE TRIGGER IF NOT EXISTS trg_deal_options_updated_at
AFTER UPDATE ON deal_options
FOR EACH ROW BEGIN
  UPDATE deal_options SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- ORDERS
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'created' CHECK(status IN ('created','paid','canceled','expired','refunded')),
  currency TEXT NOT NULL DEFAULT 'usd',
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  stripe_payment_intent_id TEXT,
  stripe_session_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE TRIGGER IF NOT EXISTS trg_orders_updated_at
AFTER UPDATE ON orders
FOR EACH ROW BEGIN
  UPDATE orders SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  deal_option_id INTEGER NOT NULL REFERENCES deal_options(id) ON DELETE CASCADE,
  qty INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  original_price_cents INTEGER,
  deal_title_snapshot TEXT NOT NULL,
  option_name_snapshot TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_deal_id ON order_items(deal_id);

-- FUTURE: additional tables (sessions, payments, etc.)
