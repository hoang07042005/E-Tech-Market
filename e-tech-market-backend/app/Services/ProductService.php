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
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Redis;
use App\Models\Category;
use App\Services\CategoryService;
use Illuminate\Support\Str;

class ProductService
{
    private CategoryService $categoryService;

    public function __construct(CategoryService $categoryService)
    {
        $this->categoryService = $categoryService;
    }

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
                ->increment('stock_quantity', $add);
        });

        return $variant->fresh();
    }

    /**
     * Lấy danh sách sản phẩm (Client) với phân trang, lọc, sắp xếp, và cache
     */
    public function getClientProducts(array $filters, int $limit = 12)
    {
        $query = Product::query()->where('is_active', true);

        if (!empty($filters['category_id'])) {
            $catId = (int) $filters['category_id'];
            $allCatIds = $this->getAllCategoryIds($catId);
            $query->whereIn('category_id', $allCatIds);
        }

        if (!empty($filters['brand'])) {
            $query->where('brand', 'ilike', $filters['brand']);
        }

        if (!empty($filters['min_price']) || !empty($filters['max_price'])) {
            $query->whereHas('variants', function ($q) use ($filters) {
                if (!empty($filters['min_price'])) {
                    $q->where('price', '>=', (float) $filters['min_price']);
                }
                if (!empty($filters['max_price'])) {
                    $q->where('price', '<=', (float) $filters['max_price']);
                }
                $q->where('is_active', true);
            });
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('description', 'ilike', "%{$search}%");
            });
        }

        // Filter by is_featured
        if (isset($filters['is_featured'])) {
            $isFeatured = $filters['is_featured'];
            if ($isFeatured === '1' || $isFeatured === 1 || $isFeatured === true) {
                $query->where('is_featured', true);
            } elseif ($isFeatured === '0' || $isFeatured === 0 || $isFeatured === false) {
                $query->where('is_featured', false);
            }
            // If any other value, don't filter
        }

        $sort = $filters['sort'] ?? 'created_at';
        $order = strtolower($filters['order'] ?? 'desc') === 'asc' ? 'asc' : 'desc';

        $allowedSortFields = ['created_at', 'price', 'name'];
        if (! in_array($sort, $allowedSortFields)) {
            $sort = 'created_at';
        }

        if ($sort === 'price') {
            $query->orderBy(
                \App\Models\ProductVariant::select('price')
                    ->whereColumn('product_id', 'products.id')
                    ->where('is_active', true)
                    ->orderBy('price', 'asc')
                    ->limit(1),
                $order
            );
        } else {
            $query->orderBy($sort, $order);
        }

        $cacheKey = 'products_index_'.md5(serialize($filters).$limit);

        // Cache global cho store config
        $defaultLimit = Cache::remember('store_products_per_page', 3600, function () {
            $storeConfig = \App\Models\AdminSetting::query()->where('key', 'store_profile')->first();
            return ($storeConfig && isset($storeConfig->value['products_per_page']))
                ? max(1, (int) $storeConfig->value['products_per_page'])
                : 12;
        });

        return $query
            ->with([
                'category',
                'variants',
                'flashSaleItems' => fn ($q) => $q->whereHas('flashSale', function ($query) {
                    $query->where('status', \App\Models\FlashSale::STATUS_ACTIVE)
                        ->where('start_at', '<=', now())
                        ->where('end_at', '>=', now());
                })->with('flashSale')
            ])
            ->withCount([
                'reviews as reviews_count' => fn ($q) => $q->where('status', 'approved'),
            ])
            ->withAvg([
                'reviews as avg_rating' => fn ($q) => $q->where('status', 'approved'),
            ], 'rating')
            ->paginate($limit > 0 ? $limit : $defaultLimit);
    }

    /**
     * Chi tiết sản phẩm (Client)
     */
    public function getClientProduct(Product $product): Product
    {
        if (! $product->is_active) {
            throw new \Exception('Product not active', 404);
        }

        $product->load([
            'category',
            'images' => fn ($q) => $q->orderBy('sort_order'),
            'specs' => fn ($q) => $q->orderBy('sort_order'),
            'variants' => fn ($q) => $q->where('is_active', true),
            'videos' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order'),
            'faqs' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order'),
            'news' => fn ($q) => $q->where('is_active', true)->orderByDesc('published_at')->orderBy('sort_order'),
            'reviews' => fn ($q) => $q->where('status', 'approved')->with('user')->orderBy('created_at', 'desc'),
            'flashSaleItems' => fn ($q) => $q->whereHas('flashSale', function ($query) {
                $query->where('status', \App\Models\FlashSale::STATUS_ACTIVE)
                    ->where('start_at', '<=', now())
                    ->where('end_at', '>=', now());
            })->with('flashSale'),
        ]);

        return $product;
    }

    /**
     * Lấy danh sách sản phẩm liên quan (Bought together & Similar)
     */
    public function getRelatedProducts(Product $product): array
    {
        // 1. Frequently Bought Together (Cross-sell)
        $orderIds = \App\Models\OrderItem::where('product_id', $product->id)
            ->pluck('order_id')
            ->unique();

        $boughtTogether = Product::query()
            ->where('is_active', true)
            ->where('id', '!=', $product->id)
            ->whereIn('id', function ($query) use ($orderIds) {
                $query->select('product_id')
                    ->from('order_items')
                    ->whereIn('order_id', $orderIds);
            })
            ->with(['category', 'variants'])
            ->withCount([
                'reviews as reviews_count' => fn ($q) => $q->where('status', 'approved'),
            ])
            ->withAvg([
                'reviews as avg_rating' => fn ($q) => $q->where('status', 'approved'),
            ], 'rating')
            ->limit(4)
            ->get();

        if ($boughtTogether->count() < 4) {
            $extra = Product::query()
                ->where('is_active', true)
                ->where('id', '!=', $product->id)
                ->whereNotIn('id', $boughtTogether->pluck('id'))
                ->where(function ($q) use ($product) {
                    $q->where('brand', $product->brand)
                        ->orWhereHas('category', function ($cq) {
                            $cq->where('name', 'ilike', '%phụ kiện%')
                                ->orWhere('name', 'ilike', '%linh kiện%');
                        });
                })
                ->with(['category', 'variants'])
                ->withCount([
                    'reviews as reviews_count' => fn ($q) => $q->where('status', 'approved'),
                ])
                ->withAvg([
                    'reviews as avg_rating' => fn ($q) => $q->where('status', 'approved'),
                ], 'rating')
                ->limit(4 - $boughtTogether->count())
                ->get();

            $boughtTogether = $boughtTogether->concat($extra);
        }

        // 2. Similar Products (Customers also bought / Up-sell)
        $similar = Product::query()
            ->where('is_active', true)
            ->where('id', '!=', $product->id)
            ->where('category_id', $product->category_id)
            ->with(['category', 'variants'])
            ->withCount([
                'reviews as reviews_count' => fn ($q) => $q->where('status', 'approved'),
            ])
            ->withAvg([
                'reviews as avg_rating' => fn ($q) => $q->where('status', 'approved'),
            ], 'rating')
            ->orderBy('reviews_count', 'desc')
            ->limit(10)
            ->get();

        return [
            'bought_together' => $boughtTogether,
            'similar' => $similar,
        ];
    }

    /**
     * Lấy danh sách sản phẩm (Admin) với phân trang, lọc, tìm kiếm
     */
    public function getAdminProducts(array $filters, int $perPage = 20)
    {
        $query = Product::with(['category', 'images', 'specs', 'variants', 'faqs', 'inventoryItems']);

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('brand', 'like', "%{$search}%")
                    ->orWhereHas('category', function ($catQ) use ($search) {
                        $catQ->where('name', 'like', "%{$search}%");
                    });
            });
        }

        $perPage = max(5, min((int) $perPage, 100)); // clamp 5–100

        $products = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return $products;
    }

    /**
     * Chi tiết sản phẩm (Admin)
     */
    public function getAdminProduct(Product $product): Product
    {
        $product->load(['category', 'images', 'specs', 'variants', 'faqs', 'inventoryItems']);

        return $product;
    }

    /**
     * Helper - get all descendant category IDs (cached tree lookup)
     */
    private function getAllCategoryIds($categoryId): array
    {
        return $this->categoryService->getAllCategoryIds($categoryId);
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
