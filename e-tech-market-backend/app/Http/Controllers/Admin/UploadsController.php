<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class UploadsController extends Controller
{
    public function storeProductNewsThumbnail(Request $request): JsonResponse
    {
        $data = $request->validate([
            'file' => 'required|image|mimes:jpeg,png,jpg,webp|max:4096',
        ]);

        $path = $data['file']->store('product-news', 'public');
        return response()->json([
            'url' => Storage::disk('public')->url($path),
        ], 201);
    }

    public function storeBlogThumbnail(Request $request): JsonResponse
    {
        $data = $request->validate([
            'file' => 'required|image|mimes:jpeg,png,jpg,webp|max:4096',
        ]);

        $path = $data['file']->store('blog-thumbnails', 'public');
        return response()->json([
            'url' => Storage::disk('public')->url($path),
        ], 201);
    }
}

