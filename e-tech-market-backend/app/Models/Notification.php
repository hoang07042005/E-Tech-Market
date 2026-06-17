<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Redis;

class Notification extends Model
{
    protected $fillable = [
        'user_id',
        'type',
        'title',
        'body',
        'data',
        'read_at',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'data' => 'array',
        'read_at' => 'datetime',
    ];

    protected static function booted()
    {
        static::created(function (Notification $notification) {
            try {
                Redis::connection()->publish('user-events.' . $notification->user_id, json_encode([
                    'type' => 'notification_created',
                    'notification' => $notification->toArray(),
                ]));
            } catch (\Exception $e) {}
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
