-- Seed data for PostgreSQL (dev/testing)
-- WARNING: This script TRUNCATEs ecommerce tables and RESTARTs identities.

BEGIN;

TRUNCATE TABLE
  notifications,
  coupon_usage,
  transactions,
  payments,
  order_items,
  orders,
  cart_items,
  carts,
  reviews,
  wishlists,
  product_specs,
  product_images,
  inventory,
  coupons,
  shipping_methods,
  products,
  product_variants,
  categories,
  model_has_roles,
  roles,
  users
RESTART IDENTITY CASCADE;

-- ------------------------------------------------------------
-- Roles
-- ------------------------------------------------------------
INSERT INTO roles (id, name, slug, description, guard_name, created_at, updated_at) VALUES
  (1, 'admin', 'admin', 'Quản trị hệ thống', 'api', now(), now()),
  (2, 'staff', 'staff', 'Nhân viên bán hàng/CSKH', 'api', now(), now()),
  (3, 'customer', 'customer', 'Khách hàng', 'api', now(), now());

-- ------------------------------------------------------------
-- Users (password hash for "123456")
-- ------------------------------------------------------------
INSERT INTO users (
  id, name, email, password, phone, address_line, province, district, ward,
  is_active, email_verified_at, remember_token, created_at, updated_at
) VALUES
  (1, 'Admin E-Tech', 'admin@etech.com',
   '$2y$10$8f8JuFJ..PD0vYPTMMnxeOpq3QRUNz/5xi6Wtt82nZ6xcXHgEorIm',
   '0901000001', '12 Đường A', 'Hà Nội', 'Cầu Giấy', 'Dịch Vọng', true, now(), NULL, now(), now()),
  (2, 'Nhân viên E-Tech', 'staff@etech.com',
   '$2y$10$8f8JuFJ..PD0vYPTMMnxeOpq3QRUNz/5xi6Wtt82nZ6xcXHgEorIm',
   '0901000002', '34 Đường B', 'TP.HCM', 'Thủ Đức', 'Linh Trung', true, now(), NULL, now(), now()),
  (3, 'Khách hàng E-Tech', 'customer@etech.com',
   '$2y$10$8f8JuFJ..PD0vYPTMMnxeOpq3QRUNz/5xi6Wtt82nZ6xcXHgEorIm',
   '0901000003', '56 Đường C', 'Đà Nẵng', 'Hải Châu', 'Thạch Thang', true, now(), NULL, now(), now());

INSERT INTO model_has_roles (role_id, model_type, model_id) VALUES
  (1, 'App\Models\User', 1),
  (2, 'App\Models\User', 2),
  (3, 'App\Models\User', 3);

-- ------------------------------------------------------------
-- Categories
-- ------------------------------------------------------------
INSERT INTO categories (id, parent_id, name, slug, description, sort_order, is_active, created_at, updated_at, deleted_at) VALUES
  (1, NULL, 'Điện tử', 'dien-tu', 'Nhóm sản phẩm điện tử', 0, true, now(), now(), NULL),
  (2, 1, 'Điện thoại', 'dien-thoai', 'Smartphone & accessories', 10, true, now(), now(), NULL),
  (3, 1, 'Laptop', 'laptop', 'Máy tính xách tay', 20, true, now(), now(), NULL),
  (4, 1, 'Phụ kiện', 'phu-kien', 'Ốp lưng, cáp, tai nghe...', 30, true, now(), now(), NULL);

-- ------------------------------------------------------------
-- Products
-- ------------------------------------------------------------
INSERT INTO products (
  id, category_id, name, slug, brand, description, main_image_url, is_active, created_at, updated_at, deleted_at
) VALUES
  (1, 2, 'iPhone 15 Pro 256GB', 'iphone-15-pro-256gb', 'Apple',
   'Thiết kế cao cấp, hiệu năng mạnh mẽ.',
   '/uploads/products/iphone15pro-main.jpg', true, now(), now(), NULL),
  (2, 3, 'MacBook Air M3 13-inch 16GB/512GB', 'macbook-air-m3-13-16gb-512gb', 'Apple',
   'M3 mạnh mẽ, mỏng nhẹ, pin tốt.',
   '/uploads/products/macbookair-m3-main.jpg', true, now(), now(), NULL),
  (3, 4, 'Ốp lưng chống sốc iPhone 15 Pro', 'op-lung-chong-soc-iphone-15-pro', 'Generic',
   'Chống sốc, chống trầy, ôm máy chắc chắn.',
   '/uploads/products/case-iphone15pro-main.jpg', true, now(), now(), NULL),
  (4, 2, 'Samsung Galaxy S24 Ultra 256GB', 'galaxy-s24-ultra-256gb', 'Samsung',
   'Camera ấn tượng, màn hình lớn, bền bỉ.',
   '/uploads/products/s24ultra-main.jpg', true, now(), now(), NULL);

