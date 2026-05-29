<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property int $id
 * @property string|null $order_code
 * @property int|null $user_id
 * @property string|null $status
 * @property string|null $payment_status
 * @property float|null $total_amount
 */
class Order extends Model
{
    protected $fillable = [
        'order_code',
        'user_id',
        'cart_id',
        'coupon_id',
        'shipping_method_id',
        'shipping_zone_id',
        'status',
        'payment_status',
        'currency',
        'subtotal_amount',
        'discount_amount',
        'shipping_fee',
        'total_amount',
        'shipping_name',
        'shipping_phone',
        'shipping_address_line',
        'shipping_province',
        'shipping_district',
        'shipping_ward',
        'notes',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'cart_id' => 'integer',
        'coupon_id' => 'integer',
        'shipping_method_id' => 'integer',
        'shipping_zone_id' => 'integer',
        'subtotal_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'shipping_fee' => 'decimal:2',
        'total_amount' => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function cart(): BelongsTo
    {
        return $this->belongsTo(Cart::class, 'cart_id');
    }

    public function coupon(): BelongsTo
    {
        return $this->belongsTo(Coupon::class, 'coupon_id');
    }

    public function shippingMethod(): BelongsTo
    {
        return $this->belongsTo(ShippingMethod::class, 'shipping_method_id');
    }

    public function shippingZone(): BelongsTo
    {
        return $this->belongsTo(ShippingZone::class, 'shipping_zone_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class, 'order_id');
    }

    public function statusHistories(): HasMany
    {
        return $this->hasMany(OrderStatusHistory::class, 'order_id')->orderByDesc('created_at');
    }

    public function payment(): HasOne
    {
        return $this->hasOne(Payment::class, 'order_id');
    }

    public function returnRequest(): HasOne
    {
        return $this->hasOne(OrderReturnRequest::class, 'order_id');
    }
}
