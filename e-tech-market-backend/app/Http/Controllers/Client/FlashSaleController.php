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

        // Tự động tắt các chiến dịch đã hết hạn
        FlashSale::where('status', '!=', FlashSale::STATUS_ENDED)
            ->where('end_at', '<', $now)
            ->update(['status' => FlashSale::STATUS_ENDED]);

        $sale = \Illuminate\Support\Facades\Cache::remember('active_flash_sale', 60, function () use ($now) {
            // Find a flash sale that is currently active and within time range
            $sale = FlashSale::where('status', FlashSale::STATUS_ACTIVE)
                ->where('start_at', '<=', $now)
                ->where('end_at', '>=', $now)
                ->with(['items' => function($query) {
                    $query->with(['product', 'variant']);
                }])
                ->first();

            if (!$sale) {
                // Check for upcoming flash sale if no current one
                $sale = FlashSale::whereIn('status', [FlashSale::STATUS_ACTIVE, FlashSale::STATUS_WAITING])
                    ->where('start_at', '>', $now)
                    ->orderBy('start_at', 'asc')
                    ->with(['items' => function($query) {
                        $query->with(['product', 'variant']);
                    }])
                    ->first();
            }
            return $sale;
        });

        return response()->json($sale);
    }
}
