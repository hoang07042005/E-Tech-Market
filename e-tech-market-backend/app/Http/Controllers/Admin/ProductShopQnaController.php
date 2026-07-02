<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ReplyQnaRequest;
use App\Models\Product;
use App\Models\ProductShopQna;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

    public function all(Request $request): JsonResponse
    {
        $status = $request->query('status', 'all');
        if ($status === 'pending') {
            $rows = $this->qnaService->getPendingQnas();
        } else {
            $rows = $this->qnaService->getAllQnas();
        }
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
            abort($code, $e->getMessage());
        }
    }

    public function destroy(Product $product, ProductShopQna $shopQna): JsonResponse
    {
        try {
            if ((int) $shopQna->product_id !== (int) $product->id) {
                abort(404, 'Not found');
            }

            $shopQna->delete();

            return response()->json(['message' => 'Question deleted successfully']);
        } catch (\Exception $e) {
            $code = $e->getCode() ?: 500;
            abort($code, $e->getMessage());
        }
    }
}
