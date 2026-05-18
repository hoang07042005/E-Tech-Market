-- PostgreSQL schema for the E-Tech Market app
-- Includes: categories, products, product_images, product_specs
--           users/roles, carts/cart_items, orders/order_items
--           shipping_methods, payments, transactions
--           reviews, coupons/coupon_usage
--           inventory, wishlists, notifications
--
-- Notes:
-- - This script targets the `public` schema.
-- - Timestamp columns use Laravel-friendly naming: created_at, updated_at.
-- - Laravel migrations can be generated later from this schema if you prefer code-first.

BEGIN;

-- Useful for case-insensitive email comparisons (optional).
-- CREATE EXTENSION IF NOT EXISTS citext;

-- ------------------------------------------------------------
-- 1) Product categories & products
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  parent_id BIGINT NULL REFERENCES categories(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  description TEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);

CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  brand VARCHAR(255) NULL,
  description TEXT NULL,
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  main_image_url TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

CREATE TABLE IF NOT EXISTS product_images (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text VARCHAR(255) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_images_product_primary
  ON product_images(product_id)
  WHERE is_primary = TRUE;

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);

CREATE TABLE IF NOT EXISTS product_specs (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_variant_id BIGINT NULL REFERENCES product_variants(id) ON DELETE SET NULL,
  spec_group VARCHAR(100) NULL, -- e.g. "CPU", "Memory", "Display"
  spec_key VARCHAR(255) NOT NULL, -- e.g. "CPU", "RAM", "Screen"
  spec_value TEXT NOT NULL, -- e.g. "i7-13700H"
  spec_unit VARCHAR(50) NULL, -- e.g. "GB", "GHz", "inch"
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_specs_product_id ON product_specs(product_id);
CREATE INDEX IF NOT EXISTS idx_product_specs_variant_id ON product_specs(product_variant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_specs_variant_scope
  ON product_specs (product_id, spec_group, spec_key, (COALESCE(product_variant_id, (-1)::bigint)));

-- ------------------------------------------------------------
-- 2) Users & roles
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS roles (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE, -- admin, staff, customer...
  slug VARCHAR(120) NOT NULL UNIQUE,
  description TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NULL,
  address_line TEXT NULL,
  province VARCHAR(100) NULL,
  district VARCHAR(100) NULL,
  ward VARCHAR(100) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  email_verified_at TIMESTAMPTZ NULL,
  remember_token VARCHAR(100) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

-- ------------------------------------------------------------
-- 3) Carts & Orders
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS carts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','converted','expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cart_items (
  cart_id BIGINT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id BIGINT NULL REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0), -- price at the time of adding to cart
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cart_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_variant_id ON cart_items(variant_id);

CREATE TABLE IF NOT EXISTS shipping_methods (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE, -- Giao hàng nhanh, tiết kiệm...
  description TEXT NULL,
  base_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (base_fee >= 0),
  estimated_days_min INT NULL CHECK (estimated_days_min IS NULL OR estimated_days_min >= 0),
  estimated_days_max INT NULL CHECK (estimated_days_max IS NULL OR estimated_days_max >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coupons (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  coupon_type VARCHAR(20) NOT NULL
    CHECK (coupon_type IN ('percentage','fixed')),
  value NUMERIC(12,2) NOT NULL CHECK (value > 0),
  min_order_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (min_order_amount >= 0),
  start_at TIMESTAMPTZ NULL,
  end_at TIMESTAMPTZ NULL,
  max_uses INT NULL CHECK (max_uses IS NULL OR max_uses >= 0),
  max_uses_per_user INT NULL CHECK (max_uses_per_user IS NULL OR max_uses_per_user >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  order_code VARCHAR(50) NOT NULL UNIQUE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  cart_id BIGINT NULL REFERENCES carts(id) ON DELETE SET NULL,

  coupon_id BIGINT NULL REFERENCES coupons(id) ON DELETE SET NULL,
  shipping_method_id BIGINT NULL REFERENCES shipping_methods(id) ON DELETE SET NULL,

  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','processing','shipped','delivered','cancelled','returned')),
  payment_status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending','paid','failed','refunded','cancelled')),

  currency CHAR(3) NOT NULL DEFAULT 'VND',
  subtotal_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (subtotal_amount >= 0),
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  shipping_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),

  shipping_name VARCHAR(255) NOT NULL,
  shipping_phone VARCHAR(30) NOT NULL,
  shipping_address_line TEXT NOT NULL,
  shipping_province VARCHAR(100) NULL,
  shipping_district VARCHAR(100) NULL,
  shipping_ward VARCHAR(100) NULL,

  notes TEXT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id BIGINT NULL REFERENCES product_variants(id) ON DELETE SET NULL,

  product_name_snapshot VARCHAR(255) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0), -- price at the time of ordering
  total_price NUMERIC(12,2) NOT NULL CHECK (total_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON order_items(variant_id);

CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,

  method VARCHAR(50) NOT NULL, -- cod, bank_transfer, momo, vnpay...
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'VND',

  transaction_code VARCHAR(100) NULL UNIQUE, -- provider code if available
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','failed','refunded','cancelled')),

  paid_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  payment_id BIGINT NULL REFERENCES payments(id) ON DELETE CASCADE,

  provider VARCHAR(80) NULL, -- gateway/provider name
  provider_transaction_id VARCHAR(120) NULL UNIQUE,

  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'VND',
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','success','failed','refunded','cancelled')),

  raw_response JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_payment_id ON transactions(payment_id);

-- ------------------------------------------------------------
-- 5) Reviews, coupons usage
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS reviews (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id BIGINT NULL REFERENCES orders(id) ON DELETE SET NULL,

  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  exp_performance SMALLINT NULL CHECK (exp_performance >= 1 AND exp_performance <= 5),
  exp_battery SMALLINT NULL CHECK (exp_battery >= 1 AND exp_battery <= 5),
  exp_camera SMALLINT NULL CHECK (exp_camera >= 1 AND exp_camera <= 5),
  comment TEXT NULL,

  status VARCHAR(30) NOT NULL DEFAULT 'approved'
    CHECK (status IN ('pending','approved','rejected')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_reviews_user_product
  ON reviews(user_id, product_id);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);

CREATE TABLE IF NOT EXISTS coupon_usage (
  id BIGSERIAL PRIMARY KEY,
  coupon_id BIGINT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id BIGINT NULL REFERENCES orders(id) ON DELETE CASCADE,

  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),

  -- Prevent multiple usage records for the same coupon on one order.
  CONSTRAINT uq_coupon_usage_order UNIQUE (coupon_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user_id ON coupon_usage(user_id);

-- ------------------------------------------------------------
-- 6) Inventory
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS inventory (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_code VARCHAR(255) NOT NULL DEFAULT 'default',
  quantity_on_hand INT NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  reorder_level INT NOT NULL DEFAULT 10 CHECK (reorder_level >= 0),
  last_stock_in_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_inventory_product_location UNIQUE (product_id, location_code)
);

CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  inventory_id BIGINT NULL REFERENCES inventory(id) ON DELETE SET NULL,
  location_code VARCHAR(255) NOT NULL DEFAULT 'main',
  quantity_change INT NOT NULL,
  quantity_after INT NOT NULL CHECK (quantity_after >= 0),
  reason VARCHAR(64) NOT NULL DEFAULT 'sync_from_variants',
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product_id ON inventory_transactions(product_id);

-- ------------------------------------------------------------
-- 7) Wishlists & notifications
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS wishlists (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_wishlists_user_product UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL, -- order_confirmed, shipped, delivered...
  title VARCHAR(255) NULL,
  body TEXT NULL,
  data JSONB NULL,
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);

-- ------------------------------------------------------------
-- Product shop Q&A (khách đặt câu hỏi — cửa hàng trả lời qua admin)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS product_shop_qnas (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  asker_display_name VARCHAR(120) NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NULL,
  answered_at TIMESTAMPTZ NULL,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_shop_qnas_product ON product_shop_qnas (product_id, answered_at DESC);

-- ------------------------------------------------------------
-- Blog posts, comments & newsletter
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS blog_categories (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id BIGSERIAL PRIMARY KEY,
  blog_category_id BIGINT NULL REFERENCES blog_categories(id) ON DELETE SET NULL,
  author_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  excerpt TEXT NULL,
  content TEXT NOT NULL,
  thumbnail_url TEXT NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  views BIGINT NOT NULL DEFAULT 0,
  reading_time SMALLINT NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ NULL,
  meta_title VARCHAR(255) NULL,
  meta_description VARCHAR(255) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(is_published, published_at DESC);

CREATE TABLE IF NOT EXISTS blog_comments (
  id BIGSERIAL PRIMARY KEY,
  blog_post_id BIGINT NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  author_name VARCHAR(120) NOT NULL,
  author_email VARCHAR(255) NULL,
  content TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'approved'
    CHECK (status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_blog_comments_post_status ON blog_comments(blog_post_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  source VARCHAR(80) NULL,
  subscribed_at TIMESTAMPTZ NULL,
  unsubscribed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Laravel Sanctum (for /api/auth/login & /api/auth/register tokens)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS personal_access_tokens (
  id BIGSERIAL PRIMARY KEY,
  tokenable_type VARCHAR(255) NOT NULL,
  tokenable_id BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  abilities TEXT NULL,
  last_used_at TIMESTAMPTZ NULL,
  expires_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
