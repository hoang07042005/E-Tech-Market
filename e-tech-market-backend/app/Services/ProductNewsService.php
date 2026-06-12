<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductNews;
use App\Support\HtmlSanitizer;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class ProductNewsService
{
    /**
     * Get all news for a product (Admin).
     */
    public function getAdminProductNews(Product $product)
    {
        return $product->news()
            ->orderByDesc('published_at')
            ->orderBy('sort_order')
            ->get();
    }

    /**
     * Store new product news (Admin).
     */
    public function createProductNews(Product $product, array $data): ProductNews
    {
        $baseSlug = Str::slug($data['title']) ?: ('news-'.uniqid());
        $slug = $baseSlug;
        $i = 1;
        while (ProductNews::where('slug', $slug)->exists()) {
            $slug = $baseSlug.'-'.$i;
            $i++;
        }

        return ProductNews::create([
            'product_id' => $product->id,
            'title' => $data['title'],
            'slug' => $slug,
            'content_html' => HtmlSanitizer::sanitize($data['content_html']),
            'thumbnail_url' => ! empty($data['thumbnail_url']) ? trim($data['thumbnail_url']) : null,
            'sort_order' => $data['sort_order'] ?? 0,
            'is_active' => $data['is_active'] ?? true,
            'published_at' => $data['published_at'] ?? Carbon::now(),
        ]);
    }

    /**
     * Update product news (Admin).
     */
    public function updateProductNews(Product $product, ProductNews $news, array $data): ProductNews
    {
        if ((int) $news->product_id !== (int) $product->id) {
            throw new \Exception('Not found', 404);
        }

        $news->update([
            'title' => $data['title'],
            'content_html' => HtmlSanitizer::sanitize($data['content_html']),
            'thumbnail_url' => ! empty($data['thumbnail_url']) ? trim($data['thumbnail_url']) : null,
            'sort_order' => $data['sort_order'] ?? $news->sort_order,
            'is_active' => $data['is_active'] ?? $news->is_active,
            'published_at' => $data['published_at'] ?? $news->published_at,
        ]);

        return $news;
    }

    /**
     * Delete product news (Admin).
     */
    public function deleteProductNews(Product $product, ProductNews $news): void
    {
        if ((int) $news->product_id !== (int) $product->id) {
            throw new \Exception('Not found', 404);
        }

        $news->delete();
    }

    /**
     * Get active product news (Client).
     */
    public function getActiveClientNews(ProductNews $news): ProductNews
    {
        if (! $news->is_active) {
            throw new \Exception('Not found', 404);
        }

        return $news;
    }
}
