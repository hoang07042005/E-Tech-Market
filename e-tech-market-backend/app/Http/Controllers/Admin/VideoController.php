<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreVideoRequest;
use App\Http\Requests\Admin\UpdateVideoRequest;
use App\Http\Resources\Admin\VideoResource;
use App\Models\Video;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class VideoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Video::with(['product', 'products', 'videoCategory']);

        if ($request->has('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        $videos = $query->orderBy('sort_order', 'asc')->get();

        return response()->json(VideoResource::collection($videos)->resolve());
    }

    public function store(StoreVideoRequest $request): JsonResponse
    {

        $data = $request->except(['video_file', 'thumbnail_file']);

        $data['is_active'] = $request->has('is_active') ? filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN) : true;
        $data['sort_order'] = $request->has('sort_order') ? (int) $request->sort_order : 0;

        if ($request->exists('product_ids') && is_array($request->product_ids) && count($request->product_ids) > 0) {
            // Backward compatibility
            $data['product_id'] = (int) $request->product_ids[0];
            $data['video_category_id'] = null;
        } else if ($request->exists('product_id') && $request->product_id) {
            $data['product_id'] = (int) $request->product_id;
            $data['video_category_id'] = null;
        } else {
            $data['product_id'] = null;
            $data['video_category_id'] = $request->video_category_id ? (int) $request->video_category_id : null;
        }

        if ($request->hasFile('video_file')) {
            $path = $request->file('video_file')->store('videos', 'public');
            $data['video_url'] = '/storage/'.$path;
        }

        if ($request->hasFile('thumbnail_file')) {
            $path = $request->file('thumbnail_file')->store('videos/thumbnails', 'public');
            $data['thumbnail_url'] = '/storage/'.$path;
        }

        if (empty($data['video_url'])) {
            abort(422, 'The video url or video file field is required.');
        }

        $video = Video::create($data);
        if ($request->exists('product_ids') && is_array($request->product_ids)) {
            $video->products()->sync($request->product_ids);
        } elseif ($data['product_id']) {
            $video->products()->sync([$data['product_id']]);
        }

        $video->load(['product', 'products', 'videoCategory']);

        return response()->json((new VideoResource($video))->resolve(), 201);
    }

    public function show(string $id): JsonResponse
    {
        $video = Video::with(['product', 'products', 'videoCategory'])->findOrFail($id);

        return response()->json((new VideoResource($video))->resolve());
    }

    public function update(UpdateVideoRequest $request, string $id): JsonResponse
    {
        $video = Video::findOrFail($id);

        $data = $request->except(['video_file', 'thumbnail_file']);

        if ($request->has('is_active')) {
            $data['is_active'] = filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN);
        }
        if ($request->has('sort_order')) {
            $data['sort_order'] = (int) $request->sort_order;
        }

        if ($request->exists('product_ids') && is_array($request->product_ids)) {
            if (count($request->product_ids) > 0) {
                $data['product_id'] = (int) $request->product_ids[0];
                $data['video_category_id'] = null;
            } else {
                $data['product_id'] = null;
                if ($request->exists('video_category_id')) {
                    $data['video_category_id'] = $request->video_category_id ? (int) $request->video_category_id : null;
                }
            }
        } else if ($request->exists('product_id')) {
            if ($request->product_id) {
                $data['product_id'] = (int) $request->product_id;
                $data['video_category_id'] = null;
            } else {
                $data['product_id'] = null;
                if ($request->exists('video_category_id')) {
                    $data['video_category_id'] = $request->video_category_id ? (int) $request->video_category_id : null;
                }
            }
        } else {
            if ($request->exists('video_category_id')) {
                $data['video_category_id'] = $request->video_category_id ? (int) $request->video_category_id : null;
            }
        }

        if ($request->hasFile('video_file')) {
            if ($video->video_url && str_starts_with($video->video_url, '/storage/')) {
                Storage::disk('public')->delete(str_replace('/storage/', '', $video->video_url));
            }
            $path = $request->file('video_file')->store('videos', 'public');
            $data['video_url'] = '/storage/'.$path;
        }

        if ($request->hasFile('thumbnail_file')) {
            if ($video->thumbnail_url && str_starts_with($video->thumbnail_url, '/storage/')) {
                Storage::disk('public')->delete(str_replace('/storage/', '', $video->thumbnail_url));
            }
            $path = $request->file('thumbnail_file')->store('videos/thumbnails', 'public');
            $data['thumbnail_url'] = '/storage/'.$path;
        }

        $video->update($data);

        if ($request->exists('product_ids') && is_array($request->product_ids)) {
            $video->products()->sync($request->product_ids);
        } elseif ($request->exists('product_id') && $request->product_id) {
            $video->products()->sync([$request->product_id]);
        } elseif ($request->exists('product_id') && empty($request->product_id)) {
            $video->products()->sync([]);
        }

        $video->load(['product', 'products', 'videoCategory']);

        return response()->json((new VideoResource($video))->resolve());
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
