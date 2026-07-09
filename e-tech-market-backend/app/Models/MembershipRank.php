<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $rank_name
 * @property float $min_spend
 * @property float $point_multiplier
 * @property string|null $benefits
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
class MembershipRank extends Model
{
    use HasFactory;

    protected $table = 'membership_ranks';

    protected $fillable = [
        'rank_name',
        'min_spend',
        'point_multiplier',
        'benefits',
    ];

    protected $appends = ['name'];

    public function getNameAttribute(): string
    {
        return $this->rank_name;
    }
}
