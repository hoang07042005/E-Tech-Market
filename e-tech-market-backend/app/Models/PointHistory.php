<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PointHistory extends Model
{
    use HasFactory;

    protected $table = 'point_history';

    protected $fillable = [
        'user_id',
        'order_id',
        'points_changed',
        'action_type',
        'description',
    ];

    /**
     * @return BelongsTo<User, PointHistory>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
