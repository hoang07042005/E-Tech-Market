<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\FlashSale;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

class FlashSaleController extends Controller
{
    public function __construct(private \App\Services\FlashSaleService $flashSaleService)
    {
    }

    public function current(): JsonResponse
    {
        $sale = $this->flashSaleService->getCurrentClientSale();

        return response()->json($sale);
    }
}
