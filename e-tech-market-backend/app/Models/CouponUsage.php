<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CouponUsage extends Model
{
    public $timestamps = false; // table only has used_at + id

    protected $fillable = [
        'coupon_id',
        'user_id',
        'order_id',
        'discount_amount',
        'used_at',
    ];

    protected $casts = [
        'coupon_id' => 'integer',
        'user_id' => 'integer',
        'order_id' => 'integer',
        'discount_amount' => 'decimal:2',
        'used_at' => 'datetime',
    ];

    protected $table = 'coupon_usage';

    public function coupon(): BelongsTo
    {
        return $this->belongsTo(Coupon::class, 'coupon_id');
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
