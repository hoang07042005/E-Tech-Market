<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * @OA\Info(
 *     title="E-Tech Market API",
 *     version="1.0.0",
 *     description="API for E-Tech Market e-commerce platform",
 *     @OA\Contact(
 *         email="support@etech.com"
 *     )
 * )
 * @OA\Server(
 *     url="http://localhost:8000/api/v1"
 * )
 * @OA\SecurityScheme(
 *     securityScheme="sanctum",
 *     type="http",
 *     scheme="bearer",
 *     bearerFormat="JWT"
 * )
 */
class ProductsController extends Controller
{
    public function __construct(private \App\Services\ProductService $productService)
    {
    }

    /**
     * @OA\Get(
     *     path="/products",
     *     tags={"Products"},
     *     summary="Get list of products",
     *     description="Returns paginated list of products with filters",
     *     operationId="getProducts",
     *     @OA\Parameter(
     *         name="category_id",
     *         in="query",
     *         description="Filter by category ID",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Parameter(
     *         name="brand",
     *         in="query",
     *         description="Filter by brand",
     *         @OA\Schema(type="string")
     *     ),
     *     @OA\Parameter(
     *         name="min_price",
     *         in="query",
     *         description="Minimum price filter",
     *         @OA\Schema(type="number")
     *     ),
     *     @OA\Parameter(
     *         name="max_price",
     *         in="query",
     *         description="Maximum price filter",
     *         @OA\Schema(type="number")
     *     ),
     *     @OA\Parameter(
     *         name="search",
     *         in="query",
     *         description="Search query",
     *         @OA\Schema(type="string")
     *     ),
     *     @OA\Parameter(
     *         name="sort",
     *         in="query",
     *         description="Sort field (price, created_at, name)",
     *         @OA\Schema(type="string")
     *     ),
     *     @OA\Parameter(
     *         name="order",
     *         in="query",
     *         description="Sort order (asc, desc)",
     *         @OA\Schema(type="string")
     *     ),
     *     @OA\Parameter(
     *         name="limit",
     *         in="query",
     *         description="Number of items to return",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation",
     *         @OA\JsonContent(
     *             type="array",
     *             @OA\Items(ref="#/components/schemas/Product")
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Bad request"
     *     )
     * )
     */
    public function index(Request $request): JsonResponse|AnonymousResourceCollection
    {
        $filters = $request->only(['category_id', 'brand', 'min_price', 'max_price', 'search', 'sort', 'order', 'is_featured']);
        $limit = (int) $request->input('limit', 0);
        $products = $this->productService->getClientProducts($filters, $limit);

        return ProductResource::collection($products);
    }

    /**
     * @OA\Get(
     *     path="/products/{id}",
     *     tags={"Products"},
     *     summary="Get product by ID",
     *     description="Returns single product details",
     *     operationId="getProduct",
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Product ID",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation",
     *         @OA\JsonContent(ref="#/components/schemas/Product")
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Product not found"
     *     )
     * )
     */
    public function show(Product $product, Request $request): JsonResponse
    {
        try {
            $product = $this->productService->getClientProduct($product);
            return response()->json(new ProductResource($product));
        } catch (\Exception $e) {
            abort(404, $e->getMessage());
        }
    }

    /**
     * @OA\Get(
     *     path="/products/{id}/related",
     *     tags={"Products"},
     *     summary="Get related products",
     *     description="Returns related and bought together products",
     *     operationId="getRelatedProducts",
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Product ID",
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation"
     *     )
     * )
     */
    public function related(Product $product): JsonResponse
    {
        $related = $this->productService->getRelatedProducts($product);

        return response()->json([
            'bought_together' => ProductResource::collection($related['bought_together']),
            'similar' => ProductResource::collection($related['similar']),
        ]);
    }
}
