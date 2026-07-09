<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $order_id
 * @property int $user_id
 * @property string $status
 * @property string|null $content
 * @property array|null $media
 * @property string|null $admin_note
 * @property array|null $refund_proof
 * @property int|null $approved_by_user_id
 * @property \Illuminate\Support\Carbon|null $approved_at
 * @property \Illuminate\Support\Carbon|null $refunded_at
 * @property \Illuminate\Support\Carbon|null $customer_confirmed_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
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
