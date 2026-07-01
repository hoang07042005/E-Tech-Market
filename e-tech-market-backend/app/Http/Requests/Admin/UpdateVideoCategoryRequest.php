<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateVideoCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        /** @var \App\Models\VideoCategory|null $videoCategory */
        $videoCategory = $this->route('videoCategory') ?: $this->route('video_category');

        $slugRule = ['sometimes', 'string', 'max:255'];

        if ($videoCategory) {
            $slugRule[] = Rule::unique('video_categories', 'slug')->ignore($videoCategory->id);
        } else {
            $slugRule[] = Rule::unique('video_categories', 'slug');
        }

        return [
            'name' => 'sometimes|string|max:255',
            'slug' => $slugRule,
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'sort_order' => 'nullable|integer',
        ];
    }
}
