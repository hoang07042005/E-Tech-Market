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
        $type = $request->query('type', 'product');
        $items = $this->wishlistService->getUserWishlist($request->user(), $type);
        return response()->json($items);
    }

    public function toggle(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id' => ['required', 'integer', 'min:1'],
            'type' => ['nullable', 'string', 'in:product,blog,video,news'],
        ]);

        $type = $data['type'] ?? 'product';
        $status = $this->wishlistService->toggleWishlistItem($request->user(), (int) $data['id'], $type);
        return response()->json(['status' => $status]);
    }
}
