<?php

namespace App\Services;

use App\Models\Product;
use App\Models\User;
use App\Models\Wishlist;
use Illuminate\Validation\ValidationException;

class WishlistService
{
    /**
     * Get user's wishlist
     */
    public function getUserWishlist(User $user)
    {
        return Wishlist::query()
            ->where('user_id', $user->id)
            ->with(['product' => fn ($q) => $q->where('is_active', true)->with('category')])
            ->orderBy('id', 'desc')
            ->get();
    }

    /**
     * Toggle product in wishlist
     */
    public function toggleWishlistItem(User $user, int $productId): string
    {
        $product = Product::query()->where('id', $productId)->where('is_active', true)->first();
        if (! $product) {
            throw ValidationException::withMessages([
                'product_id' => ['Product not found or inactive.'],
            ]);
        }

        $exists = Wishlist::query()
            ->where('user_id', $user->id)
            ->where('product_id', $product->id)
            ->first();

        if ($exists) {
            $exists->delete();
            return 'removed';
        }

        Wishlist::query()->create([
            'user_id' => $user->id,
            'product_id' => $product->id,
        ]);

        return 'added';
    }
}
