<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TradeInRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'request_code',
        'user_id',
        'category_id',
        'machine_info',
        'images',
        'customer_name',
        'customer_phone',
        'customer_email',
        'estimated_price',
        'final_price',
        'status',
        'admin_note',
    ];
    
    protected $casts = [
        'images' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function conditions()
    {
        return $this->belongsToMany(TradeInCondition::class, 'trade_in_request_conditions');
    }
}
