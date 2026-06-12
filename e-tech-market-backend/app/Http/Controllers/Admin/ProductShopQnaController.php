<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReplyQnaRequest;
use App\Models\Product;
use App\Models\ProductShopQna;
use Illuminate\Http\JsonResponse;

class ProductShopQnaController extends Controller
{
    public function __construct(private \App\Services\ProductShopQnaService $qnaService)
    {
    }

    public function pendingAll(): JsonResponse
    {
        $rows = $this->qnaService->getPendingQnas();
        return response()->json($rows);
    }

    public function index(Product $product): JsonResponse
    {
        $rows = $this->qnaService->getProductQnasAdmin($product);
        return response()->json($rows);
    }

    public function update(Product $product, ProductShopQna $shopQna, ReplyQnaRequest $request): JsonResponse
    {
        try {
            $updatedQna = $this->qnaService->replyQna($product, $shopQna, $request->validated());
            return response()->json($updatedQna);
        } catch (\Exception $e) {
            $code = $e->getCode() ?: 404;
            return response()->json(['message' => $e->getMessage()], $code);
        }
    }
}
