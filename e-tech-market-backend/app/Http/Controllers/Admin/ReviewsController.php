<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateReviewRequest;
use App\Http\Resources\Admin\ReviewResource;
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
        $status = $request->input('status');
        $reviews = $this->reviewService->getAdminReviews($status, (int) $request->input('limit', 20));

        return response()->json(ReviewResource::collection($reviews)->resolve());
    }

    public function update(UpdateReviewRequest $request, Review $review): JsonResponse
    {
        $updatedReview = $this->reviewService->updateReviewStatus($review, $request->input('status'));

        return response()->json((new ReviewResource($updatedReview))->resolve());
    }

    public function destroy(Review $review): JsonResponse
    {
        $this->reviewService->deleteReview($review);

        return response()->json(['message' => 'Review deleted successfully']);
    }
}
