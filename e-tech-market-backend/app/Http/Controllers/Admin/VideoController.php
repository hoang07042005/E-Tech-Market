<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Video;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class VideoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Video::with(['product', 'videoCategory']);

        if ($request->has('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        $videos = $query->orderBy('sort_order', 'asc')->get();
        return response()->json($videos);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'product_id'        => 'nullable|integer|exists:products,id',
            'video_category_id' => 'nullable|integer|exists:video_categories,id',
            'title'             => 'nullable|string|max:255',
            'video_url'         => 'nullable|string|max:1000',
            'video_file'        => 'nullable|file|mimetypes:video/mp4,video/quicktime,video/ogg,video/webm|max:51200',
            'thumbnail_url'     => 'nullable|string|max:1000',
            'thumbnail_file'    => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
            'sort_order'        => 'nullable|integer',
            'is_active'         => 'nullable',
        ]);

        $data = $request->except(['video_file', 'thumbnail_file']);

        $data['is_active']  = $request->has('is_active') ? filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN) : true;
        $data['sort_order'] = $request->has('sort_order') ? (int) $request->sort_order : 0;

        if ($request->product_id) {
            $data['product_id']        = (int) $request->product_id;
            $data['video_category_id'] = null;
        } else {
            $data['product_id']        = null;
            $data['video_category_id'] = $request->video_category_id ? (int) $request->video_category_id : null;
        }

        if ($request->hasFile('video_file')) {
            $path = $request->file('video_file')->store('videos', 'public');
            $data['video_url'] = '/storage/' . $path;
        }

        if ($request->hasFile('thumbnail_file')) {
            $path = $request->file('thumbnail_file')->store('videos/thumbnails', 'public');
            $data['thumbnail_url'] = '/storage/' . $path;
        }

        if (empty($data['video_url'])) {
            return response()->json(['message' => 'The video url or video file field is required.'], 422);
        }

        $video = Video::create($data);
        $video->load(['product', 'videoCategory']);

        return response()->json($video, 201);
    }

    public function show(string $id): JsonResponse
    {
        $video = Video::with(['product', 'videoCategory'])->findOrFail($id);
        return response()->json($video);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $video = Video::findOrFail($id);

        $request->validate([
            'product_id'        => 'nullable|integer|exists:products,id',
            'video_category_id' => 'nullable|integer|exists:video_categories,id',
            'title'             => 'nullable|string|max:255',
            'video_url'         => 'nullable|string|max:1000',
            'video_file'        => 'nullable|file|mimetypes:video/mp4,video/quicktime,video/ogg,video/webm|max:51200',
            'thumbnail_url'     => 'nullable|string|max:1000',
            'thumbnail_file'    => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
            'sort_order'        => 'nullable|integer',
            'is_active'         => 'nullable',
        ]);

        $data = $request->except(['video_file', 'thumbnail_file']);

        if ($request->has('is_active')) {
            $data['is_active'] = filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN);
        }
        if ($request->has('sort_order')) {
            $data['sort_order'] = (int) $request->sort_order;
        }

        if ($request->has('product_id')) {
            if ($request->product_id) {
                $data['product_id']        = (int) $request->product_id;
                $data['video_category_id'] = null;
            } else {
                $data['product_id'] = null;
                if ($request->has('video_category_id')) {
                    $data['video_category_id'] = $request->video_category_id ? (int) $request->video_category_id : null;
                }
            }
        } else {
            if ($request->has('video_category_id')) {
                $data['video_category_id'] = $request->video_category_id ? (int) $request->video_category_id : null;
            }
        }

        if ($request->hasFile('video_file')) {
            if ($video->video_url && str_starts_with($video->video_url, '/storage/')) {
                Storage::disk('public')->delete(str_replace('/storage/', '', $video->video_url));
            }
            $path = $request->file('video_file')->store('videos', 'public');
            $data['video_url'] = '/storage/' . $path;
        }

        if ($request->hasFile('thumbnail_file')) {
            if ($video->thumbnail_url && str_starts_with($video->thumbnail_url, '/storage/')) {
                Storage::disk('public')->delete(str_replace('/storage/', '', $video->thumbnail_url));
            }
            $path = $request->file('thumbnail_file')->store('videos/thumbnails', 'public');
            $data['thumbnail_url'] = '/storage/' . $path;
        }

        $video->update($data);
        $video->load(['product', 'videoCategory']);

        return response()->json($video);
    }

    public function destroy(string $id): JsonResponse
    {
        $video = Video::findOrFail($id);

        if ($video->video_url && str_starts_with($video->video_url, '/storage/')) {
            Storage::disk('public')->delete(str_replace('/storage/', '', $video->video_url));
        }
        if ($video->thumbnail_url && str_starts_with($video->thumbnail_url, '/storage/')) {
            Storage::disk('public')->delete(str_replace('/storage/', '', $video->thumbnail_url));
        }

        $video->delete();
        return response()->json(['message' => 'Video deleted successfully']);
    }
}
