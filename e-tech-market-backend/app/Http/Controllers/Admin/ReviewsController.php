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
    public function index(Request $request): JsonResponse
    {
        $status = $request->input('status');

        $query = Review::query()->with(['user', 'product']);

        if ($status) {
            $query->where('status', $status);
        }

        $reviews = $query->orderBy('created_at', 'desc')->paginate((int) $request->input('limit', 20));

        return response()->json(ReviewResource::collection($reviews)->resolve());
    }

    public function update(UpdateReviewRequest $request, Review $review): JsonResponse
    {

        $review->update(['status' => $request->input('status')]);

        return response()->json((new ReviewResource($review))->resolve());
    }

    public function destroy(Review $review): JsonResponse
    {
        $review->delete();

        return response()->json(['message' => 'Review deleted successfully']);
    }
}
