<?php

namespace App\Http\Controllers\Admin;

use App\Http\Resources\Admin\BannerResource;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use Illuminate\Http\Request;
use App\Http\Requests\Admin\StoreBannerRequest;
use App\Http\Requests\Admin\UpdateBannerRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class BannerController extends Controller
{
    public function index(): JsonResponse
    {
        $banners = Banner::orderBy('sort_order', 'asc')->get();
        return response()->json(BannerResource::collection($banners)->resolve());
    }

    public function store(StoreBannerRequest $request): JsonResponse
    {
        

        $data = $request->except('image');
        $data['is_active'] = $request->has('is_active') ? filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN) : true;
        
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('banners', 'public');
            $data['image_url'] = '/storage/' . $path;
        }

        $banner = Banner::create($data);

        return response()->json((new BannerResource($banner))->resolve(), 201);
    }

    public function show(string $id): JsonResponse
    {
        $banner = Banner::findOrFail($id);
        return response()->json((new BannerResource($banner))->resolve());
    }

    public function update(UpdateBannerRequest $request, string $id): JsonResponse
    {
        $banner = Banner::findOrFail($id);

        

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

        return response()->json((new BannerResource($banner))->resolve());
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
