<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
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

        return response()->json($reviews);
    }

    public function update(Request $request, Review $review): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:pending,approved,rejected',
        ]);

        $review->update(['status' => $request->input('status')]);

        return response()->json($review);
    }

    public function destroy(Review $review): JsonResponse
    {
        $review->delete();
        return response()->json(['message' => 'Review deleted successfully']);
    }
}
