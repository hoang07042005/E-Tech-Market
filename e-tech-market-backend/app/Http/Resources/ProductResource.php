<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $data = parent::toArray($request);
        
        // Hide sensitive backend information if any exists
        unset($data['cost_price']);
        unset($data['deleted_at']);
        
        return $data;
    }
}
