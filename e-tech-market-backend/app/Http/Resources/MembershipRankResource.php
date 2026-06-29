<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MembershipRankResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'rank_name' => $this->rank_name,
            'min_spend' => $this->min_spend,
            'point_multiplier' => $this->point_multiplier,
            'benefits' => $this->benefits,
        ];
    }
}