-- ------------------------------------------------------------
-- Product variants
-- ------------------------------------------------------------
INSERT INTO product_variants (
  id, product_id, variant_name, color, configuration, sku, price, stock_quantity, image_url, is_active, created_at, updated_at
) VALUES
  (1, 1, 'iPhone 15 Pro 256GB - Titan Tự Nhiên', 'Titan Tự Nhiên', '256GB', 'IP15P-256-NAT', 8000000.00, 50, '/uploads/products/iphone15pro-main.jpg', true, now(), now()),
  (2, 2, 'MacBook Air M3 - Midnight', 'Midnight', '16GB RAM, 512GB SSD', 'MBA-M3-16-512-MID', 15000000.00, 20, '/uploads/products/macbookair-m3-main.jpg', true, now(), now()),
  (3, 3, 'Ốp lưng chống sốc iPhone 15 Pro - Đen', 'Đen', 'Tiêu chuẩn', 'OP-IP15P-BLK', 200000.00, 200, '/uploads/products/case-iphone15pro-main.jpg', true, now(), now()),
  (4, 4, 'Samsung Galaxy S24 Ultra 256GB - Xám', 'Xám', '256GB', 'S24U-256-GRY', 12000000.00, 30, '/uploads/products/s24ultra-main.jpg', true, now(), now());

-- ------------------------------------------------------------
-- Product images
-- ------------------------------------------------------------
INSERT INTO product_images (id, product_id, image_url, alt_text, sort_order, is_primary, created_at) VALUES
  (1, 1, '/uploads/products/iphone15pro-1.jpg', 'iPhone 15 Pro góc 1', 0, true, now()),
  (2, 1, '/uploads/products/iphone15pro-2.jpg', 'iPhone 15 Pro góc 2', 1, false, now()),
  (3, 2, '/uploads/products/macbookair-m3-1.jpg', 'MacBook Air M3 góc 1', 0, true, now()),
  (4, 2, '/uploads/products/macbookair-m3-2.jpg', 'MacBook Air M3 góc 2', 1, false, now()),
  (5, 3, '/uploads/products/case-iphone15pro-1.jpg', 'Ốp lưng iPhone 15 Pro mặt trước', 0, true, now()),
  (6, 3, '/uploads/products/case-iphone15pro-2.jpg', 'Ốp lưng iPhone 15 Pro mặt sau', 1, false, now()),
  (7, 4, '/uploads/products/s24ultra-1.jpg', 'Galaxy S24 Ultra góc 1', 0, true, now()),
  (8, 4, '/uploads/products/s24ultra-2.jpg', 'Galaxy S24 Ultra góc 2', 1, false, now());

-- ------------------------------------------------------------
-- Product specs
-- ------------------------------------------------------------
INSERT INTO product_specs (id, product_id, spec_group, spec_key, spec_value, spec_unit, sort_order, created_at) VALUES
  -- iPhone 15 Pro
  (1, 1, 'Hardware', 'Chip', 'A17 Pro', NULL, 0, now()),
  (2, 1, 'RAM', 'RAM', '8', 'GB', 0, now()),
  (3, 1, 'Storage', 'Dung lượng', '256', 'GB', 0, now()),
  (4, 1, 'Display', 'Kích thước màn hình', '6.1', 'inch', 0, now()),

  -- MacBook Air M3
  (5, 2, 'Processor', 'CPU', 'Apple M3', NULL, 0, now()),
  (6, 2, 'Memory', 'RAM', '16', 'GB', 0, now()),
  (7, 2, 'Storage', 'SSD', '512', 'GB', 0, now()),
  (8, 2, 'Display', 'Kích thước màn hình', '13.6', 'inch', 0, now()),

  -- Case iPhone
  (9, 3, 'Material', 'Chất liệu', 'TPU + Polycarbonate', NULL, 0, now()),
  (10, 3, 'Compatibility', 'Tương thích', 'iPhone 15 Pro', NULL, 0, now()),
  (11, 3, 'Features', 'Tính năng', 'Chống sốc, chống trầy', NULL, 0, now()),

  -- Galaxy S24 Ultra
  (12, 4, 'Hardware', 'Chip', 'Exynos 2400', NULL, 0, now()),
  (13, 4, 'RAM', 'RAM', '12', 'GB', 0, now()),
  (14, 4, 'Storage', 'Dung lượng', '256', 'GB', 0, now()),
  (15, 4, 'Display', 'Kích thước màn hình', '6.8', 'inch', 0, now());

