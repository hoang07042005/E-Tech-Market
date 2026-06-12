<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreProductNewsRequest;
use App\Http\Requests\Admin\UpdateProductNewsRequest;
use App\Http\Resources\Admin\ProductNewsResource;
use App\Models\Product;
use App\Models\ProductNews;
use App\Support\HtmlSanitizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class ProductNewsController extends Controller
{
    public function __construct(private \App\Services\ProductNewsService $newsService)
    {
    }

    public function index(Product $product): JsonResponse
    {
        $items = $this->newsService->getAdminProductNews($product);
        return response()->json(ProductNewsResource::collection($items)->resolve());
    }

    public function store(Product $product, StoreProductNewsRequest $request): JsonResponse
    {
        $news = $this->newsService->createProductNews($product, $request->validated());
        return response()->json($news, 201);
    }

    public function update(Product $product, ProductNews $news, UpdateProductNewsRequest $request): JsonResponse
    {
        try {
            $updatedNews = $this->newsService->updateProductNews($product, $news, $request->validated());
            return response()->json($updatedNews);
        } catch (\Exception $e) {
            $code = $e->getCode() ?: 404;
            return response()->json(['message' => $e->getMessage()], $code);
        }
    }

    public function destroy(Product $product, ProductNews $news): JsonResponse
    {
        try {
            $this->newsService->deleteProductNews($product, $news);
            return response()->json(['message' => 'Deleted']);
        } catch (\Exception $e) {
            $code = $e->getCode() ?: 404;
            return response()->json(['message' => $e->getMessage()], $code);
        }
    }
}
