<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
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
        return response()->json($sales);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'start_at' => 'required|date',
            'end_at' => 'required|date|after:start_at',
            'status' => 'required|string|in:active,paused,waiting,ended',
        ]);

        \Illuminate\Support\Facades\Cache::forget('active_flash_sale');
        $sale = FlashSale::create($validated);
        return response()->json($sale, 201);
    }

    public function show(FlashSale $flashSale): JsonResponse
    {
        $flashSale->load('items.product', 'items.variant');
        return response()->json($flashSale);
    }

    public function update(Request $request, FlashSale $flashSale): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'start_at' => 'sometimes|required|date',
            'end_at' => 'sometimes|required|date|after:start_at',
            'status' => 'sometimes|required|string|in:active,paused,waiting,ended',
        ]);

        \Illuminate\Support\Facades\Cache::forget('active_flash_sale');
        $flashSale->update($validated);
        return response()->json($flashSale);
    }

    public function destroy(FlashSale $flashSale): JsonResponse
    {
        \Illuminate\Support\Facades\Cache::forget('active_flash_sale');
        $flashSale->delete();
        return response()->json(['message' => 'Flash Sale deleted successfully']);
    }

    // Items management
    public function addItem(Request $request, FlashSale $flashSale): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'variant_id' => 'nullable|exists:product_variants,id',
            'flash_sale_price' => 'required|numeric|min:0',
            'quantity_limit' => 'nullable|integer|min:1',
        ]);

        \Illuminate\Support\Facades\Cache::forget('active_flash_sale');
        $item = $flashSale->items()->create($validated);
        return response()->json($item, 201);
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

        // Lấy toàn bộ sản phẩm cùng với các variants của chúng
        $products = \App\Models\Product::with('variants')->get();
        $addedCount = 0;

        foreach ($products as $product) {
            if ($product->variants && $product->variants->count() > 0) {
                // Nếu sản phẩm có các phiên bản (variants)
                foreach ($product->variants as $variant) {
                    $discountedPrice = round((float)$variant->price * (1 - $percentage / 100));
                    
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
                // Nếu sản phẩm không có phiên bản nào
                $discountedPrice = round((float)$product->price * (1 - $percentage / 100));
                
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

        \Illuminate\Support\Facades\Cache::forget('active_flash_sale');

        return response()->json([
            'message' => "Đã áp dụng giảm giá {$percentage}% cho {$addedCount} sản phẩm/phiên bản thành công!",
            'added_count' => $addedCount
        ]);
    }
}
