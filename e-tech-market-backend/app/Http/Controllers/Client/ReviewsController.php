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
    public function __construct(private \App\Services\ReviewService $reviewService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $limit = (int) $request->input('limit', 10);
        $minRating = (int) $request->input('min_rating', 5);

        $reviews = $this->reviewService->getClientReviews($limit, $minRating);

        return response()->json($reviews);
    }

    public function store(Product $product, Request $request): JsonResponse
    {
        $data = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'exp_performance' => ['nullable', 'integer', 'min:1', 'max:5'],
            'exp_battery' => ['nullable', 'integer', 'min:1', 'max:5'],
            'exp_camera' => ['nullable', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string'],
            'order_id' => ['nullable', 'integer', 'min:1'],
            'media' => ['nullable', 'array', 'max:8'],
            'media.*' => ['file', 'mimetypes:image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm', 'max:51200'],
        ]);

        try {
            $data['media'] = $request->file('media') ?: [];
            $review = $this->reviewService->submitReview($request->user(), $product, $data);
            \Log::info('[ReviewStore] Dart app request success', ['id' => $review->id]);
            return response()->json($review, 201);
        } catch (\Exception $e) {
            \Log::error('[ReviewStore] Exception caught', ['message' => $e->getMessage()]);
            $status = (int) $e->getCode();
            if ($status < 100 || $status > 599) {
                $status = 500;
            }
            return response()->json(['message' => $e->getMessage()], $status);
        }
    }
}
