<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreProductNewsRequest;
use App\Http\Requests\Admin\UpdateProductNewsRequest;
use App\Http\Resources\Admin\ProductNewsResource;
use App\Models\Product;
use App\Models\ProductNews;
use App\Support\HtmlSanitizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class ProductNewsController extends Controller
{
    public function index(Product $product): JsonResponse
    {
        $items = $product->news()
            ->orderByDesc('published_at')
            ->orderBy('sort_order')
            ->get();

        return response()->json(ProductNewsResource::collection($items)->resolve());
    }

    public function store(Product $product, StoreProductNewsRequest $request): JsonResponse
    {
        $data = $request->validated();

        $baseSlug = Str::slug($data['title']) ?: ('news-'.uniqid());
        $slug = $baseSlug;
        $i = 1;
        while (ProductNews::where('slug', $slug)->exists()) {
            $slug = $baseSlug.'-'.$i;
            $i++;
        }

        $news = ProductNews::create([
            'product_id' => $product->id,
            'title' => $data['title'],
            'slug' => $slug,
            'content_html' => HtmlSanitizer::sanitize($data['content_html']),
            'thumbnail_url' => ! empty($data['thumbnail_url']) ? trim($data['thumbnail_url']) : null,
            'sort_order' => $data['sort_order'] ?? 0,
            'is_active' => $data['is_active'] ?? true,
            'published_at' => $data['published_at'] ?? Carbon::now(),
        ]);

        return response()->json($news, 201);
    }

    public function update(Product $product, ProductNews $news, UpdateProductNewsRequest $request): JsonResponse
    {
        if ((int) $news->product_id !== (int) $product->id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $data = $request->validated();

        $news->update([
            'title' => $data['title'],
            'content_html' => HtmlSanitizer::sanitize($data['content_html']),
            'thumbnail_url' => ! empty($data['thumbnail_url']) ? trim($data['thumbnail_url']) : null,
            'sort_order' => $data['sort_order'] ?? $news->sort_order,
            'is_active' => $data['is_active'] ?? $news->is_active,
            'published_at' => $data['published_at'] ?? $news->published_at,
        ]);

        return response()->json($news);
    }

    public function destroy(Product $product, ProductNews $news): JsonResponse
    {
        if ((int) $news->product_id !== (int) $product->id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $news->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
