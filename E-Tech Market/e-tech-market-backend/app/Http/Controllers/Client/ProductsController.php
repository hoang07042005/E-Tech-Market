<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::query()
            ->where('is_active', true);

        if ($request->filled('category_id')) {
            $catId = (int) $request->input('category_id');
            $allCatIds = $this->getAllCategoryIds($catId);
            $query->whereIn('category_id', $allCatIds);
        }

        if ($request->filled('brand')) {
            $query->where('brand', 'ilike', $request->input('brand'));
        }

        if ($request->filled('min_price')) {
            $query->where('price', '>=', (float) $request->input('min_price'));
        }

        if ($request->filled('max_price')) {
            $query->where('price', '<=', (float) $request->input('max_price'));
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('description', 'ilike', "%{$search}%");
            });
        }

        $products = $query
            ->orderBy('created_at', 'desc')
            ->with(['category', 'variants'])
            ->withCount([
                'reviews as reviews_count' => fn ($q) => $q->where('status', 'approved'),
            ])
            ->withAvg([
                'reviews as avg_rating' => fn ($q) => $q->where('status', 'approved'),
            ], 'rating')
            ->paginate((int) $request->input('limit', 12));

        return response()->json($products);
    }

    /**
     * Get category ID and all its descendants' IDs.
     */
    private function getAllCategoryIds($categoryId): array
    {
        $ids = [$categoryId];
        $childrenIds = Category::where('parent_id', $categoryId)->pluck('id')->toArray();
        
        foreach ($childrenIds as $childId) {
            $ids = array_merge($ids, $this->getAllCategoryIds($childId));
        }
        
        return array_unique($ids);
    }

    public function show(Product $product, Request $request): JsonResponse
    {
        $product->load([
            'category',
            'images' => fn ($q) => $q->orderBy('sort_order'),
            'specs' => fn ($q) => $q->orderBy('sort_order'),
            'variants' => fn ($q) => $q->where('is_active', true),
            'faqs' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order'),
            'news' => fn ($q) => $q->where('is_active', true)->orderByDesc('published_at')->orderBy('sort_order'),
            'reviews' => fn ($q) => $q->where('status', 'approved')->with('user')->orderBy('created_at', 'desc'),
            'flashSaleItems' => fn ($q) => $q->whereHas('flashSale', function($query) {
                $query->where('is_active', true)
                      ->where('start_at', '<=', now())
                      ->where('end_at', '>=', now());
            })->with('flashSale')
        ]);

        if (!$product->is_active) {
            return response()->json(['message' => 'Product not active'], 404);
        }

        return response()->json($product);
    }
}
