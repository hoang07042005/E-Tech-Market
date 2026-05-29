<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ReplyQnaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'answer' => ['nullable', 'string', 'max:10000'],
            'is_visible' => ['sometimes', 'boolean'],
        ];
    }
}
