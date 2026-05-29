<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'is_active' => 'sometimes|boolean',
            'role_ids' => 'sometimes|array|min:1',
            'role_ids.*' => 'integer|exists:roles,id',
        ];
    }
}
