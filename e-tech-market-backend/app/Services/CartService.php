<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CartService
{
    /**
     * Get or create active cart for user
     */
    public function getActiveCart(User $user): Cart
    {
        $cart = Cart::query()->firstOrCreate(
            ['user_id' => $user->id],
            ['status' => 'active']
        );

        $cart->load([
            'items.product' => fn ($p) => $p->where('is_active', true),
            'items.variant',
        ]);

        return $cart;
    }

    /**
     * Add item to cart
     */
    public function addItem(User $user, array $data): Cart
    {
        $product = Product::query()->where('id', $data['product_id'])->where('is_active', true)->first();
        if (! $product) {
            throw new \Exception('Product not found or inactive', 404);
        }

        $variant = null;
        if (! empty($data['variant_id'])) {
            $variant = ProductVariant::query()
                ->where('id', (int) $data['variant_id'])
                ->where('product_id', $product->id)
                ->where('is_active', true)
                ->first();
            if (! $variant) {
                throw new \Exception('Variant not found or inactive', 404);
            }
        } else {
            $variant = $product->variants()->where('is_active', true)->orderBy('id')->first();
        }

        if (! $variant) {
            throw new \Exception('Product variant not found', 422);
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
                // Update unit_price to reflect current pricing (discount may have changed)
                if (! empty($data['unit_price']) && $data['unit_price'] > 0) {
                    $cartItem->unit_price = (float) $data['unit_price'];
                }
                $cartItem->save();
            } else {
                $unitPrice = null;
                $fromFlashSale = !empty($data['from_flash_sale']);

                if (! empty($data['unit_price']) && $data['unit_price'] > 0) {
                    // Explicit price provided (e.g., from product detail)
                    $unitPrice = (float) $data['unit_price'];
                } elseif ($fromFlashSale) {
                    // Only apply Flash Sale when explicitly from flash sale page
                    $flashSaleItem = $product->flashSaleItems()->whereHas('flashSale', function ($q) {
                        $q->where('status', \App\Models\FlashSale::STATUS_ACTIVE)
                            ->where('start_at', '<=', now())
                            ->where('end_at', '>=', now());
                    })->first();

                    // Check flash sale quantity limit before adding to cart
                    if ($flashSaleItem && $flashSaleItem->quantity_limit !== null) {
                        $availableQty = $flashSaleItem->quantity_limit - $flashSaleItem->sold_quantity;
                        if ($availableQty <= 0) {
                            throw new \Exception("Sản phẩm {$product->name} đã hết suất Flash Sale.", 422);
                        }
                        if ((int) $data['quantity'] > $availableQty) {
                            throw new \Exception("Sản phẩm {$product->name} chỉ còn {$availableQty} suất Flash Sale.", 422);
                        }
                    }

                    $unitPrice = $flashSaleItem ? $flashSaleItem->flash_sale_price : $variant->effective_price;
                } else {
                    // Normal add - use price from product, no flash sale
                    $unitPrice = $variant->effective_price;
                }

                CartItem::create([
                    'cart_id' => $cart->id,
                    'product_id' => $product->id,
                    'variant_id' => $variant->id,
                    'quantity' => (int) $data['quantity'],
                    'unit_price' => $unitPrice,
                ]);
            }

            $cart->load(['items.product', 'items.variant']);

            return $cart;
        });
    }

    /**
     * Update item quantity in cart
     */
    public function updateItemQuantity(User $user, Product $product, int $quantity, ?int $variantId = null): Cart
    {
        $cart = Cart::query()->firstOrCreate(
            ['user_id' => $user->id],
            ['status' => 'active']
        );

        $query = CartItem::query()
            ->where('cart_id', $cart->id)
            ->where('product_id', $product->id);
            
        if ($variantId) {
            $query->where('variant_id', $variantId);
        }

        $item = $query->first();

        if (! $item) {
            throw new \Exception('Item not found in cart', 404);
        }

        $item->quantity = $quantity;
        $item->save();

        return $cart->load(['items.product', 'items.variant']);
    }

    /**
     * Remove item from cart
     */
    public function removeItem(User $user, Product $product, ?int $variantId = null): Cart
    {
        $cart = Cart::query()->firstOrCreate(
            ['user_id' => $user->id],
            ['status' => 'active']
        );

        $query = CartItem::query()
            ->where('cart_id', $cart->id)
            ->where('product_id', $product->id);
            
        if ($variantId) {
            $query->where('variant_id', $variantId);
        }
        
        $query->delete();

        $cart->load(['items.product', 'items.variant']);

        return $cart;
    }
}
