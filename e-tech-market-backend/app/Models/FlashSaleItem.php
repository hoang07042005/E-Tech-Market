<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FlashSaleItem extends Model
{
    /**
     * @property int $id
     * @property int $flash_sale_id
     */
    use HasFactory;

    protected $fillable = [
        'flash_sale_id',
        'product_id',
        'variant_id',
        'flash_sale_price',
        'quantity_limit',
        'sold_quantity',
    ];

    protected $casts = [
        'flash_sale_price' => 'decimal:2',
        'variant_id' => 'integer',
        'product_id' => 'integer',
    ];

    public function flashSale()
    {
        return $this->belongsTo(FlashSale::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }
}
