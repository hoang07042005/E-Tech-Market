<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'store' => ['nullable', 'array'],
            'store.store_name' => ['nullable', 'string', 'max:255'],
            'store.contact_email' => ['nullable', 'string', 'max:255'],
            'store.contact_phone' => ['nullable', 'string', 'max:50'],
            'store.warehouse_address' => ['nullable', 'string'],
            'store.currency' => ['nullable', 'string', 'max:10'],
            'store.language' => ['nullable', 'string', 'max:10'],
            'store.maintenance_mode' => ['nullable', 'boolean'],

            'payments' => ['nullable', 'array'],
            'payments.momo' => ['nullable', 'array'],
            'payments.momo.enabled' => ['nullable', 'boolean'],
            'payments.momo.partner_id' => ['nullable', 'string', 'max:255'],
            'payments.vnpay' => ['nullable', 'array'],
            'payments.vnpay.enabled' => ['nullable', 'boolean'],
            'payments.vnpay.tmn_code' => ['nullable', 'string', 'max:255'],
            'payments.cod' => ['nullable', 'array'],
            'payments.cod.enabled' => ['nullable', 'boolean'],

            'shipping_policy' => ['nullable', 'array'],
            'shipping_policy.free_shipping_min' => ['nullable', 'numeric', 'min:0'],
            'shipping_policy.apply_global' => ['nullable', 'boolean'],

            'security' => ['nullable', 'array'],
            'security.two_fa_enabled' => ['nullable', 'boolean'],

            'chat' => ['nullable', 'array'],
            'chat.service' => ['nullable', 'string', 'in:none,facebook,zalo,tawkto'],
            'chat.facebook_page_id' => ['nullable', 'string', 'max:255'],
            'chat.zalo_oa_id' => ['nullable', 'string', 'max:255'],
            'chat.tawkto_property_id' => ['nullable', 'string', 'max:255'],
            'chat.tawkto_widget_id' => ['nullable', 'string', 'max:255'],
        ];
    }
}
