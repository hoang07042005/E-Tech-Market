<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\AdminSetting;
use App\Models\ShippingMethod;
use App\Models\ShippingZone;
use Illuminate\Http\JsonResponse;

class StoreProfileController extends Controller
{
    /**
     * Public contact block for storefront (from Admin → Cài đặt → Danh tính cửa hàng).
     */
    public function contact(): JsonResponse
    {
        $row = AdminSetting::query()->where('key', 'store_profile')->first();
        $raw = $row && is_array($row->value) ? $row->value : [];

        $storeName = isset($raw['store_name']) && is_string($raw['store_name']) ? trim($raw['store_name']) : '';
        $email = isset($raw['contact_email']) && is_string($raw['contact_email']) ? trim($raw['contact_email']) : '';
        $phone = isset($raw['contact_phone']) && is_string($raw['contact_phone']) ? trim($raw['contact_phone']) : '';
        $address = isset($raw['warehouse_address']) && is_string($raw['warehouse_address']) ? trim($raw['warehouse_address']) : '';

        return response()->json([
            'store_name' => $storeName !== '' ? $storeName : 'E-Tech Market',
            'contact_email' => $email !== '' ? $email : 'support@etechmarket.vn',
            'contact_phone' => $phone,
            'warehouse_address' => $address,
        ]);
    }

    /**
     * Public payment gateways availability (from Admin → Cài đặt → Cổng thanh toán).
     */
    public function payments(): JsonResponse
    {
        $row = AdminSetting::query()->where('key', 'payment_gateways')->first();
        $raw = $row && is_array($row->value) ? $row->value : [];

        $momoEnabled = (bool) (($raw['momo']['enabled'] ?? true) ? true : false);
        $vnpayEnabled = (bool) (($raw['vnpay']['enabled'] ?? true) ? true : false);
        $codEnabled = (bool) (($raw['cod']['enabled'] ?? true) ? true : false);

        return response()->json([
            'momo' => ['enabled' => $momoEnabled],
            'vnpay' => ['enabled' => $vnpayEnabled],
            'cod' => ['enabled' => $codEnabled],
        ]);
    }

    /**
     * Public shipping configuration (methods + policy + zones).
     */
    public function shipping(): JsonResponse
    {
        $policyRow = AdminSetting::query()->where('key', 'shipping_policy')->first();
        $policyRaw = $policyRow && is_array($policyRow->value) ? $policyRow->value : [];
        $freeMin = (float) ($policyRaw['free_shipping_min'] ?? 0);
        $applyGlobal = (bool) ($policyRaw['apply_global'] ?? true);

        $methods = ShippingMethod::query()
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->get(['id', 'name', 'description', 'base_fee', 'estimated_days_min', 'estimated_days_max', 'is_active'])
            ->map(static fn(ShippingMethod $m) => [
                'id' => (int) $m->id,
                'name' => (string) $m->name,
                'description' => $m->description ? (string) $m->description : null,
                'base_fee' => (float) ($m->base_fee ?? 0),
                'estimated_days_min' => $m->estimated_days_min !== null ? (int) $m->estimated_days_min : null,
                'estimated_days_max' => $m->estimated_days_max !== null ? (int) $m->estimated_days_max : null,
                'is_active' => (bool) $m->is_active,
            ])->values()->all();

        $zones = ShippingZone::query()
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->get()
            ->map(static fn(ShippingZone $z) => [
                'id' => (int) $z->id,
                'name' => (string) $z->name,
                'eta' => $z->eta ? (string) $z->eta : null,
                'fee' => (float) ($z->fee ?? 0),
                'is_active' => (bool) $z->is_active,
            ])->values()->all();

        return response()->json([
            'policy' => [
                'free_shipping_min' => $freeMin,
                'apply_global' => $applyGlobal,
            ],
            'methods' => $methods,
            'zones' => $zones,
        ]);
    }

    /**
     * Public config (maintenance mode, etc.)
     */
    public function config(): JsonResponse
    {
        $row = AdminSetting::query()->where('key', 'store_profile')->first();
        $raw = $row && is_array($row->value) ? $row->value : [];
        return response()->json([
            'maintenance_mode' => (bool) ($raw['maintenance_mode'] ?? false),
        ]);
    }
}
