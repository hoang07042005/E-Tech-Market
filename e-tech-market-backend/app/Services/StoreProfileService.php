<?php

namespace App\Services;

use App\Models\AdminSetting;
use App\Models\ShippingMethod;
use App\Models\ShippingZone;
use Illuminate\Support\Facades\Cache;

class StoreProfileService
{
    /**
     * Public contact block for storefront
     */
    public function getContactInfo(): array
    {
        $row = AdminSetting::query()->where('key', 'store_profile')->first();
        $raw = $row && is_array($row->value) ? $row->value : [];

        $storeName = isset($raw['store_name']) && is_string($raw['store_name']) ? trim($raw['store_name']) : '';
        $email = isset($raw['contact_email']) && is_string($raw['contact_email']) ? trim($raw['contact_email']) : '';
        $phone = isset($raw['contact_phone']) && is_string($raw['contact_phone']) ? trim($raw['contact_phone']) : '';
        $address = isset($raw['warehouse_address']) && is_string($raw['warehouse_address']) ? trim($raw['warehouse_address']) : '';

        return [
            'store_name' => $storeName !== '' ? $storeName : 'E-Tech Market',
            'contact_email' => $email !== '' ? $email : 'support@etechmarket.vn',
            'contact_phone' => $phone,
            'warehouse_address' => $address,
        ];
    }

    /**
     * Public payment gateways availability
     */
    public function getPaymentGateways(): array
    {
        $row = AdminSetting::query()->where('key', 'payment_gateways')->first();
        $raw = $row && is_array($row->value) ? $row->value : [];

        return [
            'momo' => ['enabled' => (bool) (($raw['momo']['enabled'] ?? true) ? true : false)],
            'vnpay' => ['enabled' => (bool) (($raw['vnpay']['enabled'] ?? true) ? true : false)],
            'cod' => ['enabled' => (bool) (($raw['cod']['enabled'] ?? true) ? true : false)],
        ];
    }

    /**
     * Public shipping configuration (methods + policy + zones)
     */
    public function getShippingConfig(): array
    {
        $policyRow = AdminSetting::query()->where('key', 'shipping_policy')->first();
        $policyRaw = $policyRow && is_array($policyRow->value) ? $policyRow->value : [];
        $freeMin = (float) ($policyRaw['free_shipping_min'] ?? 0);
        $applyGlobal = (bool) ($policyRaw['apply_global'] ?? true);

        $methods = ShippingMethod::query()
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->get(['id', 'name', 'description', 'base_fee', 'estimated_days_min', 'estimated_days_max', 'is_active'])
            ->map(static fn (ShippingMethod $m) => [
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
            ->map(static fn (ShippingZone $z) => [
                'id' => (int) $z->id,
                'name' => (string) $z->name,
                'eta' => $z->eta ? (string) $z->eta : null,
                'fee' => (float) ($z->fee ?? 0),
                'is_active' => (bool) $z->is_active,
            ])->values()->all();

        return [
            'policy' => [
                'free_shipping_min' => $freeMin,
                'apply_global' => $applyGlobal,
            ],
            'methods' => $methods,
            'zones' => $zones,
        ];
    }

    private function getSetting(string $key, mixed $default = null): mixed
    {
        $row = AdminSetting::query()->where('key', $key)->first();
        return $row ? ($row->value ?? $default) : $default;
    }

    /**
     * Public config (maintenance mode, etc.)
     */
    public function getStoreConfig(): array
    {
        return Cache::remember('store_config', 300, function () {
            $raw = (array) $this->getSetting('store_profile', []);
            $chat = (array) $this->getSetting('chat', [
                'service' => 'none',
                'facebook_page_id' => '',
                'zalo_oa_id' => '',
                'tawkto_property_id' => '',
                'tawkto_widget_id' => '',
            ]);

            return [
                'maintenance_mode' => (bool) ($raw['maintenance_mode'] ?? false),
                'chat' => $chat,
            ];
        });
    }
}
