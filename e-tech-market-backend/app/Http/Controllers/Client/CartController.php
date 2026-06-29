<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CartController extends Controller
{
    public function __construct(private \App\Services\CartService $cartService)
    {
    }

    public function show(Request $request): JsonResponse
    {
        $cart = $this->cartService->getActiveCart($request->user());
        return response()->json($cart);
    }

    public function addItem(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id' => ['required', 'integer', 'min:1'],
            'variant_id' => ['nullable', 'integer', 'min:1'],
            'quantity' => ['required', 'integer', 'min:1'],
            'unit_price' => ['nullable', 'numeric', 'min:0'],
            'from_flash_sale' => ['nullable', 'boolean'],
        ]);

        // Default to false if not provided
        if (!isset($data['from_flash_sale'])) {
            $data['from_flash_sale'] = false;
        }

        try {
            $cart = $this->cartService->addItem($request->user(), $data);
            return response()->json($cart);
        } catch (\Exception $e) {
            $code = $e->getCode() ?: 400;
            return response()->json(['message' => $e->getMessage()], $code);
        }
    }

    public function updateItem(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate([
            'quantity' => ['required', 'integer', 'min:1'],
            'variant_id' => ['nullable', 'integer', 'min:1'],
        ]);

        try {
            $cart = $this->cartService->updateItemQuantity($request->user(), $product, (int) $data['quantity'], $data['variant_id'] ?? null);
            return response()->json($cart);
        } catch (\Exception $e) {
            $code = $e->getCode() ?: 400;
            return response()->json(['message' => $e->getMessage()], $code);
        }
    }

    public function removeItem(Request $request, Product $product): JsonResponse
    {
        $variantId = $request->input('variant_id');
        $cart = $this->cartService->removeItem($request->user(), $product, $variantId ? (int) $variantId : null);
        return response()->json($cart);
    }

    public function clear(Request $request): JsonResponse
    {
        $cart = $this->cartService->clear($request->user());
        return response()->json($cart);
    }
}
