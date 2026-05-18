<?php

namespace App\Providers;

use App\Models\ProductVariant;
use App\Observers\ProductVariantObserver;
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

        // Auto-flush cache when public data changes (products, categories, reviews, blog posts)
        $flushCache = function () {
            try {
                \Illuminate\Support\Facades\Cache::flush();
            } catch (\Throwable) {
                // Fail-safe
            }
        };

        \App\Models\Product::saved($flushCache);
        \App\Models\Product::deleted($flushCache);
        
        \App\Models\Category::saved($flushCache);
        \App\Models\Category::deleted($flushCache);

        \App\Models\Review::saved($flushCache);
        \App\Models\Review::deleted($flushCache);

        \App\Models\BlogPost::saved($flushCache);
        \App\Models\BlogPost::deleted($flushCache);
    }
}
