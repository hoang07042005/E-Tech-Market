<?php

namespace App\Services;

use App\Jobs\ProcessProductImage;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductSpec;
use App\Models\ProductVariant;
use App\Support\HtmlSanitizer;
use App\Support\ProductInventorySync;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProductService
{
    public function createProduct(array $data, $request): Product
    {
        $data = $this->cleanUtf8($data);

        return DB::transaction(function () use ($data, $request) {
            $data['slug'] = Str::slug($data['name']).'-'.uniqid();
            $data['rich_html'] = HtmlSanitizer::sanitize($data['rich_html'] ?? null);
            $product = Product::create($data);

            $this->handleImages($product, $request);
            $variantIdsByIndex = $this->handleVariants($product, $request, $data['name']);
            $this->handleSpecs($product, $request, $variantIdsByIndex);
            $this->handleFaqs($product, $request);

            ProductInventorySync::syncFromVariants($product->fresh(['variants']));

            return $product->fresh()->load(['images', 'specs', 'variants', 'faqs', 'inventoryItems']);
        });
    }

    public function updateProduct(Product $product, array $data, $request): Product
    {
        $data = $this->cleanUtf8($data);

        return DB::transaction(function () use ($data, $request, $product) {
            $data['rich_html'] = HtmlSanitizer::sanitize($data['rich_html'] ?? null);
            $product->update($data);

            $this->handleImagesUpdate($product, $request);
            $variantIdsByIndex = $this->handleVariantsUpdate($product, $request, $data['name']);
            $this->handleSpecsUpdate($product, $request, $variantIdsByIndex);
            $this->handleFaqsUpdate($product, $request);

            ProductInventorySync::syncFromVariants($product->fresh(['variants']));

            return $product->fresh()->load(['images', 'specs', 'variants', 'faqs', 'inventoryItems']);
        });
    }

    public function deleteProduct(Product $product): void
    {
        DB::transaction(function () use ($product) {
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
        });
    }

    public function restockVariant(ProductVariant $variant, int $add): ProductVariant
    {
        DB::transaction(function () use ($variant, $add) {
            ProductVariant::query()
                ->where('id', $variant->id)
                ->update([
                    'stock_quantity' => DB::raw('COALESCE(stock_quantity, 0) + '.$add),
                ]);
        });

        return $variant->fresh();
    }

    private function handleImages(Product $product, $request): void
    {
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $index => $image) {
                $path = $image->store('products', 'public');
                ProcessProductImage::dispatch($path);
                $url = Storage::disk('public')->url($path);

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
    }

    private function handleImagesUpdate(Product $product, $request): void
    {
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
                ProcessProductImage::dispatch($path);
                $url = Storage::disk('public')->url($path);

                if ($index === 0 && ! $product->main_image_url) {
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
    }

    private function handleVariants(Product $product, $request, string $productName): array
    {
        $variantIdsByIndex = [];
        if ($request->filled('variants')) {
            $variants = json_decode($request->variants, true);
            $variants = $this->cleanUtf8($variants);
            if (is_array($variants)) {
                foreach ($variants as $index => $vData) {
                    $sku = strtoupper(mb_substr($productName, 0, 3, 'UTF-8')).'-'.$product->id.'-'.strtoupper(dechex(time())).'-'.($index + 1);
                    if (! empty($vData['sku']) && ! str_starts_with($vData['sku'], strtoupper(mb_substr($productName, 0, 3, 'UTF-8')))) {
                        $sku = $vData['sku'];
                    }

                    $vPrice = (isset($vData['price']) && $vData['price'] !== '') ? $vData['price'] : 0;
                    $vDiscountValue = (isset($vData['discount_value']) && $vData['discount_value'] !== '') ? $vData['discount_value'] : null;
                    $vDiscountStart = ! empty($vData['discount_start_at']) ? $vData['discount_start_at'] : null;
                    $vDiscountEnd = ! empty($vData['discount_end_at']) ? $vData['discount_end_at'] : null;
                    $vDiscountType = (isset($vData['discount_type']) && $vData['discount_type'] !== '') ? $vData['discount_type'] : null;

                    $variant = ProductVariant::create([
                        'product_id' => $product->id,
                        'variant_name' => $vData['variant_name'],
                        'color' => $vData['color'] ?? null,
                        'configuration' => $vData['configuration'] ?? null,
                        'sku' => $sku,
                        'price' => $vPrice,
                        'discount_type' => $vDiscountType,
                        'discount_value' => $vDiscountValue,
                        'discount_start_at' => $vDiscountStart,
                        'discount_end_at' => $vDiscountEnd,
                        'stock_quantity' => $vData['stock_quantity'] ?? 0,
                        'is_active' => true,
                    ]);

                    if ($request->hasFile("variant_image_{$index}")) {
                        $vPath = $request->file("variant_image_{$index}")->store('variants', 'public');
                        ProcessProductImage::dispatch($vPath);
                        $variant->update(['image_url' => Storage::disk('public')->url($vPath)]);
                    }

                    $variantIdsByIndex[$index] = $variant->id;
                }
            }
        }

        return $variantIdsByIndex;
    }

    private function handleVariantsUpdate(Product $product, $request, string $productName): array
    {
        $variantIdsByIndex = [];
        if ($request->filled('variants')) {
            $variants = json_decode($request->variants, true);
            $variants = $this->cleanUtf8($variants);
            if (is_array($variants)) {
                $prefix = strtoupper(mb_substr($productName, 0, 3, 'UTF-8'));

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
                    $vPrice = (isset($vData['price']) && $vData['price'] !== '') ? $vData['price'] : 0;
                    $vDiscountValue = (isset($vData['discount_value']) && $vData['discount_value'] !== '') ? $vData['discount_value'] : null;
                    $vDiscountStart = ! empty($vData['discount_start_at']) ? $vData['discount_start_at'] : null;
                    $vDiscountEnd = ! empty($vData['discount_end_at']) ? $vData['discount_end_at'] : null;
                    $vDiscountType = (isset($vData['discount_type']) && $vData['discount_type'] !== '') ? $vData['discount_type'] : null;

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
                            'price' => $vPrice,
                            'discount_type' => $vDiscountType,
                            'discount_value' => $vDiscountValue,
                            'discount_start_at' => $vDiscountStart,
                            'discount_end_at' => $vDiscountEnd,
                            'stock_quantity' => $vData['stock_quantity'] ?? 0,
                            'is_active' => $vData['is_active'] ?? true,
                            'image_url' => $vData['image_url'] ?? $existing->image_url,
                        ]);
                        $variant = $existing;
                    } else {
                        $sku = $prefix.'-'.$product->id.'-'.strtoupper(dechex(time())).'-'.($index + 1);
                        if (! empty($vData['sku']) && ! str_starts_with($vData['sku'], $prefix)) {
                            $sku = $vData['sku'];
                        }

                        $variant = ProductVariant::create([
                            'product_id' => $product->id,
                            'variant_name' => $vData['variant_name'],
                            'color' => $vData['color'] ?? null,
                            'configuration' => $vData['configuration'] ?? null,
                            'sku' => $sku,
                            'price' => $vPrice,
                            'discount_type' => $vDiscountType,
                            'discount_value' => $vDiscountValue,
                            'discount_start_at' => $vDiscountStart,
                            'discount_end_at' => $vDiscountEnd,
                            'stock_quantity' => $vData['stock_quantity'] ?? 0,
                            'is_active' => true,
                            'image_url' => $vData['image_url'] ?? null,
                        ]);
                    }

                    if ($request->hasFile("variant_image_{$index}")) {
                        $deleteVariantDiskImage($variant->image_url);
                        $vPath = $request->file("variant_image_{$index}")->store('variants', 'public');
                        ProcessProductImage::dispatch($vPath);
                        $variant->update(['image_url' => Storage::disk('public')->url($vPath)]);
                    }

                    $variantIdsByIndex[$index] = $variant->id;
                }
            }
        }

        return $variantIdsByIndex;
    }

    private function handleSpecs(Product $product, $request, array $variantIdsByIndex): void
    {
        if ($request->filled('specs')) {
            $specs = json_decode($request->specs, true);
            $specs = $this->cleanUtf8($specs);
            if (is_array($specs)) {
                $this->replaceProductSpecsFromPayload($product, $specs, $variantIdsByIndex);
            }
        }
    }

    private function handleSpecsUpdate(Product $product, $request, array $variantIdsByIndex): void
    {
        if ($request->filled('specs')) {
            $specs = json_decode($request->specs, true);
            $specs = $this->cleanUtf8($specs);
            if (is_array($specs)) {
                $this->replaceProductSpecsFromPayload($product->fresh(), $specs, $variantIdsByIndex);
            }
        }
    }

    private function handleFaqs(Product $product, $request): void
    {
        if ($request->filled('faqs')) {
            $faqs = json_decode($request->faqs, true);
            $faqs = $this->cleanUtf8($faqs);
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
    }

    private function handleFaqsUpdate(Product $product, $request): void
    {
        if ($request->filled('faqs')) {
            $faqs = json_decode($request->faqs, true);
            $faqs = $this->cleanUtf8($faqs);
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
    }

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

    private function cleanUtf8(mixed $data): mixed
    {
        if (is_string($data)) {
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
