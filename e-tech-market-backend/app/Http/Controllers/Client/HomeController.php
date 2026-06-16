<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use App\Models\BlogPost;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Product;
use App\Models\Review;
use App\Models\Video;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HomeController extends Controller
{
    /**
     * Lấy tất cả dữ liệu homepage trong 1 request
     * Trả về: banners, coupons, categories, featured products, tab products, latest news, videos, reviews
     */
    public function index(Request $request): JsonResponse
    {
        // Banners
        $banners = Banner::where('is_active', true)
            ->orderBy('sort_order', 'asc')
            ->get();

        // Coupons (active + valid)
        $coupons = Coupon::where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('start_at')
                    ->orWhere('start_at', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('end_at')
                    ->orWhere('end_at', '>=', now());
            })
            ->orderBy('value', 'desc')
            ->limit(4)
            ->get();

        // Categories ordered by reviews cho tabs (parent only)
        $categories = Category::query()
            ->select('categories.*')
            ->leftJoin('products', 'products.category_id', '=', 'categories.id')
            ->leftJoin('reviews', function ($join) {
                $join->on('reviews.product_id', '=', 'products.id')
                    ->where('reviews.status', '=', 'approved');
            })
            ->where('categories.is_active', true)
            ->where('categories.type', 'product')
            ->whereNull('categories.deleted_at')
            ->whereNull('categories.parent_id')
            ->groupBy('categories.id')
            ->orderByRaw('COUNT(reviews.id) DESC')
            ->orderBy('categories.sort_order')
            ->limit(5)
            ->get();

        // Featured products (10 for web, 4 for app will use take())
        $featuredProducts = Product::where('is_active', true)
            ->where('is_featured', true)
            ->with(['category', 'variants'])
            ->withCount([
                'reviews as reviews_count' => fn ($q) => $q->where('status', 'approved'),
            ])
            ->limit(10)
            ->get();

        // Products cho từng category (preload cho tabs - 16 each for web, 4 for app)
        $categoryProducts = [];
        foreach ($categories as $category) {
            $categoryProducts[$category->id] = Product::where('is_active', true)
                ->where('category_id', $category->id)
                ->with(['category', 'variants'])
                ->withCount([
                    'reviews as reviews_count' => fn ($q) => $q->where('status', 'approved'),
                ])
                ->limit(16)
                ->get()
                ->values()
                ->all();
        }

        // Latest news (blog posts)
        $latestNews = BlogPost::where('is_published', true)
            ->whereNotNull('published_at')
            ->orderBy('published_at', 'desc')
            ->limit(5)
            ->get();

        // Videos
        $videos = Video::where('is_active', true)
            ->orderBy('sort_order', 'asc')
            ->limit(4)
            ->get();

        // Reviews (high rating)
        $reviews = Review::where('status', 'approved')
            ->where('rating', '>=', 5)
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->limit(6)
            ->get();

        return response()->json([
            'banners' => $banners,
            'coupons' => $coupons,
            'categories' => $categories,
            'featured_products' => $featuredProducts,
            'category_products' => $categoryProducts,
            'latest_news' => $latestNews,
            'videos' => $videos,
            'reviews' => $reviews,
        ]);
    }
}
