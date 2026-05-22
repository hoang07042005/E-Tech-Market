<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class BannerController extends Controller
{
    public function index(): JsonResponse
    {
        $banners = Banner::orderBy('sort_order', 'asc')->get();
        return response()->json($banners);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'image' => 'required|image|max:5120',
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'link_url' => 'nullable|string|max:255',
            'is_active' => 'nullable',
            'sort_order' => 'nullable|integer',
        ]);

        $data = $request->except('image');
        $data['is_active'] = $request->has('is_active') ? filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN) : true;
        
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('banners', 'public');
            $data['image_url'] = '/storage/' . $path;
        }

        $banner = Banner::create($data);

        return response()->json($banner, 201);
    }

    public function show(string $id): JsonResponse
    {
        $banner = Banner::findOrFail($id);
        return response()->json($banner);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $banner = Banner::findOrFail($id);

        $request->validate([
            'image' => 'nullable|image|max:5120',
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'link_url' => 'nullable|string|max:255',
            'is_active' => 'nullable',
            'sort_order' => 'nullable|integer',
        ]);

        $data = $request->except('image');
        if ($request->has('is_active')) {
            $data['is_active'] = filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN);
        }

        if ($request->hasFile('image')) {
            if ($banner->image_url) {
                $oldPath = str_replace('/storage/', '', $banner->image_url);
                Storage::disk('public')->delete($oldPath);
            }
            $path = $request->file('image')->store('banners', 'public');
            $data['image_url'] = '/storage/' . $path;
        }

        $banner->update($data);

        return response()->json($banner);
    }

    public function destroy(string $id): JsonResponse
    {
        $banner = Banner::findOrFail($id);

        if ($banner->image_url) {
            $oldPath = str_replace('/storage/', '', $banner->image_url);
            Storage::disk('public')->delete($oldPath);
        }
        $banner->delete();

        return response()->json(['message' => 'Banner deleted successfully']);
    }
}
