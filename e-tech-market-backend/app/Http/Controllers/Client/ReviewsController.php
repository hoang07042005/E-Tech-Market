<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $limit = $request->input('limit', 10);
        $minRating = $request->input('min_rating', 5);

        $cacheKey = "reviews_index_{$limit}_{$minRating}";

        $reviews = \Illuminate\Support\Facades\Cache::remember($cacheKey, 300, function () use ($minRating, $limit) {
            return Review::query()
                ->where('status', 'approved')
                ->where('rating', '>=', (int) $minRating)
                ->with(['user:id,name,avatar_url', 'product:id,name,slug,main_image_url'])
                ->latest()
                ->limit((int) $limit)
                ->get();
        });

        return response()->json($reviews);
    }

    public function store(Product $product, Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $product->is_active) {
            return response()->json(['message' => 'Product not active'], 404);
        }

        $data = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'exp_performance' => ['nullable', 'integer', 'min:1', 'max:5'],
            'exp_battery' => ['nullable', 'integer', 'min:1', 'max:5'],
            'exp_camera' => ['nullable', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string'],
            'order_id' => ['nullable', 'integer', 'min:1'],
        ]);

        if (! empty($data['order_id'])) {
            $hasPurchased = Order::query()
                ->where('id', (int) $data['order_id'])
                ->where('user_id', $user->id)
                ->whereIn('status', ['delivered', 'completed'])
                ->whereHas('items', function ($q) use ($product) {
                    $q->where('product_id', $product->id);
                })
                ->exists();

            if (! $hasPurchased) {
                return response()->json(['message' => 'Order is not eligible for this review'], 422);
            }
        }

        $review = Review::query()->updateOrCreate(
            ['user_id' => $user->id, 'product_id' => $product->id],
            [
                'rating' => (int) $data['rating'],
                'exp_performance' => isset($data['exp_performance']) ? (int) $data['exp_performance'] : null,
                'exp_battery' => isset($data['exp_battery']) ? (int) $data['exp_battery'] : null,
                'exp_camera' => isset($data['exp_camera']) ? (int) $data['exp_camera'] : null,
                'comment' => $data['comment'] ?? null,
                'order_id' => $data['order_id'] ?? null,
                'status' => 'pending',
            ]
        );

        $review->load(['product']);

        return response()->json($review, 201);
    }
}
