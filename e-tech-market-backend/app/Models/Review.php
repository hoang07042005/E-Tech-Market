<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Review extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'product_id',
        'user_id',
        'order_id',
        'rating',
        'exp_performance',
        'exp_battery',
        'exp_camera',
        'comment',
        'status',
    ];

    protected $casts = [
        'product_id' => 'integer',
        'user_id' => 'integer',
        'order_id' => 'integer',
        'rating' => 'integer',
        'exp_performance' => 'integer',
        'exp_battery' => 'integer',
        'exp_camera' => 'integer',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id');
    }
}
