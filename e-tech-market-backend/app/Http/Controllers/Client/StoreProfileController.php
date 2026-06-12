<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\AdminSetting;
use App\Models\ShippingMethod;
use App\Models\ShippingZone;
use Illuminate\Http\JsonResponse;

class StoreProfileController extends Controller
{
    public function __construct(private \App\Services\StoreProfileService $storeProfileService)
    {
    }

    /**
     * Public contact block for storefront (from Admin → Cài đặt → Danh tính cửa hàng).
     */
    public function contact(): JsonResponse
    {
        $contactInfo = $this->storeProfileService->getContactInfo();
        return response()->json($contactInfo);
    }

    /**
     * Public payment gateways availability (from Admin → Cài đặt → Cổng thanh toán).
     */
    public function payments(): JsonResponse
    {
        $gateways = $this->storeProfileService->getPaymentGateways();
        return response()->json($gateways);
    }

    /**
     * Public shipping configuration (methods + policy + zones).
     */
    public function shipping(): JsonResponse
    {
        $shipping = $this->storeProfileService->getShippingConfig();
        return response()->json($shipping);
    }

    /**
     * Public config (maintenance mode, etc.)
     */
    public function config(): JsonResponse
    {
        $config = $this->storeProfileService->getStoreConfig();
        return response()->json($config);
    }
}
