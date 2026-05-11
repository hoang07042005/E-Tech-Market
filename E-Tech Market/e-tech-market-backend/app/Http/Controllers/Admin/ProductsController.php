<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductSpec;
use App\Models\ProductVariant;
use App\Support\HtmlSanitizer;
use App\Support\ProductInventorySync;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class ProductsController extends Controller
{
    public function restockVariant(ProductVariant $variant, Request $request): JsonResponse
    {
        $data = $request->validate([
            'add' => ['required', 'integer', 'min:1', 'max:1000000'],
        ]);

        $add = (int) $data['add'];
        DB::transaction(function () use ($variant, $add) {
            ProductVariant::query()
                ->where('id', $variant->id)
                ->update([
                    'stock_quantity' => DB::raw('COALESCE(stock_quantity, 0) + ' . $add),
                ]);
        });

        return response()->json($variant->fresh());
    }
    public function index(): JsonResponse
    {
        $products = Product::with(['category', 'images', 'specs', 'variants', 'faqs', 'inventoryItems'])->orderBy('created_at', 'desc')->get();
        return response()->json($products);
    }

    public function show(Product $product): JsonResponse
    {
        return response()->json($product->load(['category', 'images', 'specs', 'variants', 'faqs', 'inventoryItems']));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'required|exists:categories,id',
            'brand' => 'nullable|string|max:100',
            'price' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'rich_html' => 'nullable|string',
            'is_active' => 'boolean',
            'images' => 'nullable|array|max:12',
            'images.*' => 'image|mimes:jpeg,png,jpg,webp|max:2048',
            'specs' => 'nullable|string', // JSON string
            'variants' => 'nullable|string', // JSON string
            'faqs' => 'nullable|string', // JSON string
        ]);

        return DB::transaction(function () use ($data, $request) {
            $data['slug'] = Str::slug($data['name']) . '-' . uniqid();
            $data['rich_html'] = HtmlSanitizer::sanitize($data['rich_html'] ?? null);
            $product = Product::create($data);

            // Handle Images
            if ($request->hasFile('images')) {
                foreach ($request->file('images') as $index => $image) {
                    $path = $image->store('products', 'public');
                    $url = Storage::url($path);
                    
                    if ($index === 0) {
                        $product->update(['main_image_url' => $url]);
                    }

                    ProductImage::create([
                        'product_id' => $product->id,
                        'image_url' => $url,
                        'is_primary' => $index === 0,
                        'sort_order' => $index,
                    ]);
                }
            }

            // Handle Variants (trước specs để có product_variant_id / map index → id)
            $variantIdsByIndex = [];
            if ($request->filled('variants')) {
                $variants = json_decode($request->variants, true);
                if (is_array($variants)) {
                    foreach ($variants as $index => $vData) {
                        // Generate a high-uniqueness SKU to avoid any database conflicts
                        $sku = strtoupper(substr($product->name, 0, 3)) . '-' . $product->id . '-' . strtoupper(dechex(time())) . '-' . ($index + 1);
                        if (!empty($vData['sku']) && !str_starts_with($vData['sku'], strtoupper(substr($product->name, 0, 3)))) {
                            $sku = $vData['sku']; // Only use custom SKU if it doesn't look like our auto pattern
                        }
                        
                        $variant = ProductVariant::create([
                            'product_id' => $product->id,
                            'variant_name' => $vData['variant_name'],
                            'color' => $vData['color'] ?? null,
                            'configuration' => $vData['configuration'] ?? null,
                            'sku' => $sku,
                            'price' => $vData['price'],
                            'stock_quantity' => $vData['stock_quantity'] ?? 0,
                            'is_active' => true,
                        ]);

                        // Handle Variant Image Upload
                        if ($request->hasFile("variant_image_{$index}")) {
                            $vPath = $request->file("variant_image_{$index}")->store('variants', 'public');
                            $variant->update(['image_url' => Storage::url($vPath)]);
                        }

                        $variantIdsByIndex[$index] = $variant->id;
                    }
                }
            }

            // Handle Specs (sau variants — hỗ trợ product_variant_index khi tạo mới)
            if ($request->filled('specs')) {
                $specs = json_decode($request->specs, true);
                if (is_array($specs)) {
                    $this->replaceProductSpecsFromPayload($product, $specs, $variantIdsByIndex);
                }
            }

            // Handle FAQs
            if ($request->filled('faqs')) {
                $faqs = json_decode($request->faqs, true);
                if (is_array($faqs)) {
                    foreach ($faqs as $index => $faq) {
                        if (empty($faq['question']) || empty($faq['answer'])) {
                            continue;
                        }
                        $product->faqs()->create([
                            'question' => $faq['question'],
                            'answer' => $faq['answer'],
                            'sort_order' => $faq['sort_order'] ?? $index,
                            'is_active' => $faq['is_active'] ?? true,
                        ]);
                    }
                }
            }

            ProductInventorySync::syncFromVariants($product->fresh(['variants']));

            return response()->json($product->fresh()->load(['images', 'specs', 'variants', 'faqs', 'inventoryItems']), 201);
        });
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'required|exists:categories,id',
            'brand' => 'nullable|string|max:100',
            'price' => 'required|numeric|min:0',
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

        return DB::transaction(function () use ($data, $request, $product) {
            $data['rich_html'] = HtmlSanitizer::sanitize($data['rich_html'] ?? null);
            $product->update($data);

            // Handle Images
            if ($request->hasFile('images')) {
                if ($request->input('keep_existing_images') !== 'true') {
                    foreach ($product->images as $img) {
                        $oldPath = str_replace('/storage/', '', $img->image_url);
                        Storage::disk('public')->delete($oldPath);
                        $img->delete();
                    }
                    $product->update(['main_image_url' => null]);
                }

                foreach ($request->file('images') as $index => $image) {
                    $path = $image->store('products', 'public');
                    $url = Storage::url($path);
                    
                    if ($index === 0 && !$product->main_image_url) {
                        $product->update(['main_image_url' => $url]);
                    }

                    ProductImage::create([
                        'product_id' => $product->id,
                        'image_url' => $url,
                        'is_primary' => false,
                        'sort_order' => $product->images()->count(),
                    ]);
                }
            }

            // Handle Variants — upsert theo id: giữ bản ghi cũ, chỉ xóa ảnh khi đổi ảnh / xóa variant
            $variantIdsByIndex = [];
            if ($request->filled('variants')) {
                $variants = json_decode($request->variants, true);
                if (is_array($variants)) {
                    $prefix = strtoupper(substr($product->name, 0, 3));

                    $idsInPayload = collect($variants)
                        ->pluck('id')
                        ->filter(static fn ($id) => $id !== null && $id !== '')
                        ->map(static fn ($id) => (int) $id)
                        ->unique()
                        ->values()
                        ->all();

                    $deleteVariantDiskImage = static function (?string $publicUrl): void {
                        if (! $publicUrl) {
                            return;
                        }
                        Storage::disk('public')->delete(str_replace('/storage/', '', $publicUrl));
                    };

                    // Variant không còn trong form (hoặc gửi lại toàn bộ không có id → thay trọn bộ)
                    if ($idsInPayload === []) {
                        foreach ($product->variants()->get() as $oldV) {
                            $deleteVariantDiskImage($oldV->image_url);
                            $oldV->delete();
                        }
                    } else {
                        foreach ($product->variants()->whereNotIn('id', $idsInPayload)->get() as $oldV) {
                            $deleteVariantDiskImage($oldV->image_url);
                            $oldV->delete();
                        }
                    }

                    foreach ($variants as $index => $vData) {
                        $existing = null;
                        if (! empty($vData['id'])) {
                            $existing = $product->variants()->whereKey((int) $vData['id'])->first();
                        }

                        if ($existing) {
                            $sku = $existing->sku;
                            if (! empty($vData['sku']) && trim((string) $vData['sku']) !== '') {
                                $sku = $vData['sku'];
                            }

                            $existing->update([
                                'variant_name' => $vData['variant_name'],
                                'color' => $vData['color'] ?? null,
                                'configuration' => $vData['configuration'] ?? null,
                                'sku' => $sku,
                                'price' => $vData['price'],
                                'stock_quantity' => $vData['stock_quantity'] ?? 0,
                                'is_active' => $vData['is_active'] ?? true,
                                'image_url' => $vData['image_url'] ?? $existing->image_url,
                            ]);
                            $variant = $existing;
                        } else {
                            $sku = $prefix . '-' . $product->id . '-' . strtoupper(dechex(time())) . '-' . ($index + 1);
                            if (! empty($vData['sku']) && ! str_starts_with($vData['sku'], $prefix)) {
                                $sku = $vData['sku'];
                            }

                            $variant = ProductVariant::create([
                                'product_id' => $product->id,
                                'variant_name' => $vData['variant_name'],
                                'color' => $vData['color'] ?? null,
                                'configuration' => $vData['configuration'] ?? null,
                                'sku' => $sku,
                                'price' => $vData['price'],
                                'stock_quantity' => $vData['stock_quantity'] ?? 0,
                                'is_active' => true,
                                'image_url' => $vData['image_url'] ?? null,
                            ]);
                        }

                        if ($request->hasFile("variant_image_{$index}")) {
                            $deleteVariantDiskImage($variant->image_url);
                            $vPath = $request->file("variant_image_{$index}")->store('variants', 'public');
                            $variant->update(['image_url' => Storage::url($vPath)]);
                        }

                        $variantIdsByIndex[$index] = $variant->id;
                    }
                }
            }

            // Handle Specs (sau variants)
            if ($request->filled('specs')) {
                $specs = json_decode($request->specs, true);
                if (is_array($specs)) {
                    $this->replaceProductSpecsFromPayload($product->fresh(), $specs, $variantIdsByIndex);
                }
            }

            // Handle FAQs
            if ($request->filled('faqs')) {
                $faqs = json_decode($request->faqs, true);
                if (is_array($faqs)) {
                    $product->faqs()->delete();
                    foreach ($faqs as $index => $faq) {
                        if (empty($faq['question']) || empty($faq['answer'])) {
                            continue;
                        }
                        $product->faqs()->create([
                            'question' => $faq['question'],
                            'answer' => $faq['answer'],
                            'sort_order' => $faq['sort_order'] ?? $index,
                            'is_active' => $faq['is_active'] ?? true,
                        ]);
                    }
                }
            }

            ProductInventorySync::syncFromVariants($product->fresh(['variants']));

            return response()->json($product->fresh()->load(['images', 'specs', 'variants', 'faqs', 'inventoryItems']));
        });
    }

    /**
     * @param  array<int, int>  $variantIdsByIndex  index trong form variant → id sau khi lưu
     */
    private function replaceProductSpecsFromPayload(Product $product, array $specs, array $variantIdsByIndex): void
    {
        $product->specs()->delete();

        foreach ($specs as $index => $spec) {
            if (empty($spec['spec_key'])) {
                continue;
            }

            $variantId = null;
            if (! empty($spec['product_variant_id'])) {
                $cand = (int) $spec['product_variant_id'];
                if ($product->variants()->whereKey($cand)->exists()) {
                    $variantId = $cand;
                }
            } elseif (array_key_exists('product_variant_index', $spec)
                && $spec['product_variant_index'] !== null
                && $spec['product_variant_index'] !== '') {
                $idx = (int) $spec['product_variant_index'];
                $variantId = $variantIdsByIndex[$idx] ?? null;
            }

            $specGroup = isset($spec['spec_group']) ? trim((string) $spec['spec_group']) : null;
            $specKey = trim((string) $spec['spec_key']);
            if ($specKey == '') {
                continue;
            }

            ProductSpec::create([
                'product_id' => $product->id,
                'product_variant_id' => $variantId,
                'spec_group' => $specGroup,
                'spec_key' => $specKey,
                'spec_value' => $spec['spec_value'] ?? '',
                'spec_unit' => $spec['spec_unit'] ?? null,
                'sort_order' => (int) ($spec['sort_order'] ?? $index),
            ]);
        }
    }

    public function destroy(Product $product): JsonResponse
    {
        return DB::transaction(function () use ($product) {
            foreach ($product->images as $img) {
                $path = str_replace('/storage/', '', $img->image_url);
                Storage::disk('public')->delete($path);
            }
            $product->images()->delete();
            $product->specs()->delete();
            
            foreach ($product->variants as $v) {
                if ($v->image_url) {
                    $vPath = str_replace('/storage/', '', $v->image_url);
                    Storage::disk('public')->delete($vPath);
                }
            }
            $product->variants()->delete();
            
            $product->delete();
            return response()->json(['message' => 'Deleted']);
        });
    }
}
