<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'category_id',
        'name',
        'slug',
        'brand',
        'description',
        'rich_html',
        'price',
        'main_image_url',
        'is_active',
    ];

    protected $casts = [
        'category_id' => 'integer',
        'price' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class, 'product_id');
    }

    public function specs(): HasMany
    {
        return $this->hasMany(ProductSpec::class, 'product_id');
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class, 'product_id');
    }

    public function faqs(): HasMany
    {
        return $this->hasMany('App\\Models\\ProductFaq', 'product_id')->orderBy('sort_order');
    }

    public function news(): HasMany
    {
        return $this->hasMany('App\\Models\\ProductNews', 'product_id')
            ->orderByDesc('published_at')
            ->orderBy('sort_order');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class, 'product_id');
    }

    public function shopQnas(): HasMany
    {
        return $this->hasMany(ProductShopQna::class, 'product_id');
    }

    public function wishlists(): HasMany
    {
        return $this->hasMany(Wishlist::class, 'product_id');
    }

    public function inventoryItems(): HasMany
    {
        return $this->hasMany(Inventory::class, 'product_id');
    }

    public function flashSaleItems(): HasMany
    {
        return $this->hasMany(FlashSaleItem::class, 'product_id');
    }
}

