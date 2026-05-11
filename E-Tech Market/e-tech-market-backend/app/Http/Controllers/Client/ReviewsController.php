<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewsController extends Controller
{
    public function store(Product $product, Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$product->is_active) {
            return response()->json(['message' => 'Product not active'], 404);
        }

        $data = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'exp_performance' => ['nullable', 'integer', 'min:1', 'max:5'],
            'exp_battery' => ['nullable', 'integer', 'min:1', 'max:5'],
            'exp_camera' => ['nullable', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string'],
            'order_id' => ['nullable', 'integer', 'min:1'],
            'status' => ['nullable', 'string', 'in:pending,approved,rejected'],
        ]);

        $review = Review::query()->updateOrCreate(
            ['user_id' => $user->id, 'product_id' => $product->id],
            [
                'rating' => (int) $data['rating'],
                'exp_performance' => isset($data['exp_performance']) ? (int) $data['exp_performance'] : null,
                'exp_battery' => isset($data['exp_battery']) ? (int) $data['exp_battery'] : null,
                'exp_camera' => isset($data['exp_camera']) ? (int) $data['exp_camera'] : null,
                'comment' => $data['comment'] ?? null,
                'order_id' => $data['order_id'] ?? null,
                'status' => $data['status'] ?? 'approved',
            ]
        );

        $review->load(['product']);
        return response()->json($review, 201);
    }
}

