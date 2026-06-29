<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
