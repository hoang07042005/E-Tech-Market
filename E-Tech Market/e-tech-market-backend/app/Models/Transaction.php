<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transaction extends Model
{
    public $timestamps = false; // table only has created_at

    protected $fillable = [
        'payment_id',
        'provider',
        'provider_transaction_id',
        'amount',
        'currency',
        'status',
        'raw_response',
    ];

    protected $casts = [
        'payment_id' => 'integer',
        'amount' => 'decimal:2',
        'raw_response' => 'array',
    ];

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class, 'payment_id');
    }
}

