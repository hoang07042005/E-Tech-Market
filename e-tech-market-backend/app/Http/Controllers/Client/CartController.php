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
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        $cart = Cart::query()->firstOrCreate(
            ['user_id' => $user->id],
            ['status' => 'active']
        );

        $cart->load([
            'items.product' => fn ($p) => $p->where('is_active', true),
            'items.variant',
        ]);

        // NOTE: Because we haven't defined Product->images eager-loading here,
        // the FE can use `main_image_url` for list screens.
        return response()->json($cart);
    }

    public function addItem(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'product_id' => ['required', 'integer', 'min:1'],
            'variant_id' => ['nullable', 'integer', 'min:1'],
            'quantity' => ['required', 'integer', 'min:1'],
        ]);

        $product = Product::query()->where('id', $data['product_id'])->where('is_active', true)->first();
        if (! $product) {
            return response()->json(['message' => 'Product not found or inactive'], 404);
        }

        $variant = null;
        if (! empty($data['variant_id'])) {
            $variant = ProductVariant::query()
                ->where('id', (int) $data['variant_id'])
                ->where('product_id', $product->id)
                ->where('is_active', true)
                ->first();
            if (! $variant) {
                return response()->json(['message' => 'Variant not found or inactive'], 404);
            }
        } else {
            $variant = $product->variants()->where('is_active', true)->orderBy('id')->first();
        }

        if (! $variant) {
            return response()->json(['message' => 'Product variant not found'], 422);
        }

        $cart = Cart::query()->firstOrCreate(
            ['user_id' => $user->id],
            ['status' => 'active']
        );

        $cartItem = CartItem::query()
            ->where('cart_id', $cart->id)
            ->where('product_id', $product->id)
            ->where('variant_id', $variant->id)
            ->first();

        return DB::transaction(function () use ($cart, $product, $variant, $data, $cartItem) {
            if ($cartItem) {
                $cartItem->quantity = $cartItem->quantity + (int) $data['quantity'];
                $cartItem->save();
            } else {
                // Check for active Flash Sale
                $activeFlashSaleItem = $product->flashSaleItems()->whereHas('flashSale', function ($q) {
                    $q->where('status', \App\Models\FlashSale::STATUS_ACTIVE)
                        ->where('start_at', '<=', now())
                        ->where('end_at', '>=', now());
                })->first();

                $unitPrice = $activeFlashSaleItem ? $activeFlashSaleItem->flash_sale_price : $variant->effective_price;

                CartItem::create([
                    'cart_id' => $cart->id,
                    'product_id' => $product->id,
                    'variant_id' => $variant->id,
                    'quantity' => (int) $data['quantity'],
                    'unit_price' => $unitPrice,
                ]);
            }

            $cart->load(['items.product', 'items.variant']);

            return response()->json($cart);
        });
    }

    public function updateItem(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate([
            'quantity' => ['required', 'integer', 'min:1'],
        ]);

        $cart = Cart::query()->firstOrCreate(
            ['user_id' => $request->user()->id],
            ['status' => 'active']
        );

        $item = CartItem::query()
            ->where('cart_id', $cart->id)
            ->where('product_id', $product->id)
            ->first();

        if (! $item) {
            return response()->json(['message' => 'Item not found in cart'], 404);
        }

        $item->quantity = (int) $data['quantity'];
        $item->save();

        return response()->json($cart->load('items.product'));
    }

    public function removeItem(Request $request, Product $product): JsonResponse
    {
        $cart = Cart::query()->firstOrCreate(
            ['user_id' => $request->user()->id],
            ['status' => 'active']
        );

        CartItem::query()
            ->where('cart_id', $cart->id)
            ->where('product_id', $product->id)
            ->delete();

        $cart->load(['items.product', 'items.variant']);

        return response()->json($cart);
    }
}
