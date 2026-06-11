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
    public function __construct(private \App\Services\FlashSaleService $flashSaleService)
    {
    }

    public function index(): JsonResponse
    {
        $sales = $this->flashSaleService->getAdminSales();

        return response()->json(FlashSaleResource::collection($sales)->resolve());
    }

    public function store(StoreFlashSaleRequest $request): JsonResponse
    {
        $sale = $this->flashSaleService->createSale($request->validated());

        return response()->json((new FlashSaleResource($sale))->resolve(), 201);
    }

    public function show(FlashSale $flashSale): JsonResponse
    {
        $flashSale = $this->flashSaleService->getSaleWithItems($flashSale);

        return response()->json((new FlashSaleResource($flashSale))->resolve());
    }

    public function update(UpdateFlashSaleRequest $request, FlashSale $flashSale): JsonResponse
    {
        $updatedSale = $this->flashSaleService->updateSale($flashSale, $request->validated());

        return response()->json((new FlashSaleResource($updatedSale))->resolve());
    }

    public function destroy(FlashSale $flashSale): JsonResponse
    {
        $this->flashSaleService->deleteSale($flashSale);

        return response()->json(['message' => 'Flash Sale deleted successfully']);
    }

    // Items management
    public function addItem(StoreFlashSaleItemRequest $request, FlashSale $flashSale): JsonResponse
    {
        $item = $this->flashSaleService->addItem($flashSale, $request->validated());

        return response()->json((new FlashSaleResource($item))->resolve(), 201);
    }

    public function removeItem(FlashSale $flashSale, FlashSaleItem $item): JsonResponse
    {
        try {
            $this->flashSaleService->removeItem($flashSale, $item);
            return response()->json(['message' => 'Item removed successfully']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], $e->getCode() ?: 400);
        }
    }

    public function addBulkItems(Request $request, FlashSale $flashSale): JsonResponse
    {
        $validated = $request->validate([
            'discount_percentage' => 'required|numeric|min:1|max:99',
            'quantity_limit' => 'nullable|integer|min:1',
        ]);

        $percentage = (float) $validated['discount_percentage'];
        $qtyLimit = $validated['quantity_limit'] ?? null;

        $addedCount = $this->flashSaleService->addBulkItems($flashSale, $percentage, $qtyLimit);

        return response()->json([
            'message' => "Đã áp dụng giảm giá {$percentage}% cho {$addedCount} sản phẩm/phiên bản thành công!",
            'added_count' => $addedCount,
        ]);
    }
}
