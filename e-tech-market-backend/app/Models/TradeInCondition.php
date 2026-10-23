<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TradeInCondition extends Model
{
    use HasFactory;

    protected $fillable = [
        'category_id',
        'name',
        'description',
        'deduction_percentage',
        'sort_order',
        'is_active',
    ];

    /**
     * @return BelongsTo<Category, TradeInCondition>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }
}
