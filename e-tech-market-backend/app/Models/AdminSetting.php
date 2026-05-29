<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $key
 * @property mixed $value
 * @property string|null $type
 * @property int|null $updated_by
 */
class AdminSetting extends Model
{
    protected $fillable = [
        'key',
        'value',
        'updated_by',
    ];

    protected $casts = [
        'value' => 'array',
        'updated_by' => 'integer',
    ];
}
