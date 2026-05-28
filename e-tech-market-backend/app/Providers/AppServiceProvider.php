<?php

namespace App\Providers;

use App\Models\ProductVariant;
use App\Models\User;
use App\Models\Role;
use App\Observers\ProductVariantObserver;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        ProductVariant::observe(ProductVariantObserver::class);

        // ----------------------------------------------------------------
        // Targeted cache invalidation per resource type.
        //
        // Instead of Cache::flush() (which nukes the entire cache store and
        // can trigger a cache stampede under heavy traffic), we only forget
        // the cache keys / tag groups that are actually affected by the
        // model change.
        // ----------------------------------------------------------------

        $forgetProductCache = function () {
            try {
                // Client product listing uses a dynamic key, so we use a
                // wildcard-safe approach: store all product-list keys under
                // a known prefix and clear them individually.
                // For drivers that support tags (Redis, Memcached), prefer tags.
                // For the file/database driver we forget known key patterns.
                $knownKeys = [
                    'store_config',
                    'active_flash_sale',
                ];
                foreach ($knownKeys as $k) {
                    Cache::forget($k);
                }
                // Forget product listing cache entries (prefixed with products_index_)
                // Since Cache::forget only works with exact keys, we track via a
                // lightweight registry key that stores active cache keys.
                $registeredKeys = Cache::get('_cache_registry_products', []);
                foreach ($registeredKeys as $key) {
                    Cache::forget($key);
                }
                Cache::forget('_cache_registry_products');
            } catch (\Throwable) {
                // Fail-safe: silent
            }
        };

        $forgetCategoryCache = function () {
            try {
                // Categories are cached with prefix "categories_"
                $registeredKeys = Cache::get('_cache_registry_categories', []);
                foreach ($registeredKeys as $key) {
                    Cache::forget($key);
                }
                Cache::forget('_cache_registry_categories');
                Cache::forget('store_config');
            } catch (\Throwable) {
                // Fail-safe
            }
        };

        $forgetReviewCache = function () {
            try {
                $registeredKeys = Cache::get('_cache_registry_reviews', []);
                foreach ($registeredKeys as $key) {
                    Cache::forget($key);
                }
                Cache::forget('_cache_registry_reviews');
            } catch (\Throwable) {
                // Fail-safe
            }
        };

        $forgetBlogCache = function () {
            try {
                Cache::forget('blog_categories_all');
                $registeredKeys = Cache::get('_cache_registry_blog', []);
                foreach ($registeredKeys as $key) {
                    Cache::forget($key);
                }
                Cache::forget('_cache_registry_blog');
            } catch (\Throwable) {
                // Fail-safe
            }
        };

        \App\Models\Product::saved($forgetProductCache);
        \App\Models\Product::deleted($forgetProductCache);
        
        \App\Models\Category::saved($forgetCategoryCache);
        \App\Models\Category::deleted($forgetCategoryCache);

        \App\Models\Review::saved($forgetReviewCache);
        \App\Models\Review::deleted($forgetReviewCache);

        \App\Models\BlogPost::saved($forgetBlogCache);
        \App\Models\BlogPost::deleted($forgetBlogCache);

        // Invalidate cached admin user ids when users or roles change.
        $forgetAdminUserIds = function () {
            try {
                Cache::forget('admin_user_ids');
            } catch (\Throwable) {
                // fail-safe
            }
        };

        \App\Models\User::saved($forgetAdminUserIds);
        \App\Models\User::deleted($forgetAdminUserIds);
        \App\Models\Role::saved($forgetAdminUserIds);
        \App\Models\Role::deleted($forgetAdminUserIds);
    }
}
