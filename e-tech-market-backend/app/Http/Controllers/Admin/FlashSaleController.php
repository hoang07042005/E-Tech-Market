<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreFlashSaleItemRequest;
use App\Http\Requests\Admin\StoreFlashSaleRequest;
use App\Http\Requests\Admin\UpdateFlashSaleRequest;
use App\Http\Resources\Admin\FlashSaleResource;
use App\Models\FlashSale;
use App\Models\FlashSaleItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FlashSaleController extends Controller
{
    public function index(): JsonResponse
    {
        // Tự động chuyển sang trạng thái "ended" nếu đã hết hạn
        FlashSale::where('status', '!=', FlashSale::STATUS_ENDED)
            ->where('end_at', '<', now())
            ->update(['status' => FlashSale::STATUS_ENDED]);

        $sales = FlashSale::withCount('items')->orderBy('start_at', 'desc')->get();

        return response()->json(FlashSaleResource::collection($sales)->resolve());
    }

    public function store(StoreFlashSaleRequest $request): JsonResponse
    {
        $validated = $request->validated();

        \Illuminate\Support\Facades\Cache::forget('active_flash_sale');
        $sale = FlashSale::create($validated);

        return response()->json((new FlashSaleResource($sale))->resolve(), 201);
    }

    public function show(FlashSale $flashSale): JsonResponse
    {
        $flashSale->load('items.product', 'items.variant');

        return response()->json((new FlashSaleResource($flashSale))->resolve());
    }

    public function update(UpdateFlashSaleRequest $request, FlashSale $flashSale): JsonResponse
    {
        $validated = $request->validated();

        \Illuminate\Support\Facades\Cache::forget('active_flash_sale');
        $flashSale->update($validated);

        return response()->json((new FlashSaleResource($flashSale))->resolve());
    }

    public function destroy(FlashSale $flashSale): JsonResponse
    {
        \Illuminate\Support\Facades\Cache::forget('active_flash_sale');
        $flashSale->delete();

        return response()->json(['message' => 'Flash Sale deleted successfully']);
    }

    // Items management
    public function addItem(StoreFlashSaleItemRequest $request, FlashSale $flashSale): JsonResponse
    {
        $validated = $request->validated();

        \Illuminate\Support\Facades\Cache::forget('active_flash_sale');
        $item = $flashSale->items()->create($validated);

        return response()->json((new FlashSaleResource($item))->resolve(), 201);
    }

    public function removeItem(FlashSale $flashSale, FlashSaleItem $item): JsonResponse
    {
        if ($item->flash_sale_id !== $flashSale->id) {
            return response()->json(['message' => 'Item does not belong to this sale'], 403);
        }
        \Illuminate\Support\Facades\Cache::forget('active_flash_sale');
        $item->delete();

        return response()->json(['message' => 'Item removed successfully']);
    }

    public function addBulkItems(Request $request, FlashSale $flashSale): JsonResponse
    {
        $validated = $request->validate([
            'discount_percentage' => 'required|numeric|min:1|max:99',
            'quantity_limit' => 'nullable|integer|min:1',
        ]);

        $percentage = (float) $validated['discount_percentage'];
        $qtyLimit = $validated['quantity_limit'] ?? null;

        // Process products in chunks to avoid loading all products into memory
        $addedCount = 0;
        \App\Models\Product::chunk(200, function ($products) use ($flashSale, $percentage, $qtyLimit, &$addedCount) {
            $products->load('variants');
            foreach ($products as $product) {
                if ($product->variants && $product->variants->count() > 0) {
                    foreach ($product->variants as $variant) {
                        $discountedPrice = round((float) $variant->price * (1 - $percentage / 100));
                        $flashSale->items()->updateOrCreate(
                            [
                                'product_id' => $product->id,
                                'variant_id' => $variant->id,
                            ],
                            [
                                'flash_sale_price' => $discountedPrice,
                                'quantity_limit' => $qtyLimit,
                            ]
                        );
                        $addedCount++;
                    }
                } else {
                    $discountedPrice = round((float) $product->price * (1 - $percentage / 100));
                    $flashSale->items()->updateOrCreate(
                        [
                            'product_id' => $product->id,
                            'variant_id' => null,
                        ],
                        [
                            'flash_sale_price' => $discountedPrice,
                            'quantity_limit' => $qtyLimit,
                        ]
                    );
                    $addedCount++;
                }
            }
        });

        \Illuminate\Support\Facades\Cache::forget('active_flash_sale');

        return response()->json([
            'message' => "Đã áp dụng giảm giá {$percentage}% cho {$addedCount} sản phẩm/phiên bản thành công!",
            'added_count' => $addedCount,
        ]);
    }
}
