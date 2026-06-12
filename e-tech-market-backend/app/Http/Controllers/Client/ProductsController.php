<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProductsController extends Controller
{
    public function __construct(private \App\Services\ProductService $productService)
    {
    }

    public function index(Request $request): JsonResponse|AnonymousResourceCollection
    {
        $filters = $request->only(['category_id', 'brand', 'min_price', 'max_price', 'search', 'sort', 'order']);
        $limit = (int) $request->input('limit', 0);
        $products = $this->productService->getClientProducts($filters, $limit);

        return ProductResource::collection($products);
    }

    public function show(Product $product, Request $request): JsonResponse
    {
        try {
            $product = $this->productService->getClientProduct($product);
            return response()->json(new ProductResource($product));
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 404);
        }
    }

    public function related(Product $product): JsonResponse
    {
        $related = $this->productService->getRelatedProducts($product);

        return response()->json([
            'bought_together' => ProductResource::collection($related['bought_together']),
            'similar' => ProductResource::collection($related['similar']),
        ]);
    }
}
