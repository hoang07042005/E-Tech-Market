<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
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
        $query = Product::with(['category', 'images', 'specs', 'variants', 'faqs', 'inventoryItems']);

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('brand', 'like', "%{$search}%")
                  ->orWhereHas('category', function ($catQ) use ($search) {
                      $catQ->where('name', 'like', "%{$search}%");
                  });
            });
        }

        $perPage = (int) $request->query('per_page', 20);
        $perPage = max(5, min($perPage, 100)); // clamp 5–100

        $products = $query->orderBy('created_at', 'desc')->paginate($perPage);
        $result = $products->toArray();
        $result['data'] = $this->cleanUtf8($result['data']);
        return response()->json($result);
    }

    public function show(Product $product): JsonResponse
    {
        return response()->json($this->cleanUtf8($product->load(['category', 'images', 'specs', 'variants', 'faqs', 'inventoryItems'])->toArray()));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'required|exists:categories,id',
            'brand' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'rich_html' => 'nullable|string',
            'is_active' => 'boolean',
            'images' => 'nullable|array|max:12',
            'images.*' => 'image|mimes:jpeg,png,jpg,webp|max:2048',
            'specs' => 'nullable|string', // JSON string
            'variants' => 'nullable|string', // JSON string
            'faqs' => 'nullable|string', // JSON string
        ]);

        $product = $this->productService->createProduct($data, $request);

        return response()->json($this->cleanUtf8($product->toArray()), 201);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'required|exists:categories,id',
            'brand' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'rich_html' => 'nullable|string',
            'is_active' => 'boolean',
            'images' => 'nullable|array|max:12',
            'images.*' => 'image|mimes:jpeg,png,jpg,webp|max:2048',
            'keep_existing_images' => 'nullable',
            'specs' => 'nullable|string', // JSON string
            'variants' => 'nullable|string', // JSON string
            'faqs' => 'nullable|string', // JSON string
        ]);

        $product = $this->productService->updateProduct($product, $data, $request);

        return response()->json($this->cleanUtf8($product->toArray()));
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
            return iconv("UTF-8", "UTF-8//IGNORE", $data);
        }
        if (is_array($data)) {
            foreach ($data as $key => $value) {
                $data[$key] = $this->cleanUtf8($value);
            }
        }
        return $data;
    }
}
