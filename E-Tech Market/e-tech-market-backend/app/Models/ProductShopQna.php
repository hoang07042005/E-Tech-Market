<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductShopQna extends Model
{
    protected $table = 'product_shop_qnas';

    protected $fillable = [
        'product_id',
        'user_id',
        'asker_display_name',
        'question',
        'answer',
        'answered_at',
        'is_visible',
    ];

    protected $casts = [
        'product_id' => 'integer',
        'user_id' => 'integer',
        'answered_at' => 'datetime',
        'is_visible' => 'boolean',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
