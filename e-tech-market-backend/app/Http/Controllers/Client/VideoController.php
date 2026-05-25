<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Video;
use App\Models\VideoCategory;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class VideoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Video::where('is_active', true)->with(['product', 'videoCategory']);

        if ($request->has('product_id')) {
            $query->where('product_id', $request->product_id);
        } elseif ($request->has('general_only')) {
            $query->whereNull('product_id');
        }

        if ($request->has('video_category_id')) {
            $query->where('video_category_id', $request->video_category_id);
        }

        $videos = $query->orderBy('sort_order', 'asc')->get();
        return response()->json($videos);
    }

    public function show(Video $video): JsonResponse
    {
        if (!$video->is_active) {
            return response()->json(['message' => 'Video không hoạt động'], 404);
        }
        $video->load(['product', 'videoCategory']);
        return response()->json($video);
    }

    public function categories(): JsonResponse
    {
        $categories = VideoCategory::where('is_active', true)
            ->orderBy('sort_order', 'asc')
            ->get();
        return response()->json($categories);
    }
}
