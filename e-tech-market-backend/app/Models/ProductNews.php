<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProductNews extends Model
{
    use SoftDeletes;

    protected $table = 'product_news';

    protected $fillable = [
        'product_id',
        'title',
        'slug',
        'content_html',
        'thumbnail_url',
        'sort_order',
        'is_active',
        'published_at',
    ];

    protected $casts = [
        'product_id' => 'integer',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
        'published_at' => 'datetime',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
}