-- ------------------------------------------------------------
-- Inventory
-- ------------------------------------------------------------
INSERT INTO inventory (id, product_id, location_code, quantity_on_hand, reorder_level, last_stock_in_at, created_at, updated_at) VALUES
  (1, 1, 'main', 50, 10, now(), now(), now()),
  (2, 2, 'main', 20, 5, now(), now(), now()),
  (3, 3, 'main', 200, 50, now(), now(), now()),
  (4, 4, 'main', 30, 10, now(), now(), now());

-- ------------------------------------------------------------
-- Shipping methods
-- ------------------------------------------------------------
INSERT INTO shipping_methods (id, name, description, base_fee, estimated_days_min, estimated_days_max, is_active, created_at, updated_at) VALUES
  (1, 'Giao hàng nhanh', 'Nhận hàng sớm trong ngày', 30000.00, 1, 2, true, now(), now()),
  (2, 'Giao hàng tiết kiệm', 'Chi phí thấp, thời gian lâu hơn', 15000.00, 2, 4, true, now(), now());

-- ------------------------------------------------------------
-- Coupons
-- ------------------------------------------------------------
INSERT INTO coupons (
  id, code, coupon_type, value, min_order_amount, start_at, end_at, max_uses, max_uses_per_user, is_active,
  created_at, updated_at
) VALUES
  (1, 'TECH10', 'percentage', 10.00, 500000.00, NULL, NULL, 1000, 2, true, now(), now());

-- ------------------------------------------------------------
-- Cart (customer)
-- ------------------------------------------------------------
INSERT INTO carts (id, user_id, status, created_at, updated_at) VALUES
  (1, 3, 'active', now(), now());

INSERT INTO cart_items (cart_id, product_id, variant_id, quantity, unit_price, added_at) VALUES
  (1, 1, 1, 1, 8000000.00, now()),
  (1, 3, 3, 2, 200000.00, now());

-- ------------------------------------------------------------
-- Orders (customer)
-- Subtotal = 1*8000000 + 2*200000 = 8400000
-- Coupon TECH10 = 10% = 840000
-- Shipping fee (fast) = 30000
-- Total = 8400000 - 840000 + 30000 = 7590000
-- ------------------------------------------------------------
INSERT INTO orders (
  id, order_code, user_id, cart_id, coupon_id, shipping_method_id,
  status, payment_status, currency,
  subtotal_amount, discount_amount, shipping_fee, total_amount,
  shipping_name, shipping_phone, shipping_address_line,
  shipping_province, shipping_district, shipping_ward,
  notes, created_at, updated_at
) VALUES
  (1, 'OD-SEED-0001', 3, 1, 1, 1,
   'processing', 'paid', 'VND',
   8400000.00, 840000.00, 30000.00, 7590000.00,
   'Khách hàng E-Tech', '0901000003', '56 Đường C',
   'Đà Nẵng', 'Hải Châu', 'Thạch Thang',
   'Giao đúng giờ giúp em!', now(), now());

INSERT INTO order_items (id, order_id, product_id, variant_id, product_name_snapshot, quantity, unit_price, total_price) VALUES
  (1, 1, 1, 1, 'iPhone 15 Pro 256GB', 1, 8000000.00, 8000000.00),
  (2, 1, 3, 3, 'Ốp lưng chống sốc iPhone 15 Pro', 2, 200000.00, 400000.00);

-- ------------------------------------------------------------
-- Payments + Transactions
-- ------------------------------------------------------------
INSERT INTO payments (
  id, order_id, method, amount, currency, transaction_code, status, paid_at, created_at, updated_at
) VALUES
  (1, 1, 'bank_transfer', 7590000.00, 'VND', 'TXN-SEED-0001', 'paid', now(), now(), now());

INSERT INTO transactions (
  id, payment_id, provider, provider_transaction_id, amount, currency, status, raw_response, created_at
) VALUES
  (1, 1, 'VNPAY', 'VN-TXN-0000001', 7590000.00, 'VND', 'success', '{}'::jsonb, now());

