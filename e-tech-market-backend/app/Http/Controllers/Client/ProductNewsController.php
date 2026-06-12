<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\ProductNews;
use Illuminate\Http\JsonResponse;

class ProductNewsController extends Controller
{
    public function __construct(private \App\Services\ProductNewsService $newsService)
    {
    }

    public function show(ProductNews $news): JsonResponse
    {
        try {
            $activeNews = $this->newsService->getActiveClientNews($news);
            return response()->json($activeNews);
        } catch (\Exception $e) {
            $code = $e->getCode() ?: 404;
            return response()->json(['message' => $e->getMessage()], $code);
        }
    }
}
