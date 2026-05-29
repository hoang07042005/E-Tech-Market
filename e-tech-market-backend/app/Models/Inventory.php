<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
