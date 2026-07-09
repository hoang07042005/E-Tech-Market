<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $name
 * @property \Illuminate\Support\Carbon $start_at
 * @property \Illuminate\Support\Carbon $end_at
 * @property string $status
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
class FlashSale extends Model
{
    use HasFactory;

    const STATUS_WAITING = 'waiting';

    const STATUS_ACTIVE = 'active';

    const STATUS_ENDED = 'ended';

    const STATUS_PAUSED = 'paused';

    protected $fillable = ['name', 'start_at', 'end_at', 'status'];

    protected $casts = [
        'start_at' => 'datetime',
        'end_at' => 'datetime',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(FlashSaleItem::class);
    }
}
