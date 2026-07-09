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
 * @property int|null $cart_id
 * @property int|null $coupon_id
 * @property int|null $shipping_method_id
 * @property int|null $shipping_zone_id
 * @property string|null $status
 * @property string|null $payment_status
 * @property string|null $currency
 * @property float|null $subtotal_amount
 * @property float|null $discount_amount
 * @property float|null $shipping_fee
 * @property float|null $total_amount
 * @property int $points_used
 * @property float $points_discount
 * @property int $points_earned
 * @property string|null $shipping_name
 * @property string|null $shipping_phone
 * @property string|null $shipping_address_line
 * @property string|null $shipping_province
 * @property string|null $shipping_district
 * @property string|null $shipping_ward
 * @property string|null $notes
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
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
        'points_used',
        'points_discount',
        'points_earned',
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
        'points_discount' => 'decimal:2',
        'points_used' => 'integer',
        'points_earned' => 'integer',
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
