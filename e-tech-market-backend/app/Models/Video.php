<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int|null $product_id
 * @property int|null $video_category_id
 * @property string $title
 * @property string|null $description
 * @property string $video_url
 * @property string|null $thumbnail_url
 * @property int|null $sort_order
 * @property bool $is_active
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
class Video extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'video_category_id',
        'title',
        'description',
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

    public function products()
    {
        return $this->belongsToMany(Product::class, 'product_video');
    }

    public function videoCategory(): BelongsTo
    {
        return $this->belongsTo(VideoCategory::class, 'video_category_id');
    }
}
