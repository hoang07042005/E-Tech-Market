<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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

    public function category()
    {
        return $this->belongsTo(Category::class);
    }
}
