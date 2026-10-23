<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Wishlist extends Model
{
    public $timestamps = false; // table only has created_at

    protected $fillable = [
        'user_id',
        'product_id',
        'blog_post_id',
        'video_id',
        'product_news_id',
    ];

    protected $casts = [
        'user_id' => 'integer',
        'product_id' => 'integer',
        'blog_post_id' => 'integer',
        'video_id' => 'integer',
        'product_news_id' => 'integer',
    ];

    /**
     * @return BelongsTo<User, Wishlist>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * @return BelongsTo<Product, Wishlist>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    /**
     * @return BelongsTo<BlogPost, Wishlist>
     */
    public function blogPost(): BelongsTo
    {
        return $this->belongsTo(BlogPost::class, 'blog_post_id');
    }

    /**
     * @return BelongsTo<Video, Wishlist>
     */
    public function video(): BelongsTo
    {
        return $this->belongsTo(Video::class, 'video_id');
    }

    /**
     * @return BelongsTo<ProductNews, Wishlist>
     */
    public function productNews(): BelongsTo
    {
        return $this->belongsTo(ProductNews::class, 'product_news_id');
    }
}
