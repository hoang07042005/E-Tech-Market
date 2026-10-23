<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

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

    /**
     * @return BelongsTo<User, TradeInRequest>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Category, TradeInRequest>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * @return BelongsToMany<TradeInCondition>
     */
    public function conditions(): BelongsToMany
    {
        return $this->belongsToMany(TradeInCondition::class, 'trade_in_request_conditions');
    }
}