INSERT INTO coupon_usage (
  id, coupon_id, user_id, order_id, used_at, discount_amount
) VALUES
  (1, 1, 3, 1, now(), 840000.00);

-- ------------------------------------------------------------
-- Reviews (customer)
-- ------------------------------------------------------------
INSERT INTO reviews (
  id, product_id, user_id, order_id,
  rating, comment, status, created_at, updated_at, deleted_at
) VALUES
  (1, 1, 3, 1, 5, 'Đúng như mô tả, giao nhanh.', 'approved', now(), now(), NULL),
  (2, 3, 3, 1, 4, 'Chống sốc ổn, dùng được lâu.', 'approved', now(), now(), NULL);

-- ------------------------------------------------------------
-- Wishlist (customer)
-- ------------------------------------------------------------
INSERT INTO wishlists (id, user_id, product_id, created_at) VALUES
  (1, 3, 4, now()),
  (2, 3, 2, now());

-- ------------------------------------------------------------
-- Notifications
-- ------------------------------------------------------------
INSERT INTO notifications (
  id, user_id, type, title, body, data, read_at, created_at, updated_at
) VALUES
  (1, 3, 'order_confirmed', 'Đơn hàng đã được xác nhận', 'Đơn hàng OD-SEED-0001 đang được xử lý.',
   '{"orderCode":"OD-SEED-0001"}'::jsonb, NULL, now(), now());

-- ------------------------------------------------------------
-- Reset sequences for BIGSERIAL columns.
-- After manual inserts, Postgres sequences might not point to MAX(id),
-- causing duplicate-key errors on next INSERT.
-- ------------------------------------------------------------
SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT COALESCE(MAX(id), 1) FROM users), true);
SELECT setval(pg_get_serial_sequence('roles', 'id'), (SELECT COALESCE(MAX(id), 1) FROM roles), true);
SELECT setval(pg_get_serial_sequence('categories', 'id'), (SELECT COALESCE(MAX(id), 1) FROM categories), true);
SELECT setval(pg_get_serial_sequence('products', 'id'), (SELECT COALESCE(MAX(id), 1) FROM products), true);
SELECT setval(pg_get_serial_sequence('product_variants', 'id'), (SELECT COALESCE(MAX(id), 1) FROM product_variants), true);
SELECT setval(pg_get_serial_sequence('product_images', 'id'), (SELECT COALESCE(MAX(id), 1) FROM product_images), true);
SELECT setval(pg_get_serial_sequence('product_specs', 'id'), (SELECT COALESCE(MAX(id), 1) FROM product_specs), true);
SELECT setval(pg_get_serial_sequence('carts', 'id'), (SELECT COALESCE(MAX(id), 1) FROM carts), true);
SELECT setval(pg_get_serial_sequence('orders', 'id'), (SELECT COALESCE(MAX(id), 1) FROM orders), true);
SELECT setval(pg_get_serial_sequence('order_items', 'id'), (SELECT COALESCE(MAX(id), 1) FROM order_items), true);
SELECT setval(pg_get_serial_sequence('shipping_methods', 'id'), (SELECT COALESCE(MAX(id), 1) FROM shipping_methods), true);
SELECT setval(pg_get_serial_sequence('coupons', 'id'), (SELECT COALESCE(MAX(id), 1) FROM coupons), true);
SELECT setval(pg_get_serial_sequence('coupon_usage', 'id'), (SELECT COALESCE(MAX(id), 1) FROM coupon_usage), true);
SELECT setval(pg_get_serial_sequence('payments', 'id'), (SELECT COALESCE(MAX(id), 1) FROM payments), true);
SELECT setval(pg_get_serial_sequence('transactions', 'id'), (SELECT COALESCE(MAX(id), 1) FROM transactions), true);
SELECT setval(pg_get_serial_sequence('reviews', 'id'), (SELECT COALESCE(MAX(id), 1) FROM reviews), true);
SELECT setval(pg_get_serial_sequence('inventory', 'id'), (SELECT COALESCE(MAX(id), 1) FROM inventory), true);
SELECT setval(pg_get_serial_sequence('wishlists', 'id'), (SELECT COALESCE(MAX(id), 1) FROM wishlists), true);
SELECT setval(pg_get_serial_sequence('notifications', 'id'), (SELECT COALESCE(MAX(id), 1) FROM notifications), true);

COMMIT;

