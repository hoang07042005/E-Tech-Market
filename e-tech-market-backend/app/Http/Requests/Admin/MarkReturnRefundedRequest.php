<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class MarkReturnRefundedRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'admin_note' => ['nullable', 'string', 'max:4000'],
            'refund_proof' => ['nullable', 'array', 'max:8'],
            'refund_proof.*' => ['file', 'max:51200'],
        ];
    }
}
