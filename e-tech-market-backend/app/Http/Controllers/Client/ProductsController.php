<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProductsController extends Controller
{
    public function index(Request $request): JsonResponse|AnonymousResourceCollection
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

        if ($request->filled('min_price') || $request->filled('max_price')) {
            $query->whereHas('variants', function ($q) use ($request) {
                if ($request->filled('min_price')) {
                    $q->where('price', '>=', (float) $request->input('min_price'));
                }
                if ($request->filled('max_price')) {
                    $q->where('price', '<=', (float) $request->input('max_price'));
                }
                $q->where('is_active', true);
            });
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('description', 'ilike', "%{$search}%");
            });
        }

        $sort = $request->input('sort', 'created_at');
        $order = $request->input('order', 'desc');

        // Validate sort field
        $allowedSortFields = ['created_at', 'price', 'name'];
        if (! in_array($sort, $allowedSortFields)) {
            $sort = 'created_at';
        }
        $order = strtolower($order) === 'asc' ? 'asc' : 'desc';

        if ($sort === 'price') {
            // Sort by the minimum price of active variants
            $query->orderBy(
                \App\Models\ProductVariant::select('price')
                    ->whereColumn('product_id', 'products.id')
                    ->where('is_active', true)
                    ->orderBy('price', 'asc')
                    ->limit(1),
                $order
            );
        } else {
            $query->orderBy($sort, $order);
        }

        $cacheKey = 'products_index_'.md5(serialize($request->all()));

        // Register this cache key so targeted invalidation can find it
        $registry = \Illuminate\Support\Facades\Cache::get('_cache_registry_products', []);
        if (! in_array($cacheKey, $registry, true)) {
            $registry[] = $cacheKey;
            // Keep registry max 200 entries to prevent unbounded growth
            $registry = array_slice($registry, -200);
            \Illuminate\Support\Facades\Cache::put('_cache_registry_products', $registry, 600);
        }

        $products = \Illuminate\Support\Facades\Cache::remember($cacheKey, 300, function () use ($query, $request) {
            return $query
                ->with(['category', 'variants'])
                ->withCount([
                    'reviews as reviews_count' => fn ($q) => $q->where('status', 'approved'),
                ])
                ->withAvg([
                    'reviews as avg_rating' => fn ($q) => $q->where('status', 'approved'),
                ], 'rating')
                ->paginate((int) $request->input('limit', 12));
        });

        return ProductResource::collection($products);
    }

    /**
     * Get category ID and all its descendants' IDs.
     */
    private function getAllCategoryIds($categoryId): array
    {
        $ids = [$categoryId];
        $queue = [$categoryId];

        while (! empty($queue)) {
            $childrenIds = Category::whereIn('parent_id', $queue)->pluck('id')->all();
            $queue = array_values(array_diff($childrenIds, $ids));
            if (empty($queue)) {
                break;
            }
            $ids = array_merge($ids, $queue);
        }

        return array_values(array_unique($ids));
    }

    public function show(Product $product, Request $request): JsonResponse
    {
        $product->load([
            'category',
            'images' => fn ($q) => $q->orderBy('sort_order'),
            'specs' => fn ($q) => $q->orderBy('sort_order'),
            'variants' => fn ($q) => $q->where('is_active', true),
            'videos' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order'),
            'faqs' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order'),
            'news' => fn ($q) => $q->where('is_active', true)->orderByDesc('published_at')->orderBy('sort_order'),
            'reviews' => fn ($q) => $q->where('status', 'approved')->with('user')->orderBy('created_at', 'desc'),
            'flashSaleItems' => fn ($q) => $q->whereHas('flashSale', function ($query) {
                $query->where('status', \App\Models\FlashSale::STATUS_ACTIVE)
                    ->where('start_at', '<=', now())
                    ->where('end_at', '>=', now());
            })->with('flashSale'),
        ]);

        if (! $product->is_active) {
            return response()->json(['message' => 'Product not active'], 404);
        }

        return response()->json(new ProductResource($product));
    }

    public function related(Product $product): JsonResponse
    {
        // 1. Frequently Bought Together (Cross-sell)
        // Find order IDs that contain this product
        $orderIds = \App\Models\OrderItem::where('product_id', $product->id)
            ->pluck('order_id')
            ->unique();

        $boughtTogether = \App\Models\Product::query()
            ->where('is_active', true)
            ->where('id', '!=', $product->id)
            ->whereIn('id', function ($query) use ($orderIds) {
                $query->select('product_id')
                    ->from('order_items')
                    ->whereIn('order_id', $orderIds);
            })
            ->with(['category', 'variants'])
            ->withCount([
                'reviews as reviews_count' => fn ($q) => $q->where('status', 'approved'),
            ])
            ->withAvg([
                'reviews as avg_rating' => fn ($q) => $q->where('status', 'approved'),
            ], 'rating')
            ->limit(4)
            ->get();

        // If not enough data from orders, suggest accessories or same-brand products
        if ($boughtTogether->count() < 4) {
            $extra = \App\Models\Product::query()
                ->where('is_active', true)
                ->where('id', '!=', $product->id)
                ->whereNotIn('id', $boughtTogether->pluck('id'))
                ->where(function ($q) use ($product) {
                    $q->where('brand', $product->brand)
                        ->orWhereHas('category', function ($cq) {
                            $cq->where('name', 'ilike', '%phụ kiện%')
                                ->orWhere('name', 'ilike', '%linh kiện%');
                        });
                })
                ->with(['category', 'variants'])
                ->withCount([
                    'reviews as reviews_count' => fn ($q) => $q->where('status', 'approved'),
                ])
                ->withAvg([
                    'reviews as avg_rating' => fn ($q) => $q->where('status', 'approved'),
                ], 'rating')
                ->limit(4 - $boughtTogether->count())
                ->get();

            $boughtTogether = $boughtTogether->concat($extra);
        }

        // 2. Similar Products (Customers also bought / Up-sell)
        $similar = \App\Models\Product::query()
            ->where('is_active', true)
            ->where('id', '!=', $product->id)
            ->where('category_id', $product->category_id)
            ->with(['category', 'variants'])
            ->withCount([
                'reviews as reviews_count' => fn ($q) => $q->where('status', 'approved'),
            ])
            ->withAvg([
                'reviews as avg_rating' => fn ($q) => $q->where('status', 'approved'),
            ], 'rating')
            ->orderBy('reviews_count', 'desc') // Order by popularity (review count)
            ->limit(10)
            ->get();

        return response()->json([
            'bought_together' => ProductResource::collection($boughtTogether),
            'similar' => ProductResource::collection($similar),
        ]);
    }
}
