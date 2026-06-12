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
    public function __construct(private \App\Services\WishlistService $wishlistService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $items = $this->wishlistService->getUserWishlist($request->user());
        return response()->json($items);
    }

    public function toggle(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id' => ['required', 'integer', 'min:1'],
        ]);

        $status = $this->wishlistService->toggleWishlistItem($request->user(), (int) $data['product_id']);
        return response()->json(['status' => $status]);
    }
}
