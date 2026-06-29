<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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
}
