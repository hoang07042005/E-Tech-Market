<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class Coupon extends Model
{
    protected $fillable = [
        'code',
        'coupon_type',
        'value',
        'min_order_amount',
        'start_at',
        'end_at',
        'max_uses',
        'max_uses_per_user',
        'is_active',
    ];

    protected $casts = [
        'value' => 'decimal:2',
        'min_order_amount' => 'decimal:2',
        'start_at' => 'datetime',
        'end_at' => 'datetime',
        'max_uses' => 'integer',
        'max_uses_per_user' => 'integer',
        'is_active' => 'boolean',
    ];

    public function usages(): HasMany
    {
        return $this->hasMany(CouponUsage::class, 'coupon_id');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'coupon_id');
    }

    public function savedByUsers(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_coupons', 'coupon_id', 'user_id')->withTimestamps();
    }

    public function isValidNow(): bool
    {
        $now = Carbon::now();
        if (! $this->is_active) {
            return false;
        }
        if ($this->start_at && $now->lt($this->start_at)) {
            return false;
        }
        if ($this->end_at && $now->gt($this->end_at)) {
            return false;
        }

        return true;
    }
}
