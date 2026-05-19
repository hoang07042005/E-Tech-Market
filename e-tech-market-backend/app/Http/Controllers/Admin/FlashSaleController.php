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
}
