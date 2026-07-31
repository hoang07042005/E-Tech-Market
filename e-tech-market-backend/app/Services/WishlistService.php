<?php

namespace App\Services;

use App\Models\Product;
use App\Models\User;
use App\Models\Wishlist;
use Illuminate\Validation\ValidationException;

class WishlistService
{
    /**
     * Get user's wishlist
     */
    public function getUserWishlist(User $user, ?string $type = 'product')
    {
        $query = Wishlist::query()->where('user_id', $user->id);
        
        switch ($type) {
            case 'blog':
                $query->whereNotNull('blog_post_id')->with('blogPost');
                break;
            case 'video':
                $query->whereNotNull('video_id')->with('video');
                break;
            case 'news':
                $query->whereNotNull('product_news_id')->with('productNews');
                break;
            case 'product':
            default:
                $query->whereNotNull('product_id')->with(['product' => fn ($q) => $q->where('is_active', true)->with([
                    'category',
                    'variants' => fn ($vq) => $vq->where('is_active', true),
                    'flashSaleItems' => fn ($fq) => $fq->whereHas('flashSale', fn ($q) => $q->where('status', 'active')->where('start_at', '<=', now())->where('end_at', '>=', now()))->with('flashSale')
                ])]);
                break;
        }

        return $query->orderBy('id', 'desc')->get();
    }

    /**
     * Toggle item in wishlist
     */
    public function toggleWishlistItem(User $user, int $id, ?string $type = 'product'): string
    {
        $column = 'product_id';
        $model = Product::query()->where('id', $id);

        if ($type === 'blog') {
            $column = 'blog_post_id';
            $model = \App\Models\BlogPost::query()->where('id', $id);
        } elseif ($type === 'video') {
            $column = 'video_id';
            $model = \App\Models\Video::query()->where('id', $id);
        } elseif ($type === 'news') {
            $column = 'product_news_id';
            $model = \App\Models\ProductNews::query()->where('id', $id);
        } else {
            $model->where('is_active', true);
        }

        $item = $model->first();
        if (! $item) {
            throw ValidationException::withMessages([
                'id' => ['Mục không tồn tại hoặc đã bị ẩn.'],
            ]);
        }

        $exists = Wishlist::query()
            ->where('user_id', $user->id)
            ->where($column, $item->id)
            ->first();

        if ($exists) {
            $exists->delete();
            return 'removed';
        }

        Wishlist::query()->create([
            'user_id' => $user->id,
            $column => $item->id,
        ]);

        return 'added';
    }
}
