<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductShopQna;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductShopQnaController extends Controller
{
    /**
     * Hộp thư admin: các câu hỏi chưa trả lời (theo thời gian gửi mới nhất).
     */
    public function pendingAll(): JsonResponse
    {
        $rows = ProductShopQna::query()
            ->with(['product:id,name,slug,is_active'])
            ->whereNull('answer')
            ->orderByDesc('created_at')
            ->limit(500)
            ->get();

        return response()->json($rows);
    }

    public function index(Product $product): JsonResponse
    {
        $rows = $product->shopQnas()
            ->orderByRaw('answered_at is null desc')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($rows);
    }

    public function update(Product $product, ProductShopQna $shopQna, Request $request): JsonResponse
    {
        if ((int) $shopQna->product_id !== (int) $product->id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $data = $request->validate([
            'answer' => ['nullable', 'string', 'max:10000'],
            'is_visible' => ['sometimes', 'boolean'],
        ]);

        if (array_key_exists('answer', $data)) {
            $trimmed = $data['answer'] !== null ? trim($data['answer']) : '';
            $shopQna->answer = $trimmed !== '' ? $trimmed : null;
            $shopQna->answered_at = $shopQna->answer !== null ? now() : null;
        }

        if (isset($data['is_visible'])) {
            $shopQna->is_visible = (bool) $data['is_visible'];
        }

        $shopQna->save();

        return response()->json($shopQna->fresh());
    }
}
