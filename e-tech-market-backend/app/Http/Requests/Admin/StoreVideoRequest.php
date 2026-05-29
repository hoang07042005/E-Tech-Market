<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreVideoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'product_id'        => 'nullable|integer|exists:products,id',
            'video_category_id' => 'nullable|integer|exists:video_categories,id',
            'title'             => 'nullable|string|max:255',
            'description'       => 'nullable|string|max:1000',
            'video_url'         => 'nullable|string|max:1000',
            'video_file'        => 'nullable|file|mimetypes:video/mp4,video/quicktime,video/ogg,video/webm|max:51200',
            'thumbnail_url'     => 'nullable|string|max:1000',
            'thumbnail_file'    => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
            'sort_order'        => 'nullable|integer',
            'is_active'         => 'nullable',
        ];
    }
}
