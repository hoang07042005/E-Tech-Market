<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreProductRequest;
use App\Http\Requests\Admin\UpdateProductRequest;
use App\Http\Resources\Admin\ProductResource;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\ProductService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductsController extends Controller
{
    protected ProductService $productService;

    public function __construct(ProductService $productService)
    {
        $this->productService = $productService;
    }

    public function restockVariant(ProductVariant $variant, Request $request): JsonResponse
    {
        $data = $request->validate([
            'add' => ['required', 'integer', 'min:1', 'max:1000000'],
        ]);

        $updatedVariant = $this->productService->restockVariant($variant, (int) $data['add']);

        return response()->json($updatedVariant);
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['search']);
        $products = $this->productService->getAdminProducts($filters, (int) $request->query('per_page', 20));

        $collection = $products->getCollection()->map(function (Product $item) {
            return (new ProductResource($item))->resolve();
        });
        $products->setCollection($collection);
        $result = $products->toArray();
        $result['data'] = $this->cleanUtf8($result['data']);

        return response()->json($result);
    }

    public function show(Product $product): JsonResponse
    {
        $product = $this->productService->getAdminProduct($product);

        return response()->json($this->cleanUtf8((new ProductResource($product))->resolve()));
    }

    public function store(StoreProductRequest $request): JsonResponse
    {
        $data = $request->validated();

        $product = $this->productService->createProduct($data, $request);

        return response()->json($this->cleanUtf8((new ProductResource($product))->resolve()), 201);
    }

    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        $data = $request->validated();

        $product = $this->productService->updateProduct($product, $data, $request);

        return response()->json($this->cleanUtf8((new ProductResource($product))->resolve()));
    }

    public function destroy(Product $product): JsonResponse
    {
        $this->productService->deleteProduct($product);

        return response()->json(['message' => 'Deleted']);
    }

    private function cleanUtf8(mixed $data): mixed
    {
        if (is_string($data)) {
            // Strip invalid UTF-8 sequences more robustly
            return iconv('UTF-8', 'UTF-8//IGNORE', $data);
        }
        if (is_array($data)) {
            foreach ($data as $key => $value) {
                $data[$key] = $this->cleanUtf8($value);
            }
        }

        return $data;
    }
}
