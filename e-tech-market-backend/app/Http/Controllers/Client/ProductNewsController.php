<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\ProductNews;
use Illuminate\Http\JsonResponse;

class ProductNewsController extends Controller
{
    public function show(ProductNews $news): JsonResponse
    {
        if (! $news->is_active) {
            return response()->json(['message' => 'Not found'], 404);
        }

        return response()->json($news);
    }
}

