<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @OA\Schema(
 *     schema="Product",
 *     title="Product",
 *     description="Product model",
 *     required={"id", "name", "slug"},
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="name", type="string", example="iPhone 15 Pro Max"),
 *     @OA\Property(property="slug", type="string", example="iphone-15-pro-max"),
 *     @OA\Property(property="sku", type="string", example="IP15PM-256-BLK"),
 *     @OA\Property(property="description", type="string", example="Product description..."),
 *     @OA\Property(property="short_description", type="string", example="Short description"),
 *     @OA\Property(property="price", type="number", format="decimal", example=29990000),
 *     @OA\Property(property="compare_price", type="number", format="decimal", example=32990000),
 *     @OA\Property(property="images", type="array", @OA\Items(type="string"), example={"/images/product1.jpg"}),
 *     @OA\Property(property="category_id", type="integer", example=1),
 *     @OA\Property(property="brand", type="string", example="Apple"),
 *     @OA\Property(property="is_active", type="boolean", example=true),
 *     @OA\Property(property="is_featured", type="boolean", example=false),
 *     @OA\Property(property="is_new", type="boolean", example=false),
 *     @OA\Property(property="average_rating", type="number", example=4.5),
 *     @OA\Property(property="review_count", type="integer", example=100),
 *     @OA\Property(property="stock_quantity", type="integer", example=50),
 *     @OA\Property(property="created_at", type="string", format="date-time"),
 *     @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 */
class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $data = parent::toArray($request);

        // Hide sensitive backend information if any exists
        unset($data['cost_price']);
        unset($data['deleted_at']);

        // Ensure rich_html is included
        if (isset($this->resource->rich_html)) {
            $data['rich_html'] = $this->resource->rich_html;
        }

        return $data;
    }
}