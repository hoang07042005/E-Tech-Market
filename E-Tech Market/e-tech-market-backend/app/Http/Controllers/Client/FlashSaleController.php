<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\FlashSale;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

class FlashSaleController extends Controller
{
    public function current(): JsonResponse
    {
        $now = Carbon::now();

        // Find a flash sale that is currently active and within time range
        $sale = FlashSale::where('is_active', true)
            ->where('start_at', '<=', $now)
            ->where('end_at', '>=', $now)
            ->with(['items' => function($query) {
                $query->with(['product', 'variant']);
            }])
            ->first();

        if (!$sale) {
            // Check for upcoming flash sale if no current one
            $sale = FlashSale::where('is_active', true)
                ->where('start_at', '>', $now)
                ->orderBy('start_at', 'asc')
                ->with(['items' => function($query) {
                    $query->with(['product', 'variant']);
                }])
                ->first();
        }

        return response()->json($sale);
    }
}
