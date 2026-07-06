<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Squashed migration consolidating 85 individual migrations
     * Original migrations span from 2014-10-12 to 2026-07-01
     * This captures the final schema state to avoid migration chain complexity
     */
    public function up(): void
    {
        // Users
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->string('phone', 20)->nullable()->unique();
            $table->string('avatar_url')->nullable();
            $table->rememberToken();
            $table->boolean('two_factor_enabled')->default(false);
            $table->string('two_factor_code', 10)->nullable();
            $table->timestamp('two_factor_expires_at')->nullable();
            $table->timestampsTz();
            $table->index('email');
            $table->index('phone');
        });

        // Password reset tokens
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        // Personal access tokens (Sanctum)
        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->string('name');
            $table->string('token', 80)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestampsTz();
            $table->index('tokenable_type', 'tokenable_id');
        });

        // Failed jobs
        Schema::create('failed_jobs', function (Blueprint $table) {
            $table->id();
            $table->string('uuid')->unique();
            $table->text('connection');
            $table->text('queue');
            $table->longText('payload');
            $table->longText('exception');
            $table->timestamp('failed_at')->useCurrent();
        });

        // Jobs queue
        Schema::create('jobs', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('queue')->index();
            $table->longText('payload');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->unsignedInteger('reserved_at')->nullable();
            $table->unsignedInteger('available_at');
            $table->unsignedInteger('created_at');
            $table->index('reserved_at');
        });

        // Categories
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 255)->unique();
            $table->string('slug', 255)->unique();
            $table->text('description')->nullable();
            $table->string('image_url', 255)->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestampsTz();
            $table->index('slug');
            $table->index('sort_order');
        });

        // Products
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name', 255);
            $table->string('slug', 255)->unique();
            $table->unsignedBigInteger('category_id');
            $table->longText('description');
            $table->decimal('rating', 3, 2)->default(0)->index();
            $table->unsignedInteger('review_count')->default(0);
            $table->boolean('is_featured')->default(false)->index();
            $table->timestampsTz();
            $table->fullText('name', 'description');
            $table->foreign('category_id')->references('id')->on('categories')->cascadeOnDelete();
            $table->index('category_id');
            $table->index('is_featured');
        });

        // Product images
        Schema::create('product_images', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->string('image_url', 255);
            $table->integer('sort_order')->default(0);
            $table->timestampsTz();
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
            $table->index('product_id');
        });

        // Product variants
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->string('sku', 100)->unique();
            $table->string('name', 255);
            $table->decimal('price', 12, 2);
            $table->decimal('discount', 5, 2)->default(0);
            $table->unsignedInteger('stock')->default(0);
            $table->unsignedInteger('reorder_level')->default(10);
            $table->timestampsTz();
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
            $table->index('product_id');
            $table->index('sku');
            $table->index('price');
        });

        // Product specs
        Schema::create('product_specs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('product_variant_id')->nullable();
            $table->string('spec_key', 100);
            $table->string('spec_value', 255);
            $table->integer('sort_order')->default(0);
            $table->timestampsTz();
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
            $table->foreign('product_variant_id')->references('id')->on('product_variants')->nullOnDelete();
            $table->index('product_id');
            $table->index('product_variant_id');
        });

        // Product FAQs
        Schema::create('product_faqs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->string('question', 255);
            $table->text('answer');
            $table->integer('sort_order')->default(0);
            $table->timestampsTz();
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
            $table->index('product_id');
        });

        // Cart
        Schema::create('carts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('session_id', 255)->nullable();
            $table->timestampsTz();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index('user_id');
            $table->index('session_id');
        });

        // Cart items
        Schema::create('cart_items', function (Blueprint $table) {
            $table->unsignedBigInteger('cart_id');
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('product_variant_id');
            $table->unsignedInteger('quantity');
            $table->timestampsTz();
            $table->primary(['cart_id', 'product_id']);
            $table->foreign('cart_id')->references('id')->on('carts')->cascadeOnDelete();
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
            $table->foreign('product_variant_id')->references('id')->on('product_variants')->cascadeOnDelete();
            $table->index('product_variant_id');
        });

        // Shipping methods
        Schema::create('shipping_methods', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestampsTz();
            $table->index('is_active');
        });

        // Shipping zones
        Schema::create('shipping_zones', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('shipping_method_id');
            $table->string('name', 100);
            $table->decimal('base_cost', 10, 2);
            $table->decimal('cost_per_km', 10, 2)->default(0);
            $table->timestampsTz();
            $table->foreign('shipping_method_id')->references('id')->on('shipping_methods')->cascadeOnDelete();
            $table->unique(['shipping_method_id', 'name']);
            $table->index('shipping_method_id');
        });

        // Coupons
        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->text('description')->nullable();
            $table->enum('discount_type', ['fixed', 'percentage']);
            $table->decimal('discount_value', 10, 2);
            $table->decimal('minimum_purchase', 10, 2)->default(0);
            $table->unsignedInteger('usage_limit')->nullable();
            $table->unsignedInteger('times_used')->default(0);
            $table->timestamp('valid_from')->nullable();
            $table->timestamp('valid_until')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestampsTz();
            $table->index('code');
            $table->index('is_active');
        });

        // Coupon usage
        Schema::create('coupon_usage', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('coupon_id');
            $table->unsignedBigInteger('user_id')->nullable();
            $table->unsignedBigInteger('order_id')->nullable();
            $table->decimal('discount_applied', 12, 2);
            $table->timestampsTz();
            $table->foreign('coupon_id')->references('id')->on('coupons')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            $table->index('coupon_id');
            $table->index('user_id');
        });

        // User coupons
        Schema::create('user_coupons', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('coupon_id');
            $table->boolean('is_used')->default(false);
            $table->timestamp('used_at')->nullable();
            $table->timestampsTz();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('coupon_id')->references('id')->on('coupons')->cascadeOnDelete();
            $table->unique(['user_id', 'coupon_id']);
        });

        // Orders
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_code', 50)->unique();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->unsignedBigInteger('cart_id')->nullable();
            $table->unsignedBigInteger('coupon_id')->nullable();
            $table->unsignedBigInteger('shipping_method_id')->nullable();
            $table->unsignedBigInteger('shipping_zone_id')->nullable();
            $table->string('status', 30)->default('pending')->index();
            $table->string('payment_status', 30)->default('pending')->index();
            $table->char('currency', 3)->default('VND');
            $table->decimal('subtotal_amount', 12, 2)->default(0);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('shipping_fee', 12, 2)->default(0);
            $table->decimal('total_amount', 12, 2);
            $table->string('shipping_name', 255);
            $table->string('shipping_phone', 30);
            $table->text('shipping_address_line');
            $table->string('shipping_province', 100)->nullable();
            $table->string('shipping_district', 100)->nullable();
            $table->string('shipping_ward', 100)->nullable();
            $table->text('notes')->nullable();
            $table->unsignedInteger('loyalty_points')->default(0);
            $table->timestampsTz();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('coupon_id')->references('id')->on('coupons')->nullOnDelete();
            $table->foreign('shipping_method_id')->references('id')->on('shipping_methods')->nullOnDelete();
            $table->foreign('shipping_zone_id')->references('id')->on('shipping_zones')->nullOnDelete();
            $table->index('user_id');
            $table->index('status');
            $table->index('payment_status');
        });

        // Order status histories
        Schema::create('order_status_histories', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('order_id');
            $table->string('status', 30);
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('changed_by')->nullable();
            $table->timestampsTz();
            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
            $table->foreign('changed_by')->references('id')->on('users')->nullOnDelete();
            $table->index('order_id');
            $table->index('status');
        });

        // Order items
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('order_id');
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('product_variant_id');
            $table->unsignedInteger('quantity');
            $table->decimal('unit_price', 12, 2);
            $table->decimal('discount_per_item', 12, 2)->default(0);
            $table->timestampsTz();
            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
            $table->foreign('product_variant_id')->references('id')->on('product_variants')->cascadeOnDelete();
            $table->index('order_id');
        });

        // Order return requests
        Schema::create('order_return_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('order_id');
            $table->unsignedBigInteger('order_item_id');
            $table->string('status', 30)->default('pending');
            $table->text('reason');
            $table->text('description')->nullable();
            $table->decimal('refund_amount', 12, 2);
            $table->boolean('customer_confirmed')->default(false);
            $table->timestamp('customer_confirmed_at')->nullable();
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestampsTz();
            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
            $table->foreign('order_item_id')->references('id')->on('order_items')->cascadeOnDelete();
            $table->foreign('approved_by')->references('id')->on('users')->nullOnDelete();
            $table->index('order_id');
            $table->index('status');
        });

        // Inventory
        Schema::create('inventory', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_variant_id');
            $table->unsignedInteger('stock');
            $table->unsignedInteger('reorder_level')->default(10);
            $table->timestampsTz();
            $table->foreign('product_variant_id')->references('id')->on('product_variants')->cascadeOnDelete();
            $table->unique('product_variant_id');
        });

        // Inventory transactions
        Schema::create('inventory_transactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_variant_id');
            $table->enum('transaction_type', ['purchase', 'return', 'adjustment', 'restock']);
            $table->unsignedInteger('quantity');
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->timestampsTz();
            $table->foreign('product_variant_id')->references('id')->on('product_variants')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            $table->index('product_variant_id');
            $table->index('transaction_type');
        });

        // Reviews
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('order_item_id');
            $table->decimal('rating', 3, 2);
            $table->text('comment');
            $table->decimal('design_rating', 3, 2)->default(0);
            $table->decimal('quality_rating', 3, 2)->default(0);
            $table->decimal('delivery_rating', 3, 2)->default(0);
            $table->decimal('experience_rating', 3, 2)->default(0);
            $table->boolean('is_verified_purchase')->default(true);
            $table->timestampsTz();
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('order_item_id')->references('id')->on('order_items')->cascadeOnDelete();
            $table->index('product_id');
            $table->index('user_id');
            $table->index('rating');
        });

        // Wishlists
        Schema::create('wishlists', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('product_id');
            $table->timestampsTz();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
            $table->unique(['user_id', 'product_id']);
            $table->index('user_id');
        });

        // Payments
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('order_id');
            $table->string('payment_method', 50);
            $table->decimal('amount', 12, 2);
            $table->string('status', 30)->default('pending')->index();
            $table->string('transaction_id', 255)->nullable();
            $table->text('response_data')->nullable();
            $table->timestampsTz();
            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
            $table->index('order_id');
            $table->index('payment_method');
        });

        // Transactions
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('order_id');
            $table->string('gateway', 50);
            $table->string('status', 30)->default('pending');
            $table->string('transaction_code', 255)->unique();
            $table->decimal('amount', 12, 2);
            $table->text('response_data')->nullable();
            $table->timestampsTz();
            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
            $table->index('order_id');
            $table->index('gateway');
            $table->index('status');
        });

        // Notifications
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->string('type', 100);
            $table->text('title');
            $table->text('message');
            $table->string('data', 255)->nullable();
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestampsTz();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index('user_id');
            $table->index('is_read');
        });

        // Product news
        Schema::create('product_news', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->string('content', 500);
            $table->timestampsTz();
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
            $table->index('product_id');
        });

        // Product shop QnAs
        Schema::create('product_shop_qnas', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->string('question', 500);
            $table->text('answer')->nullable();
            $table->string('answer_by', 255)->nullable();
            $table->timestamp('answered_at')->nullable();
            $table->timestampsTz();
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
            $table->index('product_id');
        });

        // Admin settings
        Schema::create('admin_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key', 255)->unique();
            $table->longText('value')->nullable();
            $table->timestampsTz();
            $table->index('key');
        });

        // Contact messages
        Schema::create('contact_messages', function (Blueprint $table) {
            $table->id();
            $table->string('name', 255);
            $table->string('email', 255);
            $table->string('phone', 20)->nullable();
            $table->string('subject', 255);
            $table->text('message');
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestampsTz();
            $table->index('email');
            $table->index('is_read');
        });

        // Flash sales
        Schema::create('flash_sales', function (Blueprint $table) {
            $table->id();
            $table->string('name', 255);
            $table->text('description')->nullable();
            $table->timestamp('start_time');
            $table->timestamp('end_time');
            $table->string('status', 30)->default('scheduled')->index();
            $table->timestampsTz();
            $table->index('start_time');
            $table->index('end_time');
        });

        // Flash sale items
        Schema::create('flash_sale_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('flash_sale_id');
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('product_variant_id')->nullable();
            $table->unsignedInteger('quantity_limit');
            $table->unsignedInteger('quantity_sold')->default(0);
            $table->decimal('flash_price', 12, 2);
            $table->timestampsTz();
            $table->foreign('flash_sale_id')->references('id')->on('flash_sales')->cascadeOnDelete();
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
            $table->foreign('product_variant_id')->references('id')->on('product_variants')->nullOnDelete();
            $table->index('flash_sale_id');
            $table->index('product_id');
        });

        // Blog categories
        Schema::create('blog_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 255)->unique();
            $table->string('slug', 255)->unique();
            $table->timestampsTz();
            $table->index('slug');
        });

        // Blog posts
        Schema::create('blog_posts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('category_id');
            $table->string('title', 255);
            $table->string('slug', 255)->unique();
            $table->unsignedBigInteger('author_id');
            $table->longText('content');
            $table->string('featured_image', 255)->nullable();
            $table->unsignedInteger('view_count')->default(0);
            $table->boolean('is_published')->default(true)->index();
            $table->timestamp('published_at')->nullable();
            $table->unsignedInteger('comments_count')->default(0);
            $table->unsignedInteger('likes_count')->default(0);
            $table->unsignedInteger('shares_count')->default(0);
            $table->timestampsTz();
            $table->foreign('category_id')->references('id')->on('blog_categories')->cascadeOnDelete();
            $table->foreign('author_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index('slug');
            $table->index('is_published');
            $table->index('author_id');
            $table->fullText('title', 'content');
        });

        // Banners
        Schema::create('banners', function (Blueprint $table) {
            $table->id();
            $table->string('title', 255);
            $table->string('image_url', 255);
            $table->string('link', 255)->nullable();
            $table->string('status', 30)->default('active')->index();
            $table->integer('sort_order')->default(0);
            $table->timestamp('start_date')->nullable();
            $table->timestamp('end_date')->nullable();
            $table->timestampsTz();
            $table->index('status');
            $table->index('sort_order');
        });

        // Videos
        Schema::create('videos', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('category_id');
            $table->string('title', 255);
            $table->string('slug', 255)->unique();
            $table->text('description')->nullable();
            $table->string('video_url', 255);
            $table->string('thumbnail_url', 255)->nullable();
            $table->unsignedInteger('view_count')->default(0);
            $table->timestamp('published_at')->nullable();
            $table->timestampsTz();
            $table->foreign('category_id')->references('id')->on('categories')->cascadeOnDelete();
            $table->index('category_id');
            $table->index('slug');
        });

        // Loyalty programs
        Schema::create('loyalty_levels', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->unsignedInteger('min_points');
            $table->unsignedInteger('max_points')->nullable();
            $table->decimal('multiplier', 3, 2)->default(1.0);
            $table->timestampsTz();
            $table->index('min_points');
        });

        // User loyalty
        Schema::create('user_loyalty', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->unique();
            $table->unsignedBigInteger('loyalty_level_id');
            $table->unsignedInteger('total_points')->default(0);
            $table->unsignedInteger('redeemed_points')->default(0);
            $table->unsignedInteger('available_points')->default(0);
            $table->timestamp('last_reset_at')->nullable();
            $table->timestampsTz();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('loyalty_level_id')->references('id')->on('loyalty_levels');
        });

        // Loyalty transactions
        Schema::create('loyalty_transactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->enum('transaction_type', ['earned', 'redeemed']);
            $table->unsignedInteger('points');
            $table->string('description', 255)->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->timestampsTz();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index('user_id');
            $table->index('transaction_type');
        });

        // Permissions (Spatie)
        Schema::create('permissions', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('name')->unique();
            $table->string('guard_name')->default('api');
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent();
        });

        // Roles (Spatie)
        Schema::create('roles', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('name')->unique();
            $table->string('guard_name')->default('api');
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent();
        });

        // Model has roles
        Schema::create('model_has_roles', function (Blueprint $table) {
            $table->unsignedBigInteger('role_id');
            $table->string('model_type');
            $table->unsignedBigInteger('model_id');
            $table->index(['model_id', 'model_type']);
            $table->primary(['role_id', 'model_id', 'model_type']);
            $table->foreign('role_id')->references('id')->on('roles')->cascadeOnDelete();
        });

        // Model has permissions
        Schema::create('model_has_permissions', function (Blueprint $table) {
            $table->unsignedBigInteger('permission_id');
            $table->string('model_type');
            $table->unsignedBigInteger('model_id');
            $table->index(['model_id', 'model_type']);
            $table->primary(['permission_id', 'model_id', 'model_type']);
            $table->foreign('permission_id')->references('id')->on('permissions')->cascadeOnDelete();
        });

        // Role has permissions
        Schema::create('role_has_permissions', function (Blueprint $table) {
            $table->unsignedBigInteger('permission_id');
            $table->unsignedBigInteger('role_id');
            $table->primary(['permission_id', 'role_id']);
            $table->foreign('role_id')->references('id')->on('roles')->cascadeOnDelete();
            $table->foreign('permission_id')->references('id')->on('permissions')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        // Drop in reverse order of dependencies
        Schema::dropIfExists('role_has_permissions');
        Schema::dropIfExists('model_has_permissions');
        Schema::dropIfExists('model_has_roles');
        Schema::dropIfExists('roles');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('loyalty_transactions');
        Schema::dropIfExists('user_loyalty');
        Schema::dropIfExists('loyalty_levels');
        Schema::dropIfExists('videos');
        Schema::dropIfExists('banners');
        Schema::dropIfExists('blog_posts');
        Schema::dropIfExists('blog_categories');
        Schema::dropIfExists('flash_sale_items');
        Schema::dropIfExists('flash_sales');
        Schema::dropIfExists('contact_messages');
        Schema::dropIfExists('admin_settings');
        Schema::dropIfExists('product_shop_qnas');
        Schema::dropIfExists('product_news');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('transactions');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('wishlists');
        Schema::dropIfExists('reviews');
        Schema::dropIfExists('inventory_transactions');
        Schema::dropIfExists('inventory');
        Schema::dropIfExists('order_return_requests');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('order_status_histories');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('user_coupons');
        Schema::dropIfExists('coupon_usage');
        Schema::dropIfExists('coupons');
        Schema::dropIfExists('shipping_zones');
        Schema::dropIfExists('shipping_methods');
        Schema::dropIfExists('cart_items');
        Schema::dropIfExists('carts');
        Schema::dropIfExists('product_faqs');
        Schema::dropIfExists('product_specs');
        Schema::dropIfExists('product_variants');
        Schema::dropIfExists('product_images');
        Schema::dropIfExists('products');
        Schema::dropIfExists('categories');
        Schema::dropIfExists('jobs');
        Schema::dropIfExists('failed_jobs');
        Schema::dropIfExists('personal_access_tokens');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};
