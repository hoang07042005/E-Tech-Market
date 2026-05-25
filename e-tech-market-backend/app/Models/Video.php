<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Video extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'video_category_id',
        'title',
        'video_url',
        'thumbnail_url',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'product_id' => 'integer',
        'video_category_id' => 'integer',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function videoCategory(): BelongsTo
    {
        return $this->belongsTo(VideoCategory::class, 'video_category_id');
    }
}
