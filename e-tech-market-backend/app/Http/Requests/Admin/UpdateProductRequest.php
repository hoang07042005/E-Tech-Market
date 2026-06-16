<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'category_id' => 'required|exists:categories,id',
            'brand' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'rich_html' => 'nullable|string',
            'is_active' => 'boolean',
            'is_featured' => 'boolean',
            'images' => 'nullable|array|max:12',
            'images.*' => 'image|mimes:jpeg,png,jpg,webp|max:2048',
            'keep_existing_images' => 'nullable',
            'specs' => 'nullable|string', // JSON string
            'variants' => 'nullable|string', // JSON string
            'faqs' => 'nullable|string', // JSON string
        ];
    }
}
