<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $product_id
 * @property int|null $user_id
 * @property string|null $asker_display_name
 * @property string $question
 * @property string|null $answer
 * @property \Illuminate\Support\Carbon|null $answered_at
 * @property bool $is_visible
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
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
