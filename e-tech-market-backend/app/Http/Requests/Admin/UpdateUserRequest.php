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
            'rank_id' => 'sometimes|nullable|integer|exists:membership_ranks,id',
            'current_points' => 'sometimes|integer|min:0',
            'total_spent' => 'sometimes|integer|min:0',
        ];
    }
}
