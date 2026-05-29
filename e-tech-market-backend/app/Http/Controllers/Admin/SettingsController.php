<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminSetting;
use App\Models\Payment;
use App\Models\ShippingMethod;
use App\Models\ShippingZone;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Requests\Admin\UpdateSettingsRequest;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class SettingsController extends Controller
{
    private function getSetting(string $key, mixed $default = null): mixed
    {
        $row = AdminSetting::query()->where('key', $key)->first();
        return $row ? ($row->value ?? $default) : $default;
    }

    private function setSetting(string $key, mixed $value, ?int $updatedBy): void
    {
        AdminSetting::query()->updateOrCreate(
            ['key' => $key],
            ['value' => $value, 'updated_by' => $updatedBy]
        );
    }

    public function show(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $store = (array) $this->getSetting('store_profile', [
            'store_name' => 'E-Tech Market Official',
            'contact_email' => $user->email ?? 'admin@etechmarket.com',
            'contact_phone' => $user->phone ?? '',
            'warehouse_address' => '',
            'currency' => 'VND',
            'language' => 'vi',
            'maintenance_mode' => false,
        ]);
        if (!isset($store['maintenance_mode'])) {
            $store['maintenance_mode'] = false;
        }

        $paymentsCfg = array_replace_recursive(
            [
                'momo' => ['enabled' => true, 'partner_id' => null],
                'vnpay' => ['enabled' => true, 'tmn_code' => null],
                'cod' => ['enabled' => true],
            ],
            (array) $this->getSetting('payment_gateways', [])
        );
        unset($paymentsCfg['card']);
        $paymentsCfg = array_intersect_key($paymentsCfg, array_flip(['momo', 'vnpay', 'cod']));

        $shippingPolicy = (array) $this->getSetting('shipping_policy', [
            'free_shipping_min' => 5000000,
            'apply_global' => true,
        ]);

        $twoFaKey = 'security_2fa_enabled_user_' . (int) $user->id;
        $security = (array) $this->getSetting('security', [
            $twoFaKey => false,
        ]);

        // recent transactions from payments (real)
        $recentTransactions = Payment::query()
            ->with(['order:id,order_code,user_id,total_amount', 'order.user:id,name'])
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(static function (Payment $p) {
                $order = $p->order;
                return [
                    'code' => $order?->order_code ? (string) $order->order_code : ('ET-' . (int) $p->order_id),
                    'customer' => (string) ($order?->user?->name ?? '—'),
                    'amount' => (float) ($p->amount ?? 0),
                    'status' => (string) ($p->status ?? 'pending'),
                    'status_label' => match ((string) $p->status) {
                        'paid', 'success' => 'THÀNH CÔNG',
                        'failed' => 'THẤT BẠI',
                        default => 'ĐANG XỬ LÝ',
                    },
                    'status_tone' => match ((string) $p->status) {
                        'paid', 'success' => 'ok',
                        'failed' => 'bad',
                        default => 'wait',
                    },
                ];
            })
            ->values()
            ->all();

        $shippingMethods = ShippingMethod::query()
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->get(['id', 'name', 'description', 'base_fee', 'estimated_days_min', 'estimated_days_max', 'is_active'])
            ->map(static fn($m) => [
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
            ->orderBy('id', 'desc')
            ->limit(20)
            ->get()
            ->map(static fn(ShippingZone $z) => [
                'id' => (int) $z->id,
                'name' => (string) $z->name,
                'eta' => $z->eta ? (string) $z->eta : null,
                'fee' => (float) ($z->fee ?? 0),
                'is_active' => (bool) $z->is_active,
            ])->values()->all();

        $lastSetting = AdminSetting::query()->orderByDesc('updated_at')->first();
        $updatedByUser = null;
        if ($lastSetting && $lastSetting->updated_by) {
            $updatedByUser = User::query()->find((int) $lastSetting->updated_by);
        }

        // security summary using Sanctum tokens
        $lastToken = DB::table('personal_access_tokens')
            ->where('tokenable_type', '=', 'App\\Models\\User')
            ->where('tokenable_id', '=', (int) $user->id)
            ->orderByDesc('created_at')
            ->first();

        $lastLoginAt = null;
        if ($lastToken && isset($lastToken->created_at)) {
            try {
                $lastLoginAt = Carbon::parse($lastToken->created_at)->diffForHumans();
            } catch (\Throwable) {
                $lastLoginAt = null;
            }
        }

        $securityPayload = [
            'two_fa_enabled' => (bool) ($security[$twoFaKey] ?? false),
            'strength_label' => 'Mạnh',
            'last_login' => $lastLoginAt,
            'alerts' => 3,
        ];

        $chat = (array) $this->getSetting('chat', [
            'service' => 'none',
            'facebook_page_id' => '',
            'zalo_oa_id' => '',
            'tawkto_property_id' => '',
            'tawkto_widget_id' => '',
        ]);

        return response()->json([
            'meta' => [
                'last_saved_at' => $lastSetting?->updated_at?->toISOString(),
                'updated_by' => $updatedByUser ? [
                    'id' => (int) $updatedByUser->id,
                    'name' => (string) ($updatedByUser->name ?? '—'),
                    'email' => (string) ($updatedByUser->email ?? ''),
                ] : null,
            ],
            'store' => $store,
            'payments' => $paymentsCfg,
            'recent_transactions' => $recentTransactions,
            'shipping' => [
                'methods' => $shippingMethods,
                'policy' => $shippingPolicy,
                'zones' => $zones,
            ],
            'security' => $securityPayload,
            'chat' => $chat,
        ]);
    }

    public function update(UpdateSettingsRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $data = $request->validated();

        DB::transaction(function () use ($data, $user) {
            if (isset($data['store'])) {
                $current = (array) $this->getSetting('store_profile', []);
                $this->setSetting('store_profile', array_merge($current, $data['store']), (int) $user->id);
            }
            if (isset($data['payments'])) {
                $current = (array) $this->getSetting('payment_gateways', []);
                $merged = array_replace_recursive($current, $data['payments']);
                unset($merged['card']);
                $this->setSetting(
                    'payment_gateways',
                    array_intersect_key($merged, array_flip(['momo', 'vnpay', 'cod'])),
                    (int) $user->id
                );
            }
            if (isset($data['shipping_policy'])) {
                $current = (array) $this->getSetting('shipping_policy', []);
                $this->setSetting('shipping_policy', array_merge($current, $data['shipping_policy']), (int) $user->id);
            }
            if (isset($data['security']['two_fa_enabled'])) {
                $twoFaKey = 'security_2fa_enabled_user_' . (int) $user->id;
                $sec = (array) $this->getSetting('security', []);
                $sec[$twoFaKey] = (bool) $data['security']['two_fa_enabled'];
                $this->setSetting('security', $sec, (int) $user->id);
            }
            if (isset($data['chat'])) {
                $current = (array) $this->getSetting('chat', []);
                $this->setSetting('chat', array_merge($current, $data['chat']), (int) $user->id);
            }

            \Illuminate\Support\Facades\Cache::forget('store_config');
        });

        return $this->show($request);
    }
}

