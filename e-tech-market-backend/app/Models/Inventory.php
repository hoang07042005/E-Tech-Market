<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $product_id
 * @property string|null $location_code
 * @property int $quantity_on_hand
 * @property int|null $reorder_level
 * @property \Illuminate\Support\Carbon|null $last_stock_in_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
class Inventory extends Model
{
    protected $table = 'inventory';

    protected $fillable = [
        'product_id',
        'location_code',
        'quantity_on_hand',
        'reorder_level',
        'last_stock_in_at',
    ];

    protected $casts = [
        'product_id' => 'integer',
        'quantity_on_hand' => 'integer',
        'reorder_level' => 'integer',
        'last_stock_in_at' => 'datetime',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
}
