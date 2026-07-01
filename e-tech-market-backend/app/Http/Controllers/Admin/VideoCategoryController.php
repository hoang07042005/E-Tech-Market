<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreVideoCategoryRequest;
use App\Http\Requests\Admin\UpdateVideoCategoryRequest;
use App\Http\Resources\Admin\VideoCategoryResource;
use App\Models\VideoCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class VideoCategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $categories = VideoCategory::orderBy('sort_order', 'asc')->get();

        return response()->json($categories);
    }

    public function store(StoreVideoCategoryRequest $request): JsonResponse
    {

        $slug = $request->slug
            ? $request->slug
            : Str::slug($request->name);

        // Ensure unique slug
        $baseSlug = $slug;
        $i = 1;
        while (VideoCategory::where('slug', $slug)->exists()) {
            $slug = $baseSlug.'-'.$i++;
        }

        $category = VideoCategory::create([
            'name' => $request->name,
            'slug' => $slug,
            'description' => $request->description,
            'is_active' => $request->has('is_active') ? filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN) : true,
            'sort_order' => $request->sort_order ?? 0,
        ]);

        return response()->json((new VideoCategoryResource($category))->resolve(), 201);
    }

    public function update(UpdateVideoCategoryRequest $request, VideoCategory $videoCategory): JsonResponse
    {

        $data = $request->only(['name', 'description', 'sort_order']);

        if ($request->has('slug') && $request->slug) {
            $data['slug'] = $request->slug;
        } elseif ($request->has('name')) {
            $data['slug'] = Str::slug($request->name);
        }

        if ($request->has('is_active')) {
            $data['is_active'] = filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN);
        }

        $videoCategory->update($data);

        return response()->json((new VideoCategoryResource($videoCategory))->resolve());
    }

    public function show(VideoCategory $videoCategory): JsonResponse
    {
        return response()->json((new VideoCategoryResource($videoCategory))->resolve());
    }

    public function destroy(VideoCategory $videoCategory): JsonResponse
    {
        $videoCategory->delete();

        return response()->json(['message' => 'Danh mục video đã được xóa.']);
    }
}
