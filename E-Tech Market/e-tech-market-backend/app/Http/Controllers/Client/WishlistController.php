<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Wishlist;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class WishlistController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $items = Wishlist::query()
            ->where('user_id', $user->id)
            ->with(['product' => fn($q) => $q->where('is_active', true)->with('category')])
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($items);
    }

    public function toggle(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'product_id' => ['required', 'integer', 'min:1'],
        ]);

        $product = Product::query()->where('id', $data['product_id'])->where('is_active', true)->first();
        if (!$product) {
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
            return response()->json(['status' => 'removed']);
        }

        Wishlist::query()->create([
            'user_id' => $user->id,
            'product_id' => $product->id,
        ]);

        return response()->json(['status' => 'added']);
    }
}

