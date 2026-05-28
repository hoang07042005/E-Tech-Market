<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductVariant extends Model
{
    /**
     * @property int $id
     * @property bool $wasRecentlyCreated
     */
    use SoftDeletes;

    protected $fillable = [
        'product_id',
        'variant_name',
        'color',
        'configuration',
        'sku',
        'price',
        'discount_type',
        'discount_value',
        'discount_start_at',
        'discount_end_at',
        'stock_quantity',
        'image_url',
        'is_active',
    ];

    protected $casts = [
        'product_id'        => 'integer',
        'price'             => 'decimal:2',
        'discount_value'    => 'decimal:2',
        'discount_start_at' => 'datetime',
        'discount_end_at'   => 'datetime',
        'stock_quantity'    => 'integer',
        'is_active'         => 'boolean',
    ];

    /**
     * Append effective_price to JSON output.
     */
    protected $appends = ['effective_price'];

    /**
     * Tính giá sau khi áp dụng giảm giá (nếu đang trong thời gian hiệu lực).
     */
    public function getEffectivePriceAttribute(): float
    {
        if (
            empty($this->discount_type) ||
            empty($this->discount_value) ||
            ($this->discount_start_at && now()->lt($this->discount_start_at)) ||
            ($this->discount_end_at   && now()->gt($this->discount_end_at))
        ) {
            return (float) $this->price;
        }

        if ($this->discount_type === 'percentage') {
            return round(max(0, (float) $this->price * (1 - (float) $this->discount_value / 100)), 2);
        }

        return round(max(0, (float) $this->price - (float) $this->discount_value), 2);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function specs(): HasMany
    {
        return $this->hasMany(ProductSpec::class, 'product_variant_id');
    }
}
