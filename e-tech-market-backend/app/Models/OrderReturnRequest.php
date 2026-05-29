<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderReturnRequest extends Model
{
    protected $table = 'order_return_requests';

    protected $fillable = [
        'order_id',
        'user_id',
        'status',
        'content',
        'media',
        'admin_note',
        'refund_proof',
        'approved_by_user_id',
        'approved_at',
        'refunded_at',
        'customer_confirmed_at',
    ];

    protected $casts = [
        'order_id' => 'integer',
        'user_id' => 'integer',
        'approved_by_user_id' => 'integer',
        'approved_at' => 'datetime',
        'refunded_at' => 'datetime',
        'customer_confirmed_at' => 'datetime',
        'media' => 'array',
        'refund_proof' => 'array',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }
}
