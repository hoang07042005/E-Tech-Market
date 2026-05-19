<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'avatar_url' => $this->avatar_url,
            'address_line' => $this->address_line,
            'province' => $this->province,
            'district' => $this->district,
            'ward' => $this->ward,
            'is_active' => $this->is_active,
            'roles' => $this->whenLoaded('roles'),
            'created_at' => $this->created_at,
        ];
    }
}
