<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\ProductNews;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductNewsController extends Controller
{
    public function __construct(private \App\Services\ProductNewsService $newsService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $query = ProductNews::where('is_active', true)
                ->with('product');

            if ($request->filled('search')) {
                $search = $request->query('search');
                $searchSlugPattern = str_replace(' ', '%', \Illuminate\Support\Str::slug($search, ' '));
                $query->where(function($q) use ($search, $searchSlugPattern) {
                    $q->where('title', 'ilike', "%{$search}%")
                      ->orWhere('slug', 'ilike', "%{$searchSlugPattern}%");
                });
            }

            $news = $query->orderByDesc('published_at')->get();
            return response()->json(['data' => $news]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function show(ProductNews $news): JsonResponse
    {
        try {
            $activeNews = $this->newsService->getActiveClientNews($news);
            return response()->json($activeNews);
        } catch (\Exception $e) {
            $code = $e->getCode() ?: 404;
            abort($code, $e->getMessage());
        }
    }
}
